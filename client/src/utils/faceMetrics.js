export function getMouthOpenRatio(landmarks) {
  const mouth = landmarks.getMouth();
  const topLip = midpoint(mouth[13], mouth[14]);
  const bottomLip = midpoint(mouth[19], mouth[18]);
  const mouthWidth = distance(mouth[0], mouth[6]) || 1;
  return distance(topLip, bottomLip) / mouthWidth;
}

export function getSmileCurveScore(landmarks) {
  const mouth = landmarks.getMouth();
  const jaw = landmarks.getJawOutline();
  const leftCorner = mouth[0];
  const rightCorner = mouth[6];
  const upperLip = midpoint(mouth[13], mouth[14]);
  const lowerLip = midpoint(mouth[19], mouth[18]);
  const mouthCenterY = (upperLip.y + lowerLip.y) / 2;
  const mouthWidth = distance(leftCorner, rightCorner) || 1;
  const faceWidth = distance(jaw[1], jaw[15]) || mouthWidth;
  const cornerLift = ((mouthCenterY - leftCorner.y) + (mouthCenterY - rightCorner.y)) / (2 * mouthWidth);
  const widthRatio = mouthWidth / faceWidth;
  const cornerScore = clamp(cornerLift * 5.2, 0, 0.72);
  const widthScore = clamp((widthRatio - 0.28) * 3.4, 0, 0.7);

  return clamp(Math.max(cornerScore, widthScore, cornerScore * 0.62 + widthScore * 0.58), 0, 1);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
