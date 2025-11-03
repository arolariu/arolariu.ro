/**
 * Wrapper script for executing check-code-hygiene.ts with Node.js 24's native TypeScript support.
 * 
 * @refactored No params needed - script uses helpers directly
 *
 * @returns {Promise<void>}
 */
export default async function checkCodeHygieneWrapper() {
  // Import the TypeScript module directly using Node.js 24's experimental TypeScript support
  const {default: checkCodeHygiene} = await import("./check-code-hygiene.ts");

  // Execute the main function (no params needed)
  await checkCodeHygiene();
}
