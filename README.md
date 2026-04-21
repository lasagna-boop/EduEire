# EduEire

EduEire is a React + Firebase discussion platform built for Irish higher education communities.  
The app includes institution-focused spaces, thread discussions, moderation tools, user profiles, and map-based discovery.

## What this repository contains

- Frontend SPA in `src/` (React, TypeScript, Vite)
- Firebase Functions in `functions/` (TypeScript, Node.js 20)
- Firebase Hosting + Firestore + Storage configuration in project root
- Unit/integration tests (Vitest) and end-to-end tests (Playwright)

## Tech stack

- React 19
- TypeScript
- Vite 7
- Firebase (Auth, Firestore, Storage, Hosting, Functions)
- Vitest + Testing Library
- Playwright

## Prerequisites

- Node.js 20+
- npm
- Firebase project with web app credentials
- (Optional) Firebase CLI for deploy and emulator workflows

## Quick start

1) Install dependencies:

```bash
npm install
```

2) Create a local env file:

```bash
cp .env.example .env.local
```

3) Fill in `.env.local` with your Firebase web config values.

4) Run the frontend:

```bash
npm run dev
```

5) Open the local URL printed by Vite (usually `http://localhost:5173`).

## Environment variables

The app reads Firebase config from Vite environment variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Use `.env.local` for local development, and keep secrets out of git.

## Available scripts

### Frontend (root `package.json`)

- `npm run dev` - start Vite dev server
- `npm run build` - type-check and build production bundle
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint
- `npm run test` - run Vitest in watch mode
- `npm run test:run` - run all Vitest tests once
- `npm run test:coverage` - run tests with coverage
- `npm run test:e2e` - run Playwright end-to-end tests
- `npm run test:e2e:ui` - run Playwright in UI mode
- `npm run deploy` - build and deploy via Firebase CLI

### Cloud Functions (`functions/package.json`)

```bash
cd functions
npm install
npm run build
```

Additional functions scripts:

- `npm run serve` - build + start functions emulator
- `npm run deploy` - deploy functions only

## Build and deploy

Frontend hosting is configured in `firebase.json` with:

- hosting public directory: `dist`
- SPA rewrite to `/index.html`

Standard deploy flow:

```bash
npm run build
firebase deploy
```

## Project structure (high level)

- `src/` - frontend app
- `public/` - static assets copied to build output
- `dist/` - generated production build output (created by `vite build`)
- `functions/` - Firebase Cloud Functions source
- `tests/` - unit, integration, and e2e tests
- `firestore.rules`, `storage.rules` - security rules

## Notes on assets and `dist`

`dist/` is generated output, so `dist/assets` is expected after a build.  
Your source static files should stay in `public/` (plus imported assets from source code).

## Troubleshooting

- If the app hangs on loading, verify Firebase env values and project permissions.
- If Firestore reads fail, check `firestore.rules`.
- If deploy fails, run `npm run build` first and confirm Firebase CLI auth/project selection.

## License

This project is part of an academic final year project.  
Add your preferred license details here if you plan public distribution.
