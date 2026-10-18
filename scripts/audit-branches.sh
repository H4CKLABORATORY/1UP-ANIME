#!/usr/bin/env bash
set -euo pipefail

REPO="H4CKLABORATORY/1UP-ANIME"

git fetch origin --prune

echo "rama,fusionada_en_main,ultimo_commit,autor,fecha"

for branch in $(git branch -r | grep -v 'HEAD\|main' | sed 's/origin\///' | tr -d ' '); do
  if git merge-base --is-ancestor "origin/$branch" origin/main 2>/dev/null; then
    merged="SI"
  else
    merged="NO"
  fi
  info=$(gh api "repos/$REPO/commits/$branch" --jq '.sha[0:7] + "," + .commit.author.name + "," + .commit.author.date' 2>/dev/null || echo "N/A,N/A,N/A")
  echo "$branch,$merged,$info"
done
