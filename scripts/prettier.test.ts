// @vitest-environment node
import {fileURLToPath} from "node:url";
import {format, resolveConfig} from "prettier";
import {describe, expect, it} from "vitest";

describe("repository module formatting", () => {
  it.each(["const session = await joinSession({});\n", "let session;\nsession = await joinSession({});\n"])(
    "formats valid top-level await in an ES module: %s",
    async (source) => {
      const filepath = fileURLToPath(new URL("../.github/extensions/module-format-regression.mjs", import.meta.url));
      const configuration = await resolveConfig(filepath);

      await expect(format(source, {...configuration, filepath})).resolves.toContain("await joinSession");
    },
  );
});
