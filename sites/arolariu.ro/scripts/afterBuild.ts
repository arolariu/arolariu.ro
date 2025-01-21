/** @format */

/**
 * This script will run after the build process finishes.
 * It will run a couple of subsequent scripts to perform the following tasks:
 */

export async function main() {
  console.info("[arolariu.ro::afterBuild] Running after build scripts...");
  const currentDirectory = process.cwd();

  console.info("[arolariu.ro::afterBuild] Finished running after build scripts.");
}

main();
