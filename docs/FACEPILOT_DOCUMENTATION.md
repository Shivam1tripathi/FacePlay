# FacePilot Documentation

## 1. Project Overview

FacePilot is a browser-based runner/shooter game controlled by the player's face.

The game uses the webcam to detect:

- Smile: player jumps
- Open mouth: player shoots
- Head left/right: player moves left/right

The game is built with a MERN-style folder structure:

- React + Vite for the frontend
- Express for the backend setup
- HTML Canvas for the game rendering
- face-api.js for face detection and facial landmarks
- Browser webcam API for camera access

## 2. Main Technologies Used

### React

React is used to build the user interface.

Important files:

- `client/src/App.jsx`
- `client/src/components/FaceSensorPanel.jsx`
- `client/src/components/GamePreviewCanvas.jsx`

React helps us divide the app into reusable parts:

- Camera panel
- Game canvas
- Control status cards
- Fullscreen and stop buttons

### HTML Canvas

Canvas is used to draw the game manually.

File:

- `client/src/components/GamePreviewCanvas.jsx`

Canvas draws:

- Player character
- Obstacles
- Enemies
- Bullets
- Score
- Health bar
- Lives
- Game over screen
- Floating `+points` text

### face-api.js

face-api.js is used for face tracking in the browser.

File:

- `client/src/hooks/useFaceControls.js`

It detects:

- Face box
- 68 face landmarks
- Facial expressions

We use these results to calculate player controls.

### Webcam API

The browser webcam API gives access to the camera.

Code used:

```js
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'user',
    width: { ideal: 960 },
    height: { ideal: 540 }
  },
  audio: false
});
```

This asks the user for camera permission. If permission is accepted, the live camera stream is shown in the video element.

## 3. Folder Structure

```text
FacePlay/
  client/
    public/
      models/
    src/
      components/
        FaceSensorPanel.jsx
        GamePreviewCanvas.jsx
        MetricCard.jsx
      hooks/
        useFaceControls.js
      services/
        faceOverlay.js
        loadFaceApiModels.js
      utils/
        faceMetrics.js
      App.jsx
      main.jsx
  server/
    src/
      app.js
      server.js
  docs/
    FACEPILOT_DOCUMENTATION.md
```

## 4. Where Data Comes From

The data comes from the user's webcam.

Flow:

1. User clicks `Start camera`.
2. Browser asks for camera permission.
3. Camera video stream starts.
4. face-api.js reads video frames from the webcam.
5. face-api.js returns face data.
6. We convert face data into game controls.
7. Canvas game uses those controls.

The camera data stays inside the browser for this milestone. We are not uploading webcam video to the backend.

## 5. How Face Tracking Works

Face tracking is handled inside:

```text
client/src/hooks/useFaceControls.js
```

The detection loop runs repeatedly using an interval:

```js
const DETECTION_INTERVAL_MS = 60;
```

Every 60ms, the app:

1. Takes the current webcam frame.
2. Detects a face using Tiny Face Detector.
3. Detects 68 face landmarks.
4. Detects expressions.
5. Calculates smile, mouth open, and head direction.

The main face-api.js call looks like this:

```js
const result = await faceapi
  .detectSingleFace(video, options)
  .withFaceLandmarks()
  .withFaceExpressions();
```

## 6. Models Used

The app loads face-api.js models from:

```text
client/public/models
```

If local models are not available, it falls back to the public face-api.js model host.

File:

```text
client/src/services/loadFaceApiModels.js
```

Models used:

- Tiny face detector model
- 68 face landmark model
- Face expression model

## 7. How Each Control Works

### Smile = Jump

Smile detection uses two things:

1. face-api.js `happy` expression score
2. Mouth geometry from landmarks

File:

```text
client/src/utils/faceMetrics.js
```

We calculate mouth shape using:

- Mouth corner lift
- Mouth width compared to face width

Then we combine that with the expression score.

If the smile score is high enough:

```js
isSmiling: smileScore > thresholds.smile
```

The game uses `isSmiling` to make the player jump.

### Open Mouth = Shoot

Open mouth detection uses mouth landmarks.

We calculate:

- Distance between upper lip and lower lip
- Mouth width
- Ratio between mouth opening and mouth width

If the mouth opens more than the threshold, shooting is triggered:

```js
mouthOpenRatio > thresholds.mouthOpen
```

We also use a cooldown so one mouth-open action does not shoot too many bullets at once.

### Head Left/Right = Move

Head movement uses:

- Face box center
- Nose landmark position

If the nose shifts compared to the face center, we detect head direction.

The result becomes:

```js
headDirection: 'Left' | 'Right' | 'Center'
```

The game uses this value to move the player horizontally.

## 8. How the Game Uses Face Data

The face tracking hook returns a `controls` object.

Example:

```js
{
  isSmiling: true,
  didShoot: false,
  mouthOpenRatio: 0.12,
  headDirection: 'Left'
}
```

This object is passed into:

```text
client/src/components/GamePreviewCanvas.jsx
```

The game loop reads this data:

- `isSmiling` starts jump
- `didShoot` creates bullet
- `headDirection` moves player left/right

## 9. Game Mechanics

The game currently includes:

- Player character
- Jump physics
- Shooting bullets
- Obstacles and enemies
- Collision detection
- Health bar
- Lives
- Score
- Floating score popup
- Difficulty increase over time
- Game over and restart

Obstacle types:

- Barrier
- Drone
- Spike
- Laser

Destroying obstacles gives points:

- Barrier: `+40`
- Drone: `+50`
- Spike: `+60`
- Laser: `+70`

## 10. Health and Lives

The player has:

- 3 lives
- 100% health per life

When the player hits an obstacle:

- Health decreases by 25%
- Health bar decreases smoothly

When health becomes 0:

- One life is removed
- Health resets to 100% if lives remain

When all lives are finished:

- Game over screen appears

## 11. Stop Game and Camera Off

The `Stop game` button:

- Stops camera tracks
- Stops face detection
- Clears face overlay
- Resets controls
- Resets game

This is handled in:

```text
client/src/hooks/useFaceControls.js
```

The important part is:

```js
streamRef.current?.getTracks().forEach((track) => track.stop());
```

This actually turns off the webcam.

## 12. Problems We Faced and How We Solved Them

### Problem: Blink detection was not accurate

Blink detection using eye landmarks was unreliable for webcam quality and lighting.

Solution:

We replaced blink shooting with open mouth shooting because mouth opening is easier to detect clearly.

### Problem: Smile was not detected properly

Only using the `happy` expression score was not reliable.

Solution:

We added landmark-based smile detection using mouth shape and combined it with the expression score.

### Problem: Face overlay text was mirrored

The webcam preview is mirrored for a natural selfie view. The face-api overlay text also became mirrored.

Solution:

We created our own overlay drawing in:

```text
client/src/services/faceOverlay.js
```

Now the face box matches the mirrored video, but text is readable.

### Problem: Game was too fast

Early testing was hard because speed was high from the start.

Solution:

The game now starts slow and speed increases over time.

### Problem: Camera needed to turn off

Stopping the UI was not enough. The actual camera stream needed to stop.

Solution:

We stop all media tracks using `track.stop()`.

## 13. Current Control Summary

```text
Smile       -> Jump
Open mouth  -> Shoot
Head left   -> Move left
Head right  -> Move right
Stop game   -> Turn camera off and reset game
```

## 14. Next Improvements

Possible next steps:

- Add local face-api model files permanently
- Add sound effects
- Add MongoDB score saving
- Add leaderboard
- Improve player and enemy art
- Add mobile responsive tuning
- Add calibration screen before game starts
- Add keyboard fallback controls for testing
