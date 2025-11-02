/**
 * Wrapper script for executing create-unit-test-summary-comment.ts with Node.js TypeScript support.
 * This is called from GitHub Actions and passes the required context objects to the TypeScript module.
 *
 * @param {object} params - GitHub Actions context parameters
 * @param {ReturnType<typeof import('@actions/github').getOctokit>} params.github - GitHub Octokit client instance
 * @param {typeof import('@actions/github').context} params.context - GitHub Actions context
 * @param {typeof import('@actions/core')} params.core - GitHub Actions core utilities
 * @param {typeof import('@actions/exec')} params.exec - GitHub Actions exec utilities
 * @returns {Promise<void>}
 */
export default async function createUnitTestSummaryCommentWrapper({github, context, core, exec}) {
  // Import the TypeScript module directly using Node.js TypeScript support
  const {default: createUnitTestSummaryComment} = await import("./create-unit-test-summary-comment.ts");

  // Execute the main function with the provided parameters
  await createUnitTestSummaryComment({github, context, core, exec});
}
