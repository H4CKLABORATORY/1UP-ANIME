#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
UPSTREAM="render/anime1v-source/upstream"
PIN="6e54a75d894532b033c9e933772cdf3720842206"
mkdir -p "$UPSTREAM"
git -C "$UPSTREAM" init -q
git -C "$UPSTREAM" remote add origin https://github.com/FxxMorgan/anime1v-api.git
git -C "$UPSTREAM" fetch --no-tags --depth 1 origin "$PIN"
git -C "$UPSTREAM" checkout -q --detach FETCH_HEAD
test "$(git -C "$UPSTREAM" rev-parse HEAD)" = "$PIN"
npm install --prefix render/anime1v-source --omit=dev --ignore-scripts --no-audit --no-fund
node --check render/anime1v-source/server.js
printf 'Anime1v metadata-only runtime ready, upstream %s\n' "$PIN"
