#!/usr/bin/env bash
# Session orientation hook — runs at SessionStart
# Provides the agent with vault state for immediate orientation

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
VAULT_ROOT="$REPO_ROOT/knowledge"

# Only run if this is an Ars Contexta vault
if [ ! -f "$VAULT_ROOT/.arscontexta" ]; then
  exit 0
fi

echo "=== Knowledge Vault Orientation ==="
echo ""

# Show vault structure
echo "--- Vault Structure ---"
if command -v tree &>/dev/null; then
  tree "$VAULT_ROOT" -L 2 --dirsfirst -I '.git' 2>/dev/null || ls -la "$VAULT_ROOT"
else
  ls -la "$VAULT_ROOT"
fi
echo ""

# Show insight count
INSIGHT_COUNT=$(find "$VAULT_ROOT/insights" -name "*.md" -not -name "index.md" 2>/dev/null | wc -l | tr -d ' ')
echo "--- Stats: $INSIGHT_COUNT insights ---"
echo ""

# Show active goals
if [ -f "$VAULT_ROOT/self/goals.md" ]; then
  echo "--- Active Goals ---"
  sed -n '/## Active Threads/,/## /p' "$VAULT_ROOT/self/goals.md" | head -20
  echo ""
fi

# Show pending reminders
if [ -f "$VAULT_ROOT/ops/reminders.md" ]; then
  PENDING=$(grep -c '^\- \[ \]' "$VAULT_ROOT/ops/reminders.md" 2>/dev/null || echo "0")
  if [ "$PENDING" -gt 0 ]; then
    echo "--- $PENDING Pending Reminders ---"
    grep '^\- \[ \]' "$VAULT_ROOT/ops/reminders.md"
    echo ""
  fi
fi

# Check inbox pressure
INBOX_COUNT=$(find "$VAULT_ROOT/inbox" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$INBOX_COUNT" -gt 0 ]; then
  echo "--- Inbox: $INBOX_COUNT items waiting to be distilled ---"
  echo ""
fi

# Check pending observations
OBS_COUNT=$(find "$VAULT_ROOT/ops/observations" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$OBS_COUNT" -ge 10 ]; then
  echo "--- $OBS_COUNT pending observations — consider running /rethink ---"
  echo ""
fi

# Check pending tensions
TENSION_COUNT=$(find "$VAULT_ROOT/ops/tensions" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TENSION_COUNT" -ge 5 ]; then
  echo "--- $TENSION_COUNT pending tensions — consider running /rethink ---"
  echo ""
fi

# Session tracking
SESSION_DIR="$VAULT_ROOT/ops/sessions"
SESSION_ID="${CLAUDE_CONVERSATION_ID:-$(date +%Y%m%d-%H%M%S)}"
cat > "$SESSION_DIR/current.json" << SESSIONEOF
{
  "session_id": "$SESSION_ID",
  "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "insights_created": [],
  "insights_modified": [],
  "discoveries": [],
  "last_activity": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
SESSIONEOF

echo "=== Session $SESSION_ID started ==="
