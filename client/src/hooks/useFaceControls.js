import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { drawFaceOverlay } from '../services/faceOverlay.js';
import { loadFaceApiModels } from '../services/loadFaceApiModels.js';
import { getMouthOpenRatio, getSmileCurveScore } from '../utils/faceMetrics.js';

const DETECTION_INTERVAL_MS = 60;
const SHOOT_COOLDOWN_MS = 520;
const CALIBRATION_TARGET_FRAMES = 18;
const CALIBRATION_MIN_FACE_SCORE = 0.62;
const CALIBRATION_MAX_HEAD_OFFSET = 0.18;
const CALIBRATION_MAX_FACE_SCALE = 0.78;
const MOBILE_QUERY = '(max-width: 980px), (pointer: coarse)';

const DEFAULT_CONTROLS = {
  faceDetected: false,
  isSmiling: false,
  smileScore: 0,
  smileExpressionScore: 0,
  smileCurveScore: 0,
  didShoot: false,
  isShootCoolingDown: false,
  mouthOpenRatio: 0,
  mouthOpenThreshold: 0.24,
  headDirection: 'Center',
  headOffset: 0,
  faceScale: 0,
  calibrationReady: false,
  calibrationProgress: 0,
  baselineFaceScale: 0,
  trackingConfidence: 0
};

export function useFaceControls() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const isDetectingRef = useRef(false);
  const mouthArmedRef = useRef(true);
  const lastShootAtRef = useRef(0);
  const smoothedSmileRef = useRef(0);
  const smoothedHeadOffsetRef = useRef(0);
  const calibrationSamplesRef = useRef([]);
  const calibrationBaselineRef = useRef(null);
  const isMobileLike = useMemo(() => isMobileViewport(), []);
  const mobileCalibrationTargetFramesRef = useRef(
    isMobileLike
      ? 8
      : CALIBRATION_TARGET_FRAMES
  );
  const [status, setStatus] = useState('Ready to start');
  const [error, setError] = useState('');
  const [isBooting, setIsBooting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [modelSource, setModelSource] = useState('');
  const [controls, setControls] = useState(DEFAULT_CONTROLS);

  const calibrationMessage = useMemo(() => {
    if (!controls.faceDetected) return 'Keep your face centered';
    if (!controls.calibrationReady) {
      return `Calibrating... ${controls.calibrationProgress}/${mobileCalibrationTargetFramesRef.current}`;
    }
    if (controls.baselineFaceScale > 0 && controls.faceScale > controls.baselineFaceScale * 1.22) {
      return 'Move slightly back';
    }
    if (controls.headDirection === 'Left') return 'Head left detected';
    if (controls.headDirection === 'Right') return 'Head right detected';
    return 'Face centered';
  }, [
    controls.baselineFaceScale,
    controls.calibrationProgress,
    controls.calibrationReady,
    controls.faceDetected,
    controls.faceScale,
    controls.headDirection
  ]);

  const recalibrate = useCallback(() => {
    smoothedHeadOffsetRef.current = 0;
    smoothedSmileRef.current = 0;
    calibrationSamplesRef.current = [];
    calibrationBaselineRef.current = null;
    setStatus('Recentered. Hold steady for a moment.');
  }, []);

  const stop = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
    isDetectingRef.current = false;
    mouthArmedRef.current = true;
    lastShootAtRef.current = 0;
    smoothedSmileRef.current = 0;
    smoothedHeadOffsetRef.current = 0;
    calibrationSamplesRef.current = [];
    calibrationBaselineRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
    }

    setControls(DEFAULT_CONTROLS);
    setIsRunning(false);
    setIsBooting(false);
    setError('');
    setStatus('Stopped. Camera is off.');
  }, []);

  const detect = useCallback(async () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;

    if (isDetectingRef.current) return;
    if (!video || !overlay || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;
    isDetectingRef.current = true;

    try {
      const result = await detectFace(video);

      drawFaceOverlay({ result, video, overlay });

      if (!result) {
        smoothedHeadOffsetRef.current = 0;
        setControls(() => ({
          ...DEFAULT_CONTROLS,
          isShootCoolingDown: performance.now() - lastShootAtRef.current < SHOOT_COOLDOWN_MS
        }));
        return;
      }

      const smileExpressionScore = result.expressions.happy ?? 0;
      const smileCurveScore = getSmileCurveScore(result.landmarks);
      const smileComposite = getSmileCompositeScore(smileExpressionScore, smileCurveScore);
      const mouthOpenRatio = getMouthOpenRatio(result.landmarks);
      const rawHeadOffset = getRawHeadOffset(result);
      const faceScale = getFaceScale(result, video);
      const trackingConfidence = result.detection.score ?? 0;
      const baseline = calibrationBaselineRef.current;

      if (!baseline) {
        const calibrationFrame = isStableCalibrationFrame({
          trackingConfidence,
          rawHeadOffset,
          faceScale
        });

        if (calibrationFrame) {
          calibrationSamplesRef.current.push({
            smileComposite,
            mouthOpenRatio,
            rawHeadOffset,
            faceScale
          });

          if (calibrationSamplesRef.current.length >= mobileCalibrationTargetFramesRef.current) {
            calibrationBaselineRef.current = buildCalibrationBaseline(calibrationSamplesRef.current);
            setStatus('Tracking face controls');
          } else {
            setStatus(`Calibrating face... keep centered ${calibrationSamplesRef.current.length}/${mobileCalibrationTargetFramesRef.current}`);
          }
        } else {
          setStatus('Keep your face centered');
        }

        const calibrationReady = Boolean(calibrationBaselineRef.current);
        setControls({
          faceDetected: true,
          isSmiling: false,
          smileScore: 0,
          smileExpressionScore,
          smileCurveScore,
          didShoot: false,
          isShootCoolingDown: performance.now() - lastShootAtRef.current < SHOOT_COOLDOWN_MS,
          mouthOpenRatio,
          mouthOpenThreshold: 0.24,
          headDirection: 'Center',
          headOffset: 0,
          faceScale,
          calibrationReady,
          calibrationProgress: calibrationSamplesRef.current.length,
          baselineFaceScale: calibrationBaselineRef.current?.faceScale ?? 0,
          trackingConfidence
        });
        return;
      }

      const smileScore = getSmileScore(smileComposite, baseline.smileComposite, smoothedSmileRef);
      const mouthOpenThreshold = clamp(baseline.mouthOpenRatio + 0.08, 0.2, 0.36);
      const mouthRearmThreshold = Math.max(0.16, mouthOpenThreshold - 0.05);
      const shootState = getShootState(mouthOpenRatio, mouthOpenThreshold, mouthRearmThreshold, mouthArmedRef, lastShootAtRef);
      const headState = getHeadState(rawHeadOffset, baseline.headOffset, smoothedHeadOffsetRef);

      setControls({
        faceDetected: true,
        isSmiling: smileScore > 0.38,
        smileScore,
        smileExpressionScore,
        smileCurveScore,
        didShoot: shootState.didShoot,
        isShootCoolingDown: shootState.isCoolingDown,
        mouthOpenRatio,
        mouthOpenThreshold,
        headDirection: headState.direction,
        headOffset: headState.offset,
        faceScale,
        calibrationReady: true,
        calibrationProgress: mobileCalibrationTargetFramesRef.current,
        baselineFaceScale: baseline.faceScale,
        trackingConfidence
      });
    } finally {
      isDetectingRef.current = false;
    }
  }, []);

  const start = useCallback(async () => {
    setIsBooting(true);
    setError('');
    setStatus('Loading face-api.js models');

    try {
      const source = await loadFaceApiModels();
      setModelSource(source);

      setStatus('Waiting for camera permission');
      const mobileLike = isMobileViewport();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: mobileLike ? 640 : 960 },
          height: { ideal: mobileLike ? 480 : 540 },
          aspectRatio: mobileLike ? 4 / 3 : 16 / 9,
          frameRate: { ideal: mobileLike ? 24 : 30, max: 30 }
        },
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setIsRunning(true);
      setStatus('Tracking face controls');
      window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(detect, getDetectionIntervalMs());
    } catch (startError) {
      console.error(startError);
      setError(startError.message || 'Unable to start the face sensor.');
      setStatus('Sensor unavailable');
    } finally {
      setIsBooting(false);
    }
  }, [detect]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    videoRef,
    overlayRef,
    start,
    stop,
    recalibrate,
    status,
    error,
    isBooting,
    isRunning,
    modelSource,
    controls,
    calibrationMessage
  };
}

async function detectFace(video) {
  const isMobileLike = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(MOBILE_QUERY).matches;

  const primaryOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: isMobileLike ? 256 : 320,
    scoreThreshold: isMobileLike ? 0.2 : 0.32
  });
  const fallbackOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: isMobileLike ? 320 : 416,
    scoreThreshold: isMobileLike ? 0.15 : 0.22
  });

  const primaryResult = await faceapi.detectSingleFace(video, primaryOptions).withFaceLandmarks().withFaceExpressions();
  if (primaryResult) return primaryResult;

  return faceapi.detectSingleFace(video, fallbackOptions).withFaceLandmarks().withFaceExpressions();
}

function getSmileCompositeScore(expressionScore, curveScore) {
  return Math.max(expressionScore * 1.08, curveScore, expressionScore * 0.5 + curveScore * 0.62);
}

function getSmileScore(smileComposite, baselineSmileComposite, smoothedSmileRef) {
  const rawScore = clamp((smileComposite - baselineSmileComposite) / 0.26, 0, 1);
  const riseFactor = rawScore > smoothedSmileRef.current ? 0.72 : 0.24;
  const smoothed = smoothedSmileRef.current * (1 - riseFactor) + rawScore * riseFactor;
  smoothedSmileRef.current = smoothed;
  return smoothed;
}

function getShootState(mouthOpenRatio, mouthOpenThreshold, mouthRearmThreshold, mouthArmedRef, lastShootAtRef) {
  const now = performance.now();
  const mouthOpen = mouthOpenRatio > mouthOpenThreshold;
  const isCoolingDown = now - lastShootAtRef.current < SHOOT_COOLDOWN_MS;

  if (mouthOpenRatio < mouthRearmThreshold) {
    mouthArmedRef.current = true;
    return { didShoot: false, isCoolingDown };
  }

  if (!mouthOpen || !mouthArmedRef.current || isCoolingDown) {
    return { didShoot: false, isCoolingDown: isCoolingDown || mouthOpen };
  }

  mouthArmedRef.current = false;
  lastShootAtRef.current = now;
  return { didShoot: true, isCoolingDown: true };
}

function getHeadState(rawHeadOffset, baselineHeadOffset, smoothedHeadOffsetRef) {
  const relativeOffset = rawHeadOffset - baselineHeadOffset;
  const mobileLike = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(MOBILE_QUERY).matches;
  const smoothing = mobileLike ? 0.82 : 0.72;
  const offset = smoothedHeadOffsetRef.current * smoothing + relativeOffset * (1 - smoothing);
  smoothedHeadOffsetRef.current = offset;

  const deadZone = mobileLike ? 0.08 : 0.065;

  if (offset < -deadZone) {
    return { direction: 'Right', offset };
  }

  if (offset > deadZone) {
    return { direction: 'Left', offset };
  }

  return { direction: 'Center', offset };
}

function getRawHeadOffset(result) {
  const box = result.detection.box;
  const nose = result.landmarks.getNose();
  const noseBridge = nose[3] || nose[Math.floor(nose.length / 2)];
  const faceCenterX = box.x + box.width / 2;
  return (noseBridge.x - faceCenterX) / box.width;
}

function isStableCalibrationFrame({ trackingConfidence, rawHeadOffset, faceScale }) {
  return (
    trackingConfidence >= getCalibrationMinFaceScore() &&
    Math.abs(rawHeadOffset) <= getCalibrationMaxHeadOffset() &&
    faceScale <= getCalibrationMaxFaceScale()
  );
}

function getCalibrationMinFaceScore() {
  return isMobileViewport() ? 0.48 : CALIBRATION_MIN_FACE_SCORE;
}

function getCalibrationMaxHeadOffset() {
  return isMobileViewport() ? 0.3 : CALIBRATION_MAX_HEAD_OFFSET;
}

function getCalibrationMaxFaceScale() {
  return isMobileViewport() ? 0.88 : CALIBRATION_MAX_FACE_SCALE;
}

function getDetectionIntervalMs() {
  return isMobileViewport() ? 90 : DETECTION_INTERVAL_MS;
}

function isMobileViewport() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(MOBILE_QUERY).matches;
}

function buildCalibrationBaseline(samples) {
  const totals = samples.reduce(
    (accumulator, sample) => {
      accumulator.smileComposite += sample.smileComposite;
      accumulator.mouthOpenRatio += sample.mouthOpenRatio;
      accumulator.headOffset += sample.rawHeadOffset;
      accumulator.faceScale += sample.faceScale;
      return accumulator;
    },
    {
      smileComposite: 0,
      mouthOpenRatio: 0,
      headOffset: 0,
      faceScale: 0
    }
  );

  const count = Math.max(samples.length, 1);
  return {
    smileComposite: totals.smileComposite / count,
    mouthOpenRatio: totals.mouthOpenRatio / count,
    headOffset: totals.headOffset / count,
    faceScale: totals.faceScale / count
  };
}

function getFaceScale(result, video) {
  const box = result.detection.box;
  const videoWidth = video.videoWidth || box.width || 1;
  const videoHeight = video.videoHeight || box.height || 1;
  return Math.max(box.width / videoWidth, box.height / videoHeight);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
