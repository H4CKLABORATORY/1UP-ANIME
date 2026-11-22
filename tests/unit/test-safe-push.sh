#!/usr/bin/env bash
set -euo pipefail
# Integration test: same-origin repo gets an intervening commit from another writer.
ROOT="$(pwd)"
PUBLISH="$ROOT/scripts/oneup-safe-push.sh"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT
git init -q --bare --initial-branch=main "$DIR/origin.git"
git clone -q "$DIR/origin.git" "$DIR/seed"
git -C "$DIR/seed" config user.name "ONEUP Test"
git -C "$DIR/seed" config user.email "test@invalid.example"
printf "baseline\n" > "$DIR/seed/baseline.txt"
printf "baseline untouched\n" > "$DIR/seed/omitted.txt"
git -C "$DIR/seed" add baseline.txt omitted.txt
git -C "$DIR/seed" commit -q -m "baseline"
git -C "$DIR/seed" push -q origin HEAD:main
git clone -q "$DIR/origin.git" "$DIR/writer"
git clone -q "$DIR/origin.git" "$DIR/other"
git -C "$DIR/other" config user.name "ONEUP Test"
git -C "$DIR/other" config user.email "test@invalid.example"
printf "other writer\n" > "$DIR/other/other.txt"
git -C "$DIR/other" add other.txt
git -C "$DIR/other" commit -q -m "another valid update"
git -C "$DIR/other" push -q origin HEAD:main
printf "safe writer\n" > "$DIR/writer/mine.txt"
( cd "$DIR/writer" && GITHUB_REF="refs/heads/main" bash "$PUBLISH" "safe test update" mine.txt )
git clone -q "$DIR/origin.git" "$DIR/final"
test "$(cat "$DIR/final/other.txt")" = "other writer"
test "$(cat "$DIR/final/mine.txt")" = "safe writer"
printf "bad branch\n" > "$DIR/writer/rejected.txt"
if ( cd "$DIR/writer" && GITHUB_REF="refs/heads/dependabot" bash "$PUBLISH" "invalid branch update" rejected.txt ); then
  echo "Publisher incorrectly allowed a non-main branch" >&2
  exit 1
fi
if git -C "$DIR/final" ls-tree -r --name-only HEAD | grep -q "^rejected.txt$"; then
  echo "Rejected branch reached production" >&2
  exit 1
fi
rm -f "$DIR/writer/rejected.txt"
printf "must remain local\n" > "$DIR/writer/baseline.txt"
printf "generated but omitted\n" > "$DIR/writer/omitted-output.txt"
set +e
( cd "$DIR/writer" && GITHUB_REF="refs/heads/main" bash "$PUBLISH" "refuse omitted generated output" omitted-output.txt )
refusal_status=$?
set -e
if [[ "$refusal_status" -ne 5 ]]; then
  echo "Publisher did not reject omitted generated paths with exit 5 (got $refusal_status)" >&2
  exit 1
fi
git clone -q "$DIR/origin.git" "$DIR/after-refusal"
test "$(cat "$DIR/after-refusal/baseline.txt")" = "baseline"
test ! -e "$DIR/after-refusal/omitted-output.txt"
echo "ONEUP safe publisher integration test passed (rebase, preservation, branch refusal, omitted-path refusal)."
