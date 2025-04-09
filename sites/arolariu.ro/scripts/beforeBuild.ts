/** @format */

/**
 * Executes a series of scripts to prepare for the build process.
 *
 * This function performs the following operations sequentially:
 * 1. Cleans the build directory using the clean script
 * 2. Formats the code using the format script
 * 3. Generates new licenses and acknowledgements
 *
 * Each step is logged to the console with appropriate start and completion messages.
 */
export default async function main() {
  console.info("[arolariu.ro::beforeBuild] Running before build scripts...");

  // 1. Clean the build directory using the clean script
  console.info("[arolariu.ro::beforeBuild] Cleaning build directory...");
  await import("./clean").then(() => {
    console.info("[arolariu.ro::beforeBuild] Finished cleaning build directory.");
  });

  // 2. Format code using the format script
  console.info("[arolariu.ro::beforeBuild] Formatting code...");
  await import("./format").then(() => {
    console.info("[arolariu.ro::beforeBuild] Finished formatting code.");
  });

  // 3. Generate new licenses & acknowledgements using the generateAcknowledgements script
  console.info("[arolariu.ro::beforeBuild] Generating licenses...");
  await import("./generateAcknowledgements").then(() => {
    console.info("[arolariu.ro::beforeBuild] Finished generating licenses.");
  });

  console.info("[arolariu.ro::beforeBuild] Finished running before build scripts.");
}

main();

