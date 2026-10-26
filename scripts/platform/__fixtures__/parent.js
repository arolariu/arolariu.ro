/**
 * @fileoverview Test fixture that spawns a long-lived grandchild, prints both PIDs, and stays alive.
 * @module scripts/platform/__fixtures__/parent
 *
 * @remarks
 * With a path argument it also writes the same two lines to that file, so a test can read the PIDs
 * of a run whose output is captured.
 */

import {spawn} from "node:child_process";
import {writeFileSync, writeSync} from "node:fs";

const grandchild = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {stdio: "ignore"});
const pids = `PARENT=${String(process.pid)}\nGRANDCHILD=${String(grandchild.pid)}\n`;

if (process.argv[2] !== undefined) {
  writeFileSync(process.argv[2], pids);
}
writeSync(1, pids);

setInterval(() => {}, 1000);
