#!/usr/bin/env bash
# Run unit tests
# Outputs: result

set -e

npm run test:unit
echo "result=success" >> "$GITHUB_OUTPUT"
