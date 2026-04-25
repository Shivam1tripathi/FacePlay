# FacePilot Deployment Plan

## Recommended Deployment

Deploy the frontend on **Vercel** first.

Why Vercel is best right now:

- The current game runs fully in the browser.
- Webcam access needs HTTPS, and Vercel gives HTTPS automatically.
- No database is required yet.
- The Express server is only a backend shell right now.

## Option 1: Deploy Frontend on Vercel

### 1. Push Code to GitHub

```bash
git add .
git commit -m "Prepare FacePilot for deployment"
git push origin main
```

### 2. Import Project in Vercel

1. Go to `https://vercel.com`
2. Click `Add New Project`
3. Import your GitHub repository
4. Use these settings:

```text
Framework Preset: Vite
Root Directory: leave empty / repository root
Build Command: npm run build
Output Directory: client/dist
Install Command: npm install
```

The included `vercel.json` already contains these settings.

Important: do not set Vercel Root Directory to `client`. This project uses npm workspaces from the repository root.

### 3. Deploy

Click `Deploy`.

After deployment, open the HTTPS URL and test:

- Start camera
- Smile to jump
- Open mouth to shoot
- Head left/right to move

## Option 2: Deploy Frontend on Netlify

### 1. Push Code to GitHub

```bash
git add .
git commit -m "Prepare FacePilot for deployment"
git push origin main
```

### 2. Import Project in Netlify

1. Go to `https://netlify.com`
2. Click `Add new site`
3. Import your GitHub repository
4. Use these settings:

```text
Base Directory: leave empty / repository root
Build Command: npm run build
Publish Directory: client/dist
```

The included `netlify.toml` already contains these settings.

## Option 3: Deploy Full Stack on Render

Use this later when backend features are needed, such as:

- saving scores
- leaderboard
- MongoDB
- authentication

### Render Settings

```text
Build Command: npm install && npm run build
Start Command: npm run start:prod
```

### Environment Variables

```text
NODE_ENV=production
PORT=10000
CLIENT_ORIGIN=https://your-frontend-domain.com
```

The Express server can now serve the React production build from `client/dist` when `NODE_ENV=production`.

## Important SEO Step Before Final Deployment

Replace this placeholder URL in SEO files:

```text
https://facepilot.example.com/
```

with your real deployed domain.

Files to update:

- `client/index.html`
- `client/public/robots.txt`
- `client/public/sitemap.xml`

Example:

```text
https://facepilot.vercel.app/
```

## Local Production Test

Run:

```bash
npm run build
npm run preview:static
```

Then open:

```text
http://127.0.0.1:4173
```

For webcam testing, deployed HTTPS is better than local production preview.

## Deployment Checklist

- `npm run lint --workspace client` passes
- `npm run build` passes
- site opens on HTTPS
- camera permission works
- face-api models load
- Start camera works
- Stop game turns camera off
- Fullscreen works
- SEO domain is updated from placeholder
