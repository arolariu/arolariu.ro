// Compatibility shim for npm scripts. All container runtime logic lives in
// scripts/container-runtime/selfhost.ts so Rancher and Podman do not drift.

import {spawnSync} from "node:child_process";

const action = process.argv[2];
const passthrough = process.argv.slice(3);

if (action !== "start" && action !== "stop" && action !== "logs") {
  console.error(`usage: node scripts/dev-selfhost.mjs <start|stop|logs> --engine <rancher|podman>`);
  process.exit(2);
}

const result = spawnSync(process.execPath, ["scripts/container-runtime/selfhost.ts", action, ...passthrough], {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
