/** @format */

/**
 * This script will run before the build process starts.
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

  // 3. Generate new licenses & acknowledegmenets using the generateAcknowledgements script
  console.info("[arolariu.ro::beforeBuild] Generating licenses...");
  await import("./generateAcknowledgements").then(() => {
    console.info("[arolariu.ro::beforeBuild] Finished generating licenses.");
  });

  console.info("[arolariu.ro::beforeBuild] Finished running before build scripts.");
}

main();
