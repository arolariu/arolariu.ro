/**
 * Wrapper for detect-changes.ts enabling invocation from GitHub Actions via actions/github-script.
 * Mirrors the pattern used by other hygiene wrappers.
 * @param {object} params
 * @param {ReturnType<typeof import('@actions/github').getOctokit>} params.github
 * @param {typeof import('@actions/github').context} params.context
 * @param {typeof import('@actions/core')} params.core
 * @param {typeof import('@actions/exec')} params.exec
 */
export default async function detectChangesWrapper({github, context, core, exec}) {
  const {default: detectChanges} = await import("./detect-changes.ts");
  await detectChanges({github, context, core, exec});
}
