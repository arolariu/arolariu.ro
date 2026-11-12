import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import postcss from "postcss";
import {compile} from "sass";
import {describe, expect, it} from "vitest";

const stylesheetPath = resolve(dirname(fileURLToPath(import.meta.url)), "_header.scss");

describe("header navigation styles", () => {
  it("keeps the fixed mobile header content clear of landscape safe areas", () => {
    const root = postcss.parse(compile(stylesheetPath).css);
    const mobileDeclarations = new Map<string, string>();
    const desktopDeclarations = new Map<string, string>();

    root.walkRules(".header__nav", (rule) => {
      const target = rule.parent?.type === "atrule" ? desktopDeclarations : mobileDeclarations;
      rule.walkDecls((declaration) => {
        target.set(declaration.prop, declaration.value);
      });
    });

    expect(mobileDeclarations.get("position")).toBe("fixed");
    expect(mobileDeclarations.get("padding-left")).toBe("calc(1rem + env(safe-area-inset-left, 0px))");
    expect(mobileDeclarations.get("padding-right")).toBe("calc(1rem + env(safe-area-inset-right, 0px))");
    expect(desktopDeclarations.get("position")).toBe("relative");
    expect(desktopDeclarations.get("padding-left")).toBe("1rem");
    expect(desktopDeclarations.get("padding-right")).toBe("1rem");
  });
});
