/** @format */

/**
 * This script will run before the build process starts.
 * It will run a couple of subsequent scripts to perform the following tasks:
 */

export default async function main() {
  console.info("[arolariu.ro::beforeBuild] Running before build scripts...");

  // 1. Clean the build directory using the clean script
  console.info("[arolariu.ro::beforeBuild] Cleaning build directory...");
  await import("./clean").then(() => {
    console.info("[arolariu.ro::beforeBuild] Finished cleaning build directory.");
  });

  // 2. Check translations using the checkTranslations script
  console.info("[arolariu.ro::beforeBuild] Checking translations...");
  await import("./checkTranslations").then(() => {
    console.info("[arolariu.ro::beforeBuild] Finished checking translations.");
  });

  // 3. Format code using the format script
  console.info("[arolariu.ro::beforeBuild] Formatting code...");
  await import("./format").then(() => {
    console.info("[arolariu.ro::beforeBuild] Finished formatting code.");
  });

  console.info("[arolariu.ro::beforeBuild] Finished running before build scripts.");
}

main();
