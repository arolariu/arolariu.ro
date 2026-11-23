#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf '::error::%s\n' "$1" >&2
  exit 1
}

if [[ "$EVENT_NAME" != workflow_dispatch || "$DISPATCH_REF" != refs/heads/main ]]; then
  fail "Manual deployments must be dispatched from main."
fi

checkout=false
if [[ "${1:-}" == --checkout ]]; then
  checkout=true
  shift
  [[ "$(git rev-parse HEAD)" == "$DISPATCH_SHA" ]] || fail "Expected the trusted dispatch commit before switching revisions."
fi

candidate=$REQUESTED_SHA
if [[ "$checkout" == false && -z "$candidate" ]]; then
  candidate=$DISPATCH_SHA
fi
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

if [[ "$checkout" == true ]]; then
  git switch --detach "$candidate" >&2
  [[ "$(git rev-parse HEAD)" == "$candidate" ]] || fail "The checkout does not match the validated commit."
fi

printf '%s\n' "$candidate"
