/**
 * @fileoverview TypeScript type-check orchestrator for arolariu.ro.
 * @module scripts/typecheck
 *
 * @remarks
 * Runs `tsc --noEmit -p tsconfig.json` against the website project using the
 * existing `typescript` devDep (NOT the preview tsgo).
 *
 * Before invoking tsc, runs `next typegen` to (re)generate the route-aware
 * ambient types (`PageProps`, `LayoutProps`, route literal unions) under
 * `.next/types/`. Without this step the type-check sees those globals as
 * undefined and emits dozens of false-positive `TS2304` errors.
 *
 * Invoked by:
 *   - `npm run typecheck` (direct, by humans)
 *   - `beforeBuild.ts` (as part of `npm run build`)
 *   - the Docker frontend build (which runs `npm run build` inside the image)
 *
 * Fails the build on any non-zero exit from either step. Streams output unmodified.
 */

import {spawn} from "node:child_process";

/** Spawns one CLI step and resolves on exit 0, rejects otherwise. */
function runStep(label: string, command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    // On Windows, `npx` is a .cmd shim that spawn() refuses to run directly
    // (Node 18.20+ security mitigation, CVE-2024-27980). Route through cmd.exe
    // /c — a real binary that resolves PATHEXT for us. Mirrors the pattern in
    // scripts/workers/shell.ts.
    const isWindows = process.platform === "win32";
    const [spawnCmd, spawnArgs]: [string, string[]] = isWindows
      ? ["cmd.exe", ["/c", command, ...args]]
      : [command, [...args]];

    const child = spawn(spawnCmd, spawnArgs, {
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

export default async function typeCheck(): Promise<void> {
  // Step 1: regenerate Next.js route-aware ambient types. Without this, tsc
  // reports TS2304 for every `PageProps`/`LayoutProps` use across the app
  // (and the SVG-import errors that cascade from those broken types).
  console.info("[arolariu.ro::typecheck] Generating Next.js route types (next typegen)...");
  await runStep("next typegen", "npx", ["next", "typegen"]);

  // Step 2: type-check with tsc.
  console.info("[arolariu.ro::typecheck] Running tsc --noEmit -p tsconfig.json...");
  await runStep("tsc", "npx", ["tsc", "--noEmit", "-p", "tsconfig.json"]);

  console.info("[arolariu.ro::typecheck] Type-check passed.");
}

// Auto-invoke only when this file is the process entry point (`npm run typecheck`,
// `node scripts/typecheck.ts`). When `beforeBuild.ts` imports the module, the caller
// invokes `typeCheck()` explicitly — avoids ESM module-cache pitfalls where a second
// `import()` is a no-op and never re-runs the top-level side effect.
if (import.meta.main) {
  await typeCheck();
}
