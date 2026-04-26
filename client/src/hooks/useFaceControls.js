import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { drawFaceOverlay } from '../services/faceOverlay.js';
import { loadFaceApiModels } from '../services/loadFaceApiModels.js';
import { getMouthOpenRatio, getSmileCurveScore } from '../utils/faceMetrics.js';

const DETECTION_INTERVAL_MS = 60;
const SHOOT_COOLDOWN_MS = 520;

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
  trackingConfidence: 0
};

const thresholds = {
  smile: 0.36,
  mouthOpen: 0.24,
  mouthRearm: 0.18,
  headDeadZone: 0.075
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

  const [status, setStatus] = useState('Ready to start');
  const [error, setError] = useState('');
  const [isBooting, setIsBooting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [modelSource, setModelSource] = useState('');
  const [controls, setControls] = useState(DEFAULT_CONTROLS);

  const calibrationMessage = useMemo(() => {
    if (!controls.faceDetected) return 'Keep your face centered';
    if (controls.faceScale > 0.72) return 'Move slightly back';
    if (controls.headDirection === 'Left') return 'Head left detected';
    if (controls.headDirection === 'Right') return 'Head right detected';
    return 'Face centered';
  }, [controls.faceDetected, controls.faceScale, controls.headDirection]);

  const recalibrate = useCallback(() => {
    smoothedHeadOffsetRef.current = 0;
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
      const smileScore = getSmileScore(smileExpressionScore, smileCurveScore, smoothedSmileRef);
      const mouthOpenRatio = getMouthOpenRatio(result.landmarks);
      const shootState = getShootState(mouthOpenRatio, mouthArmedRef, lastShootAtRef);
      const headState = getHeadState(result, smoothedHeadOffsetRef);
      const faceScale = getFaceScale(result, video);

      setControls({
        faceDetected: true,
        isSmiling: smileScore > thresholds.smile,
        smileScore,
        smileExpressionScore,
        smileCurveScore,
        didShoot: shootState.didShoot,
        isShootCoolingDown: shootState.isCoolingDown,
        mouthOpenRatio,
        mouthOpenThreshold: thresholds.mouthOpen,
        headDirection: headState.direction,
        headOffset: headState.offset,
        faceScale,
        trackingConfidence: result.detection.score
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 540 }
        },
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setIsRunning(true);
      setStatus('Tracking face controls');
      window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(detect, DETECTION_INTERVAL_MS);
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
  const primaryOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.32
  });
  const fallbackOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.22
  });

  const primaryResult = await faceapi.detectSingleFace(video, primaryOptions).withFaceLandmarks().withFaceExpressions();
  if (primaryResult) return primaryResult;

  return faceapi.detectSingleFace(video, fallbackOptions).withFaceLandmarks().withFaceExpressions();
}

function getSmileScore(expressionScore, curveScore, smoothedSmileRef) {
  const rawScore = Math.max(expressionScore * 1.08, curveScore, expressionScore * 0.5 + curveScore * 0.62);
  const riseFactor = rawScore > smoothedSmileRef.current ? 0.72 : 0.24;
  const smoothed = smoothedSmileRef.current * (1 - riseFactor) + rawScore * riseFactor;
  smoothedSmileRef.current = smoothed;
  return smoothed;
}

function getShootState(mouthOpenRatio, mouthArmedRef, lastShootAtRef) {
  const now = performance.now();
  const mouthOpen = mouthOpenRatio > thresholds.mouthOpen;
  const isCoolingDown = now - lastShootAtRef.current < SHOOT_COOLDOWN_MS;

  if (mouthOpenRatio < thresholds.mouthRearm) {
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

function getHeadState(result, smoothedHeadOffsetRef) {
  const box = result.detection.box;
  const nose = result.landmarks.getNose();
  const noseBridge = nose[3] || nose[Math.floor(nose.length / 2)];
  const faceCenterX = box.x + box.width / 2;
  const rawOffset = (noseBridge.x - faceCenterX) / box.width;
  const offset = smoothedHeadOffsetRef.current * 0.72 + rawOffset * 0.28;
  smoothedHeadOffsetRef.current = offset;

  if (offset < -thresholds.headDeadZone) {
    return { direction: 'Right', offset };
  }

  if (offset > thresholds.headDeadZone) {
    return { direction: 'Left', offset };
  }

  return { direction: 'Center', offset };
}

function getFaceScale(result, video) {
  const box = result.detection.box;
  const videoWidth = video.videoWidth || box.width || 1;
  const videoHeight = video.videoHeight || box.height || 1;
  return Math.max(box.width / videoWidth, box.height / videoHeight);
}
