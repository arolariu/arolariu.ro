#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
if [[ -f "$repository_root/.git" ]] && ! git -C "$repository_root" rev-parse --show-toplevel > /dev/null; then
  printf 'Source checkout Git metadata is not accessible inside the container. Use a regular clone; external host Git directories are not mounted.\n' >&2
  exit 1
fi

mounts=(
  "${HOME}/.cache"
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
    printf 'Website preparation requires a protective mount: %s\n' "$mount" >&2
    exit 1
  fi
done

for mount in "${mounts[@]}"; do
  if [[ ! -w "$mount" ]]; then
    sudo chown "$(id -u):$(id -g)" "$mount"
  fi
done

cd "$repository_root"
node --input-type=module - "${mounts[@]}" <<'JAVASCRIPT'
import {globSync, readFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
const {scripts = {}, workspaces} = JSON.parse(readFileSync("package.json", "utf8"));
for (const name of ["preinstall", "install", "postinstall", "prepublish", "preprepare", "prepare", "postprepare"]) {
  if (typeof scripts[name] === "string" && scripts[name].trim() !== "") {
    throw new Error(`Root lifecycle hook '${name}' is not allowed in a scoped devcontainer. Use a workspace-owned preparation command.`);
  }
}
if (!Array.isArray(workspaces) || workspaces.some((pattern) => typeof pattern !== "string" || pattern.startsWith("!"))) {
  throw new Error("Scoped preparation requires explicit, non-negated root workspace patterns. Review protective mounts before changing workspace discovery.");
}
const protectedPaths = new Set(process.argv.slice(2).map((path) => resolve(path)));
for (const manifest of globSync(workspaces.map((pattern) => `${pattern}/package.json`))) {
  const target = resolve(dirname(manifest), "node_modules");
  if (!protectedPaths.has(target)) {
    throw new Error(`Missing protective mount for npm workspace cleanup: ${target}. Update every Node flavor before installing.`);
  }
}
JAVASCRIPT

npm ci --workspace @arolariu/website --include-workspace-root=false --foreground-scripts --no-audit --no-fund
node "$repository_root/scripts/cli.ts" generate --website-licenses-only
npm exec --yes=false --workspace @arolariu/website -- next typegen
