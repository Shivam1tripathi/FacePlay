export function drawFaceOverlay({ result, video, overlay }) {
  resizeOverlay(video, overlay);
  const context = overlay.getContext('2d');
  context.clearRect(0, 0, overlay.width, overlay.height);

  if (!result) return;

  const scaleX = overlay.width / video.videoWidth;
  const scaleY = overlay.height / video.videoHeight;
  const box = mirrorBox(result.detection.box, overlay.width, scaleX, scaleY);
  const trace = getTraceData(result.landmarks, overlay.width, scaleX, scaleY);
  const score = Math.round(result.detection.score * 100);
  const labelWidth = Math.min(154, Math.max(120, box.width * 0.84));
  const labelX = clamp(box.x, 8, overlay.width - labelWidth - 8);
  const labelY = Math.max(box.y - 34, 8);

  context.save();
  context.fillStyle = 'rgba(66, 211, 146, 0.06)';
  context.strokeStyle = 'rgba(106, 230, 255, 0.28)';
  context.lineWidth = 2;
  roundRect(context, box.x, box.y, box.width, box.height, 18);
  context.fill();
  context.stroke();

  drawFaceTrace(context, trace);

  context.fillStyle = 'rgba(8, 12, 18, 0.76)';
  roundRect(context, labelX, labelY, labelWidth, 24, 999);
  context.fill();

  context.fillStyle = '#f4f7fb';
  context.font = '700 12px Inter, sans-serif';
  context.fillText(`Face ${score}%`, labelX + 12, labelY + 16);
  context.fillStyle = 'rgba(66, 211, 146, 0.9)';
  context.beginPath();
  context.arc(labelX + labelWidth - 14, labelY + 12, 3, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function resizeOverlay(video, overlay) {
  const rect = video.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), 1);
  const height = Math.max(Math.round(rect.height), 1);

  if (overlay.width !== width || overlay.height !== height) {
    overlay.width = width;
    overlay.height = height;
  }
}

function mirrorBox(box, overlayWidth, scaleX, scaleY) {
  const width = box.width * scaleX;

  return {
    x: overlayWidth - box.x * scaleX - width,
    y: box.y * scaleY,
    width,
    height: box.height * scaleY
  };
}

function getTraceData(landmarks, overlayWidth, scaleX, scaleY) {
  const mapPoint = (point) => ({
    x: overlayWidth - point.x * scaleX,
    y: point.y * scaleY
  });

  const points = landmarks.positions.map(mapPoint);

  return {
    points,
    jaw: landmarks.getJawOutline().map(mapPoint),
    leftBrow: landmarks.getLeftEyeBrow().map(mapPoint),
    rightBrow: landmarks.getRightEyeBrow().map(mapPoint),
    nose: landmarks.getNose().map(mapPoint),
    leftEye: landmarks.getLeftEye().map(mapPoint),
    rightEye: landmarks.getRightEye().map(mapPoint),
    mouth: landmarks.getMouth().map(mapPoint)
  };
}

function drawFaceTrace(context, trace) {
  context.save();
  context.shadowColor = 'rgba(66, 211, 146, 0.85)';
  context.shadowBlur = 8;

  for (const feature of [trace.jaw, trace.leftBrow, trace.rightBrow, trace.nose, trace.leftEye, trace.rightEye, trace.mouth]) {
    drawPolyline(context, feature, 'rgba(66, 211, 146, 0.42)', 1.4);
    drawPolyline(context, feature, 'rgba(106, 230, 255, 0.8)', 0.8);
  }

  context.shadowBlur = 0;
  for (const point of trace.points) {
    context.fillStyle = 'rgba(106, 230, 255, 0.92)';
    context.beginPath();
    context.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = 'rgba(66, 211, 146, 0.9)';
  for (const keyPoint of pickKeyPoints(trace.points)) {
    context.beginPath();
    context.arc(keyPoint.x, keyPoint.y, 2.6, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawPolyline(context, points, strokeStyle, lineWidth) {
  if (!points || points.length < 2) return;

  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.stroke();
}

function pickKeyPoints(points) {
  const indexes = [8, 27, 30, 36, 45, 48, 54];
  return indexes.map((index) => points[index]).filter(Boolean);
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
