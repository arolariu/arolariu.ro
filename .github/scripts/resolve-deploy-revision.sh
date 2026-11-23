#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf '::error::%s\n' "$1" >&2
  exit 1
}

if [[ "$EVENT_NAME" != workflow_dispatch || "$DISPATCH_REF" != refs/heads/main ]]; then
  fail "Manual deployments must be dispatched from main."
fi

candidate=${REQUESTED_SHA:-$DISPATCH_SHA}
if [[ ! "$candidate" =~ ^[0-9a-fA-F]{40}$ ]]; then
  fail "commit_sha must be a full 40-character hexadecimal commit SHA."
fi
candidate=${candidate,,}

if [[ "$(git cat-file -t "$candidate" 2>/dev/null)" != commit ]]; then
  fail "The selected SHA does not identify a commit in the repository."
fi
if ! git merge-base --is-ancestor "$candidate" refs/remotes/origin/main; then
  fail "The selected commit could not be verified in origin/main history."
fi

if (( $# > 0 )); then
  if ! action=$(git show "$candidate:.github/actions/setup-workspace/action.yml"); then
    fail "The selected commit does not contain the workspace setup action."
  fi
  for input in "$@"; do
    if ! grep -Eq "^  ${input}:[[:space:]]*$" <<< "$action"; then
      fail "The selected commit does not support the workflow's setup input '$input'."
    fi
  done
fi

printf '%s\n' "$candidate"
