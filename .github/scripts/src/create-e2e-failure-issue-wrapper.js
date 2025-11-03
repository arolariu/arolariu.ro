/**
 * Wrapper script for executing create-e2e-failure-issue.ts with Node.js 24's native TypeScript support.
 * 
 * @refactored No params needed - script uses helpers directly
 *
 * @returns {Promise<void>}
 */
export default async function createE2EFailureIssueWrapper() {
  // Import the TypeScript module directly using Node.js 24's experimental TypeScript support
  const {default: createE2EFailureIssue} = await import("./create-e2e-failure-issue.ts");

  // Execute the main function (no params needed)
  await createE2EFailureIssue();
}
