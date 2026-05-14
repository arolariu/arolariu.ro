// Cross-platform dispatcher for selfhost docker-compose flow.
// On Windows runs the .bat script; on Unix runs the .sh via bash.
// Action argument is "start" or "stop".

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const action = process.argv[2];
if (action !== "start" && action !== "stop") {
  console.error(`usage: node scripts/dev-selfhost.mjs <start|stop> (got '${action}')`);
  process.exit(2);
}

const isWindows = process.platform === "win32";
const ext = isWindows ? "bat" : "sh";
const script = resolve(`infra/Local/selfhost-${action}.${ext}`);

const result = isWindows
  ? spawnSync(script, [], { stdio: "inherit", shell: true })
  : spawnSync("bash", [script], { stdio: "inherit" });

process.exit(result.status ?? 1);
