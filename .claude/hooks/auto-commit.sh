#!/usr/bin/env bash
# PostToolUse hook (async) — auto-commits vault changes
# Runs asynchronously after Write/Edit on vault files

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
VAULT_ROOT="$REPO_ROOT/knowledge"

# Only run if this is an Ars Contexta vault with git enabled
if [ ! -f "$VAULT_ROOT/.arscontexta" ]; then
  exit 0
fi

# Check if git auto-commit is enabled
if grep -q 'git: false' "$VAULT_ROOT/.arscontexta" 2>/dev/null; then
  exit 0
fi

# Get the file that was written
FILE_PATH="${CLAUDE_TOOL_INPUT_FILE_PATH:-${CLAUDE_TOOL_INPUT_file_path:-}}"

# Only auto-commit vault files
case "$FILE_PATH" in
  */knowledge/*)
    ;;
  *)
    exit 0
    ;;
esac

cd "$REPO_ROOT" || exit 1

# Stage only the changed file
git add "$FILE_PATH" 2>/dev/null

# Check if there are staged changes
if git diff --cached --quiet 2>/dev/null; then
  exit 0
fi

# Get relative path for commit message
REL_PATH="${FILE_PATH#$REPO_ROOT/}"
FILENAME=$(basename "$FILE_PATH" .md)

# Auto-commit with descriptive message
git commit -m "knowledge: update $FILENAME" --no-verify 2>/dev/null

exit 0
