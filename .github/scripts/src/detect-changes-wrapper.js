/**
 * Wrapper for detect-changes.ts enabling invocation from GitHub Actions via actions/github-script.
 */
export default async function detectChangesWrapper() {
  const {default: detectChanges} = await import("./detect-changes.ts");
  await detectChanges();
}
