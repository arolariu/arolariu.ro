#!/usr/bin/env bash
# Stop hook — captures session state before exit
# Saves session summary to ops/sessions/

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
VAULT_ROOT="$REPO_ROOT/knowledge"

# Only run if this is an Ars Contexta vault
if [ ! -f "$VAULT_ROOT/.arscontexta" ]; then
  exit 0
fi

# Check if session capture is enabled
if grep -q 'session_capture: false' "$VAULT_ROOT/.arscontexta" 2>/dev/null; then
  exit 0
fi

SESSION_DIR="$VAULT_ROOT/ops/sessions"
CURRENT="$SESSION_DIR/current.json"

# If no current session file, nothing to capture
if [ ! -f "$CURRENT" ]; then
  exit 0
fi

# Archive the current session
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SESSION_ID=$(grep -o '"session_id": *"[^"]*"' "$CURRENT" 2>/dev/null | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  SESSION_ID="$TIMESTAMP"
fi

# Update end time and archive
if command -v python3 &>/dev/null; then
  python3 -c "
import json, sys
from datetime import datetime, timezone
try:
    with open('$CURRENT', 'r') as f:
        data = json.load(f)
    data['end_time'] = datetime.now(timezone.utc).isoformat()
    with open('$SESSION_DIR/$TIMESTAMP.json', 'w') as f:
        json.dump(data, f, indent=2)
except Exception:
    pass
" 2>/dev/null
else
  # Fallback: just copy the file
  cp "$CURRENT" "$SESSION_DIR/$TIMESTAMP.json" 2>/dev/null
fi

# Clean up current session
rm -f "$CURRENT" 2>/dev/null

# Auto-commit session data
cd "$REPO_ROOT" || exit 1
git add "$SESSION_DIR/" 2>/dev/null
if ! git diff --cached --quiet 2>/dev/null; then
  git commit -m "knowledge: capture session $SESSION_ID" --no-verify 2>/dev/null
fi

exit 0
