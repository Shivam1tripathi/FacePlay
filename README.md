# FacePilot

FacePilot is a MERN-style browser game project where the player will control a 2D runner/shooter using face-api.js and a webcam.

## Current milestone

This version implements the face motion sensor test:

- Smile maps to jump.
- Open mouth maps to shoot.
- Head left/right maps to movement.
- Webcam preview, landmark overlay, calibration status, and live control readouts are available in the React client.

## Project structure

```text
FacePlay/
  client/              React + Vite frontend
  server/              Express backend shell
  package.json         Workspace scripts
```

## Run locally

```bash
npm install
npm run dev
```

Open the Vite client URL, usually `http://localhost:5173`.

## face-api.js models

The client first looks for model files in `client/public/models`. If they are not present, it falls back to the public face-api.js model host so the sensor can be tested quickly.
