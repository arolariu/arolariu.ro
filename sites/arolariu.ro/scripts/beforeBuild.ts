/**
 * @fileoverview Pre-build script orchestrator for arolariu.ro Next.js application.
 * @module scripts/beforeBuild
 *
 * @remarks
 * This module coordinates all pre-build preparation tasks that must execute before
 * Next.js compilation begins. Ensures clean build state by removing stale artifacts
 * and prepares the environment for a fresh production build.
 */

/**
 * Orchestrates pre-build preparation tasks before Next.js compilation.
 *
 * @remarks
 * **Execution Context**: Node.js build-time script invoked before Next.js build.
 *
 * **Build Pipeline Integration**: Automatically executed by Next.js build process
 * via configuration in `next.config.ts` or npm scripts. Runs before TypeScript
 * compilation and asset bundling.
 *
 * **Operations Performed**:
 * 1. **Clean Build Artifacts**: Removes `.next` and `storybook-static` directories
 *    to prevent stale cached data from affecting the new build
 * 2. **Prepare Fresh State**: Ensures build starts from known clean state
 *
 * **Error Handling**: Errors in cleanup are logged but don't fail the build pipeline.
 * The clean script handles individual operation failures gracefully.
 *
 * **Performance**: Typically completes in <1 second for small projects. Larger
 * codebases with extensive build artifacts may take several seconds.
 *
 * **Side Effects**:
 * - Deletes `.next` directory (Next.js build cache and output)
 * - Deletes `storybook-static` directory (Storybook build output)
 * - Logs progress to stdout
 *
 * @returns Promise that resolves when all pre-build tasks complete successfully
 *
 * @example
 * ```typescript
 * // Automatically invoked during build:
 * // npm run build → beforeBuild → Next.js build → afterBuild
 *
 * // Can also be run manually for cleanup:
 * import main from './beforeBuild';
 * await main();
 * ```
 *
 * @see {@link clean.main} for cleanup implementation details
 */
export default async function main(): Promise<void> {
  console.info("[arolariu.ro::beforeBuild] Running before build scripts...");

  // 1. Clean the build directory using the clean script
  console.info("[arolariu.ro::beforeBuild] Cleaning build directory...");
  await import("./clean.ts").then(() => {
    console.info("[arolariu.ro::beforeBuild] Finished cleaning build directory.");
  });

  console.info("[arolariu.ro::beforeBuild] Finished running before build scripts.");
}

await main();
