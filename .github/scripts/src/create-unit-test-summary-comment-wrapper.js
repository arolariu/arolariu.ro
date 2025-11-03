/**
 * Wrapper script for executing create-unit-test-summary-comment.ts with Node.js TypeScript support.
 *
 * @returns {Promise<void>}
 */
export default async function createUnitTestSummaryCommentWrapper() {
  // Import the TypeScript module directly using Node.js TypeScript support
  const {default: createUnitTestSummaryComment} = await import("./create-unit-test-summary-comment.ts");

  await createUnitTestSummaryComment();
}
