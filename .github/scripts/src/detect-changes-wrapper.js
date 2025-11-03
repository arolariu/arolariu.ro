/**
 * Wrapper for detect-changes.ts enabling invocation from GitHub Actions via actions/github-script.
 * 
 * @refactored New helpers architecture - no params needed, uses default instances
 * 
 * The refactored detect-changes.ts uses the new helper architecture which doesn't
 * require passing context objects. Helpers access GitHub Actions context internally.
 */
export default async function detectChangesWrapper() {
  const {default: detectChanges} = await import("./detect-changes.ts");
  // No parameters needed - helpers use default instances with internal context access
  await detectChanges();
}
