import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import postcss, {type Root} from "postcss";
import {compile} from "sass";
import {describe, expect, it} from "vitest";

const stylesheetPath = resolve(dirname(fileURLToPath(import.meta.url)), "_elements.scss");

/** Reads declarations from unconditional top-level rules, ignoring `@supports` fallbacks. */
function readUnconditionalDeclarations(root: Root, selector: string): Map<string, string> {
  const declarations = new Map<string, string>();

  for (const node of root.nodes) {
    if (node.type === "rule" && node.selector === selector) {
      node.walkDecls((declaration) => {
        declarations.set(declaration.prop, declaration.value);
      });
    }
  }

  return declarations;
}

describe("base element overflow styles", () => {
  it("clips horizontal page overflow on the body instead of propagating the clip to the viewport", () => {
    const root = postcss.parse(compile(stylesheetPath).css);

    expect(readUnconditionalDeclarations(root, "html").get("overflow-x")).toBe("clip");
    expect(readUnconditionalDeclarations(root, "body").get("overflow-x")).toBe("clip");
  });
});
