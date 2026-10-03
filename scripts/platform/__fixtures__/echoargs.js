/**
 * @fileoverview Test fixture that prints its arguments as one JSON array line.
 * @module scripts/platform/__fixtures__/echoargs
 */

import {writeSync} from "node:fs";

writeSync(1, `${JSON.stringify(process.argv.slice(2))}\n`);
