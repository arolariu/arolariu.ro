/**
 * Wrapper script for executing check-code-hygiene.ts with Node.js 24's native TypeScript support.
 * This is called from GitHub Actions and passes the required context objects to the TypeScript module.
 *
 * @param {object} params - GitHub Actions context parameters
 * @param {ReturnType<typeof import('@actions/github').getOctokit>} params.github - GitHub Octokit client instance
 * @param {typeof import('@actions/github').context} params.context - GitHub Actions context
 * @param {typeof import('@actions/core')} params.core - GitHub Actions core utilities
 * @param {typeof import('@actions/exec')} params.exec - GitHub Actions exec utilities
 * @returns {Promise<void>}
 */
export default async function checkCodeHygieneWrapper({github, context, core, exec}) {
  // Import the TypeScript module directly using Node.js 24's experimental TypeScript support
  const {default: checkCodeHygiene} = await import("./check-code-hygiene.ts");

  // Execute the main function with the provided parameters
  await checkCodeHygiene({github, context, core, exec});
}
