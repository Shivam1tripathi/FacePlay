# face-api.js model files

Add these files here when you want the sensor to work without the network fallback:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_expression_model-weights_manifest.json`
- `face_expression_model-shard1`

The React client tries `/models` first and then falls back to:

`https://justadudewhohacks.github.io/face-api.js/models`
