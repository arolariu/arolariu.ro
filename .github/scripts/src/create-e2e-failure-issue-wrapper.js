/**
 * Wrapper script for executing create-e2e-failure-issue.ts with Node.js 24's native TypeScript support.
 *
 * @returns {Promise<void>}
 */
export default async function createE2EFailureIssueWrapper() {
  // Import the TypeScript module directly using Node.js 24's experimental TypeScript support
  const {default: createE2EFailureIssue} = await import("./create-e2e-failure-issue.ts");

  await createE2EFailureIssue();
}
