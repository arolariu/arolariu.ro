#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
mounts=(
  "${HOME}/.cache/npm"
  "$repository_root/node_modules"
  "$repository_root/sites/arolariu.ro/node_modules"
  "$repository_root/sites/cv.arolariu.ro/node_modules"
  "$repository_root/sites/docs.arolariu.ro/node_modules"
  "$repository_root/sites/status.arolariu.ro/node_modules"
  "$repository_root/packages/components/node_modules"
)

for mount in "${mounts[@]}"; do
  if ! mountpoint -q -- "$mount"; then
    printf 'Components preparation requires a protective mount: %s\n' "$mount" >&2
    exit 1
  fi
done

for mount in "${mounts[@]}"; do
  if [[ ! -w "$mount" ]]; then
    sudo chown "$(id -u):$(id -g)" "$mount"
  fi
done

cd "$repository_root"
node --input-type=module <<'JAVASCRIPT'
import {readFileSync} from "node:fs";
const {scripts = {}} = JSON.parse(readFileSync("package.json", "utf8"));
for (const name of ["preinstall", "install", "postinstall", "prepublish", "preprepare", "prepare", "postprepare"]) {
  if (typeof scripts[name] === "string" && scripts[name].trim() !== "") {
    throw new Error(`Root lifecycle hook '${name}' is not allowed in a scoped devcontainer. Use a workspace-owned preparation command.`);
  }
}
JAVASCRIPT

npm ci --workspace @arolariu/components --include-workspace-root=false --foreground-scripts --no-audit --no-fund
