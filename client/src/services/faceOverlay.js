export function drawFaceOverlay({ result, video, overlay }) {
  resizeOverlay(video, overlay);
  const context = overlay.getContext('2d');
  context.clearRect(0, 0, overlay.width, overlay.height);

  if (!result) return;

  const scaleX = overlay.width / video.videoWidth;
  const scaleY = overlay.height / video.videoHeight;
  const box = mirrorBox(result.detection.box, overlay.width, scaleX, scaleY);
  const landmarks = result.landmarks.positions.map((point) => ({
    x: overlay.width - point.x * scaleX,
    y: point.y * scaleY
  }));

  context.strokeStyle = '#6ae6ff';
  context.lineWidth = 3;
  context.strokeRect(box.x, box.y, box.width, box.height);

  context.fillStyle = '#42d392';
  for (const point of landmarks) {
    context.beginPath();
    context.arc(point.x, point.y, 2, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = 'rgba(8, 12, 18, 0.78)';
  context.fillRect(box.x, Math.max(box.y - 28, 0), 142, 24);
  context.fillStyle = '#f4f7fb';
  context.font = '700 13px Inter, sans-serif';
  context.fillText(`Face ${Math.round(result.detection.score * 100)}%`, box.x + 8, Math.max(box.y - 10, 18));
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
