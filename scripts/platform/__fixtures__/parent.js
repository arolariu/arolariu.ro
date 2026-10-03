/**
 * @fileoverview Test fixture that spawns a long-lived grandchild, prints both PIDs, and stays alive.
 * @module scripts/platform/__fixtures__/parent
 */

import {spawn} from "node:child_process";
import {writeSync} from "node:fs";

const grandchild = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {stdio: "ignore"});

writeSync(1, `PARENT=${String(process.pid)}\n`);
writeSync(1, `GRANDCHILD=${String(grandchild.pid)}\n`);

setInterval(() => {}, 1000);
