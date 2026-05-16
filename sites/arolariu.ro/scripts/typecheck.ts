/**
 * @fileoverview TypeScript type-check orchestrator for arolariu.ro.
 * @module scripts/typecheck
 *
 * @remarks
 * Runs `tsc --noEmit -p tsconfig.json` against the website project using the
 * existing `typescript` devDep (NOT the preview tsgo).
 *
 * Invoked by:
 *   - `npm run typecheck` (direct, by humans)
 *   - `beforeBuild.ts` (as part of `npm run build`)
 *   - the Docker frontend build (which runs `npm run build` inside the image)
 *
 * Fails the build on any non-zero tsc exit. Streams tsc output unmodified.
 */

import {spawn} from "node:child_process";

export default async function typeCheck(): Promise<void> {
  console.info("[arolariu.ro::typecheck] Running tsc --noEmit -p tsconfig.json...");

  await new Promise<void>((resolve, reject) => {
    // On Windows, `npx` is a .cmd shim that spawn() refuses to run directly
    // (Node 18.20+ security mitigation, CVE-2024-27980). Route through cmd.exe
    // /c — a real binary that resolves PATHEXT for us. This mirrors the pattern
    // landed in scripts/workers/lint.worker.ts during Phase 2.
    const isWindows = process.platform === "win32";
    const [cmd, args] = isWindows
      ? ["cmd.exe", ["/c", "npx", "tsc", "--noEmit", "-p", "tsconfig.json"]]
      : ["npx", ["tsc", "--noEmit", "-p", "tsconfig.json"]];

    const child = spawn(cmd, args, {
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.info("[arolariu.ro::typecheck] Type-check passed.");
        resolve();
      } else {
        reject(new Error(`tsc exited with code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

// Auto-invoke only when this file is the process entry point (`npm run typecheck`,
// `node scripts/typecheck.ts`). When `beforeBuild.ts` imports the module, the caller
// invokes `typeCheck()` explicitly — avoids ESM module-cache pitfalls where a second
// `import()` is a no-op and never re-runs the top-level side effect.
if (import.meta.main) {
  await typeCheck();
}
