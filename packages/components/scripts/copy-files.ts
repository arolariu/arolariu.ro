// scripts/copy-dist-files.js
import fs from "node:fs/promises";
import path from "node:path";

async function copyFiles() {
  console.log("Copying distribution files to root dist folder...");

  try {
    // Ensure root dist directory exists
    await fs.mkdir("dist", { recursive: true });

    // Copy index.js from ESM build
    await fs.copyFile(
      path.resolve("dist/esm/index.js"),
      path.resolve("dist/index.js")
    );
    console.log("✅ ESM index file copied successfully");

    // Copy CSS file from ESM build
    await fs.copyFile(
      path.resolve("dist/esm/index.css"),
      path.resolve("dist/index.css")
    );
    console.log("✅ CSS file copied successfully");

    console.log("✅ Files copied successfully");
  } catch (err) {
    console.error("❌ Error copying files:", err);
    process.exit(1);
  }
}

async function modifyIndexImports() {
  console.log("Modifying index.js imports...");

  try {
    const indexPath = path.resolve("dist/index.js");
    let indexContent = await fs.readFile(indexPath, "utf-8");

    // Modify the import paths to point to add the ./esm path.
    /*
        Example:
        import { Button, buttonVariants } from "./components/ui/button.js";
        import { Calendar } from "./components/ui/calendar.js";
        import { cn } from "./lib/utils.js";

        Rewrite:
        import { Button, buttonVariants } from "./esm/components/ui/button.js";
        import { Calendar } from "./esm/components/ui/calendar.js";
        import { cn } from "./esm/lib/utils.js";
    */
    indexContent = indexContent.replace(
      /(?<=import .* from ["'])\.\//g,
      "./esm/"
    );

    // Write the modified content back to the file
    await fs.writeFile(indexPath, indexContent);
    console.log("✅ Imports modified successfully");
  } catch (err) {
    console.error("❌ Error modifying imports:", err);
    process.exit(1);
  }
}

await copyFiles();
await modifyIndexImports();
