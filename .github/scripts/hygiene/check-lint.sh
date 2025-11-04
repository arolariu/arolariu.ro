#!/usr/bin/env bash
# Run linting and capture output
# Outputs: lint-passed, lint-output

set +e
npm run lint > lint_output.txt 2>&1
EXIT_CODE=$?

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "lint-passed=true" >> "$GITHUB_OUTPUT"
  echo "lint-output=All checks passed!" >> "$GITHUB_OUTPUT"
else
  echo "lint-passed=false" >> "$GITHUB_OUTPUT"
  TRUNCATED_CONTENT="$(head -c 50000 lint_output.txt)"
  {
    echo "lint-output<<EOF"
    echo "$TRUNCATED_CONTENT"
    echo "EOF"
  } >> "$GITHUB_OUTPUT"
  exit 1
fi
