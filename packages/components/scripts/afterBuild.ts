export async function main() {
  console.info("[arolariu.ro::afterBuild] Running after build scripts...");

  // 1. Generate new exports using the generate-exports script
  console.info("[arolariu.ro::afterBuild] Generating exports...");
  await import("./generate-exports").then(() => {
    console.info("[arolariu.ro::afterBuild] Finished generating exports.");
  });

  console.info("[arolariu.ro::afterBuild] Finished running after build scripts.");
}

main();
