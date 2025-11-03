/**
 * Wrapper script for executing check-code-hygiene.ts with Node.js 24's native TypeScript support.
 *
 * @returns {Promise<void>}
 */
export default async function checkCodeHygieneWrapper() {
  // Import the TypeScript module directly using Node.js 24's experimental TypeScript support
  const {default: checkCodeHygiene} = await import("./check-code-hygiene.ts");

  await checkCodeHygiene();
}
