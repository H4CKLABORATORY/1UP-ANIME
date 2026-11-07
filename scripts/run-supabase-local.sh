#!/usr/bin/env bash
# 1UP Anime — run the native-account tests against a local Supabase stack.
# Starts `supabase start` (Docker), applies supabase/sql/*.sql to the local
# database, runs tests/auth-supabase.test.mjs, then stops the stack.
# Requires: Docker and the Supabase CLI (supabase --version).
# Local-dev keys only: the stack generates its own throwaway keys.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is missing. Install it: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi
supabase start > /tmp/oneup-supabase-start.log 2>&1
trap 'supabase stop >/dev/null 2>&1 || true' EXIT
export PGPASSWORD=postgres
for f in supabase/sql/oneup_auth.sql supabase/sql/oneup_community_optional.sql \
         supabase/sql/oneup_community.sql supabase/sql/oneup_storage.sql \
         supabase/sql/oneup_licensed_media.sql; do
  psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$f" > /dev/null
done
node --test tests/auth-supabase.test.mjs
node --test tests/licensed-media-supabase.test.mjs
