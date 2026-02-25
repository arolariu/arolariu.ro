#!/usr/bin/env bash
# PostToolUse hook — validates insights after creation/edit
# Runs on Write/Edit tool use, checks YAML frontmatter

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
VAULT_ROOT="$REPO_ROOT/knowledge"

# Only run if this is an Ars Contexta vault
if [ ! -f "$VAULT_ROOT/.arscontexta" ]; then
  exit 0
fi

# Get the file that was written from the tool input
FILE_PATH="${CLAUDE_TOOL_INPUT_FILE_PATH:-${CLAUDE_TOOL_INPUT_file_path:-}}"

# Only validate files in insights/ or inbox/
case "$FILE_PATH" in
  */knowledge/insights/*.md|*/knowledge/inbox/*.md)
    ;;
  *)
    exit 0
    ;;
esac

# Skip domain map files (type: moc)
if grep -q '^type: moc' "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

ERRORS=""

# Check for YAML frontmatter
if ! head -1 "$FILE_PATH" | grep -q '^---'; then
  ERRORS="${ERRORS}FAIL: Missing YAML frontmatter\n"
fi

# Check for description field
if ! grep -q '^description:' "$FILE_PATH" 2>/dev/null; then
  ERRORS="${ERRORS}FAIL: Missing required 'description' field\n"
else
  DESC=$(grep '^description:' "$FILE_PATH" | head -1 | sed 's/^description: *//')
  if [ -z "$DESC" ] || [ "$DESC" = '""' ]; then
    ERRORS="${ERRORS}WARN: Description field is empty\n"
  fi
fi

# Check for Domains/Topics footer (insights only)
case "$FILE_PATH" in
  */knowledge/insights/*.md)
    if ! grep -q '^\(Domains:\|Topics:\)' "$FILE_PATH" 2>/dev/null; then
      ERRORS="${ERRORS}WARN: Missing Domains footer — insight may become an orphan\n"
    fi
    ;;
esac

# Report
if [ -n "$ERRORS" ]; then
  echo "=== Insight Validation ==="
  echo -e "$ERRORS"
  echo "File: $FILE_PATH"
  echo "==========================="
fi

exit 0
