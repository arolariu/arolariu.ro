import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import postcss from "postcss";
import {compile} from "sass";
import {describe, expect, it} from "vitest";

const stylesheetPath = resolve(dirname(fileURLToPath(import.meta.url)), "_reset.scss");

describe("reset body styles", () => {
  it("insets page content from landscape safe areas once the viewport covers the display", () => {
    const root = postcss.parse(compile(stylesheetPath).css);
    const declarations = new Map<string, string>();

    root.walkRules("body", (rule) => {
      rule.walkDecls((declaration) => {
        declarations.set(declaration.prop, declaration.value);
      });
    });

    expect(declarations.get("min-height")).toBe("100dvh");
    expect(declarations.get("padding-left")).toBe("env(safe-area-inset-left, 0px)");
    expect(declarations.get("padding-right")).toBe("env(safe-area-inset-right, 0px)");
  });
});
