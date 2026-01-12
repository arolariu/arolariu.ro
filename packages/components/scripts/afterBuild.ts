/**
 * @fileoverview Post-build script for the shared components package.
 * @module packages/components/scripts/afterBuild
 *
 * @remarks
 * Runs build-time steps such as export generation after the primary build completes.
 */

export async function main() {
  console.info("[arolariu.ro::afterBuild] Running after build scripts...");

  // 1. Generate new exports using the generate-exports script
  console.info("[arolariu.ro::afterBuild] Generating exports...");
  await import("./generate-exports.ts").then(() => {
    console.info("[arolariu.ro::afterBuild] Finished generating exports.");
  });

  console.info("[arolariu.ro::afterBuild] Finished running after build scripts.");
}

main();
