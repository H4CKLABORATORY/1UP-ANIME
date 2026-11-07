#!/usr/bin/env bash
# 1UP Anime — run the native-account emulator tests.
# Starts the Firebase Auth + Firestore emulators (demo project, no real data),
# runs tests/auth-emulator.test.mjs, then stops the emulators.
# Requires: firebase-tools (npm install -g firebase-tools@14, or a local install
# at /data/home/.local/fb-tools) and Java.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=demo-1up-anime
FIREBASE_BIN="$(command -v firebase || echo /data/home/.local/fb-tools/node_modules/.bin/firebase)"
"$FIREBASE_BIN" emulators:start --only auth,firestore --project "$PROJECT" > /tmp/oneup-emulators.log 2>&1 &
EMULATOR_PID=$!
trap 'kill $EMULATOR_PID 2>/dev/null || true' EXIT
for i in $(seq 1 120); do
  AUTH_OK=0; FS_OK=0
  curl -fsS -o /dev/null --max-time 2 http://127.0.0.1:9099/ 2>/dev/null && AUTH_OK=1
  curl -fsS -o /dev/null --max-time 2 http://127.0.0.1:8080/ 2>/dev/null && FS_OK=1
  if [ "$AUTH_OK" = 1 ] && [ "$FS_OK" = 1 ]; then break; fi
  sleep 1
done
node --test tests/auth-emulator.test.mjs
