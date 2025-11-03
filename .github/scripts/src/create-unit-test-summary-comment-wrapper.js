/**
 * Wrapper script for executing create-unit-test-summary-comment.ts with Node.js TypeScript support.
 * 
 * @refactored No params needed - script uses helpers directly
 *
 * @returns {Promise<void>}
 */
export default async function createUnitTestSummaryCommentWrapper() {
  // Import the TypeScript module directly using Node.js TypeScript support
  const {default: createUnitTestSummaryComment} = await import("./create-unit-test-summary-comment.ts");

  // Execute the main function (no params needed)
  await createUnitTestSummaryComment();
}
