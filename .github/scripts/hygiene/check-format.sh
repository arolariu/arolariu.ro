#!/usr/bin/env bash
# Check for formatting changes after running prettier
# Outputs: format-needed, files-needing-format

set -euo pipefail

DIFF="$(git diff --name-only || true)"
if [ -n "$DIFF" ]; then
  echo "format-needed=true" >> "$GITHUB_OUTPUT"
  echo "files-needing-format=$(echo "$DIFF" | paste -sd, -)" >> "$GITHUB_OUTPUT"
  echo "❌ Files need formatting:"
  echo "$DIFF"
  git --no-pager diff
  exit 1
else
  echo "format-needed=false" >> "$GITHUB_OUTPUT"
  echo "files-needing-format=" >> "$GITHUB_OUTPUT"
  echo "✅ All files properly formatted"
fi
