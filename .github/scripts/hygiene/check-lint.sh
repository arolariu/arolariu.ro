#!/usr/bin/env bash
# Run linting and capture output
# Outputs: lint-passed, lint-output

set -e

# Temporarily disable exit on error to capture output
set +e
npm run lint 2>&1 | tee lint_output.txt
EXIT_CODE=${PIPESTATUS[0]}
set -e

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "lint-passed=true" >> "$GITHUB_OUTPUT"
  echo "lint-output=All checks passed!" >> "$GITHUB_OUTPUT"
  echo "✅ All lint checks passed"
else
  echo "lint-passed=false" >> "$GITHUB_OUTPUT"
  TRUNCATED_CONTENT="$(head -c 50000 lint_output.txt)"
  {
    echo "lint-output<<EOF"
    echo "$TRUNCATED_CONTENT"
    echo "EOF"
  } >> "$GITHUB_OUTPUT"
  echo "❌ Lint checks failed"
  exit 1
fi
