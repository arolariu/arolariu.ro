/**
 * Wrapper script for executing post-hygiene-comment.ts with Node.js 24's native TypeScript support.
 * 
 * @refactored No params needed - script uses helpers directly
 *
 * @returns {Promise<void>}
 */
export default async function postHygieneCommentWrapper() {
  // Import the TypeScript module directly using Node.js 24's experimental TypeScript support
  const {default: postHygieneComment} = await import("./post-hygiene-comment.ts");

  // Execute the main function (no params needed)
  await postHygieneComment();
}
