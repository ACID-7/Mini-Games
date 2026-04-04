# Party Fusion

Party Fusion is a lightweight browser-based multiplayer party game app that combines 10 game modes into a single room. Players join with a room code, the host picks a mode, and everyone plays from one shared web app.

## Included modes
1. Last Message
2. Rule Breaker
3. Fake Internet
4. Chain Reaction
5. Secret Objective
6. Speed Lies
7. Voice Swap
8. One Word Story War
9. The Suspicious One
10. Memory Trap

## Tech
- Static frontend in `public/`
- Shared game API for local Node and Netlify Functions
- Firebase Realtime Database room storage
- Polling-based state sync

## Run locally
```bash
npm install
npm start
```

Then open `http://localhost:3000` in multiple browser tabs/devices.

## Use Firebase Realtime Database
- Both `server.js` and `netlify/functions/api.mjs` use Realtime Database for room storage.
- Room creation, updates, and deletion all go through the same store interface.
- When the last player leaves a room, the room entry is deleted immediately from Realtime Database.
- If no env var is supplied, the app defaults to project `minigames-ee135`.
- Configure either `FIREBASE_DATABASE_URL` directly or `FIREBASE_PROJECT_ID` so the server can resolve `https://<project-id>-default-rtdb.firebaseio.com`.
- If your rules are not public, set `FIREBASE_DATABASE_SECRET` or `FIREBASE_AUTH_TOKEN` for authenticated REST requests.
- Optional: change the storage path with `FIREBASE_ROOM_NAMESPACE` (defaults to `partyFusionRooms`).
- Your Realtime Database rules must allow the server process to read and write under the configured namespace.

Firebase is only the data store here. The app still needs a trusted backend entrypoint to protect hidden game state, validate turns, score rounds, and keep database credentials off the client.

## Deploy to Netlify
- Publish directory: `public`
- Functions directory: `netlify/functions`
- The repo includes `netlify.toml`, so `/api/*` is rewritten to the Netlify function automatically.
- Room state in production is stored in Realtime Database, so rooms remain available across requests.

## Notes
- This is an MVP codebase designed to be easy to extend.
- Voice Swap uses browser audio recording when microphone access is granted.
- Sync uses lightweight polling for simplicity.

## Project structure
- `server.js` - local dev server for running the app with plain Node outside Netlify
- `lib/game-engine.mjs` - shared game rules and API handling
- `lib/firebase-store.mjs` - Firebase Realtime Database room storage
- `netlify/functions/api.mjs` - Netlify serverless API entrypoint
- `public/index.html` - client UI
- `public/styles.css` - styling
- `public/app.js` - client logic, polling, rendering, player actions

## Suggested next improvements
- Persist rooms and match history
- Add reconnect/session recovery
- Add timers and automatic phase progression
- Break each mode into its own module
- Move from polling to WebSockets if desired
