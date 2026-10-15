#!/usr/bin/env bash
set -euo pipefail
# Publish only from main, with bounded fetch/rebase/push retries.
# Abort on real conflicts; never force-push or overwrite unrelated changes.
if [[ "${GITHUB_REF:-refs/heads/main}" != "refs/heads/main" ]]; then
  echo "::error::Publishing is restricted to main."
  exit 2
fi
if (( $# < 2 )); then
  echo "Usage: bash scripts/oneup-safe-push.sh MESSAGE PATH..." >&2
  exit 2
fi
message="$1"
shift
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -- "$@"
if git diff --cached --quiet; then
  echo "No new content to publish."
  exit 0
fi
git commit -m "$message"
for attempt in 1 2 3 4 5 6; do
  echo "ONEUP safe publish attempt ${attempt}/6"
  git fetch origin main
  if ! git rebase origin/main; then
    echo "::error::Actual merge conflict. Preserve remote data; review manually."
    git rebase --abort || true
    exit 3
  fi
  if git push origin HEAD:main; then
    echo "ONEUP safe publish confirmed."
    exit 0
  fi
  if [[ "$attempt" != "6" ]]; then sleep "$((attempt * 2))"; fi
done
echo "::error::Unable to publish after 6 bounded retries."
exit 4
