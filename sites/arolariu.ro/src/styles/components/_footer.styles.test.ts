import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import postcss from "postcss";
import {compile} from "sass";
import {describe, expect, it} from "vitest";

const stylesheetPath = resolve(dirname(fileURLToPath(import.meta.url)), "_footer.scss");

describe("footer brand styles", () => {
  it("keeps the brand name contrasting and adds a non-color hover cue", () => {
    const root = postcss.parse(compile(stylesheetPath).css);
    const normalDeclarations = new Map<string, string>();
    const hoverDeclarations = new Map<string, string>();

    root.walkRules(".footer__brand-name", (rule) => {
      rule.walkDecls((declaration) => {
        normalDeclarations.set(declaration.prop, declaration.value);
      });
    });
    root.walkRules(/\.footer__brand-link:hover \.footer__brand-name/u, (rule) => {
      rule.walkDecls((declaration) => {
        hoverDeclarations.set(declaration.prop, declaration.value);
      });
    });

    expect(normalDeclarations.get("color")).toBe("hsl(var(--aro-primary-foreground, var(--primary-foreground)))");
    expect(hoverDeclarations.get("color")).toBeUndefined();
    expect(hoverDeclarations.get("text-decoration")).toBe("underline");
  });
});

describe("footer toolbar tint styles", () => {
  it("pins a footer-colored strip to the viewport bottom edge while the footer is on screen", () => {
    const root = postcss.parse(compile(stylesheetPath).css);
    const declarations = new Map<string, string>();

    root.walkRules(".footer__toolbar-tint", (rule) => {
      rule.walkDecls((declaration) => {
        declarations.set(declaration.prop, declaration.value);
      });
    });

    // iOS Safari only samples fixed/sticky boxes taller than 10px that span the viewport width.
    expect(declarations.get("position")).toBe("sticky");
    expect(declarations.get("bottom")).toBe("0");
    expect(declarations.get("width")).toBe("100%");
    expect(declarations.get("height")).toBe("calc(0.75rem + env(safe-area-inset-bottom, 0px))");
    expect(declarations.get("background-color")).toBe("hsl(var(--footer-bg))");
    expect(declarations.get("z-index")).toBe("-1");
    expect(declarations.get("pointer-events")).toBe("none");
  });
});
