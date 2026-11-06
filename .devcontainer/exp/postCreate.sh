#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
venv="${HOME}/.cache/exp-venv"
pip_cache="${HOME}/.cache/pip"

for cache in "$venv" "$pip_cache"; do
  if ! mountpoint -q -- "$cache"; then
    printf 'EXP preparation requires a mounted cache: %s\n' "$cache" >&2
    exit 1
  fi
done

for cache in "$venv" "$pip_cache"; do
  if [[ ! -w "$cache" ]]; then
    sudo chown "$(id -u):$(id -g)" "$cache"
  fi
done

if [[ ! -x "$venv/bin/python" ]]; then
  python3 -m venv "$venv"
fi

"$venv/bin/python" -m pip install -r "$repository_root/sites/exp.arolariu.ro/requirements-dev.txt"
