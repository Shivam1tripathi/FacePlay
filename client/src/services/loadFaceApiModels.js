import * as faceapi from 'face-api.js';

const MODEL_SOURCES = ['/models', 'https://justadudewhohacks.github.io/face-api.js/models'];

let loadPromise;

export function loadFaceApiModels() {
  if (!loadPromise) {
    loadPromise = loadFromFirstAvailableSource();
  }

  return loadPromise;
}

async function loadFromFirstAvailableSource() {
  for (const source of MODEL_SOURCES) {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(source),
        faceapi.nets.faceLandmark68Net.loadFromUri(source),
        faceapi.nets.faceExpressionNet.loadFromUri(source)
      ]);

      return source;
    } catch (error) {
      console.warn(`Face-api.js models were not available from ${source}`, error);
    }
  }

  throw new Error('Could not load face-api.js models. Add models to client/public/models or check the network.');
}
