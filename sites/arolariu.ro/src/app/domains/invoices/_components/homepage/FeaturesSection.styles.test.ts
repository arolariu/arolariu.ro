import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import postcss from "postcss";
import {compile} from "sass";
import {describe, expect, it} from "vitest";

const stylesheetPath = resolve(dirname(fileURLToPath(import.meta.url)), "FeaturesSection.module.scss");

describe("FeaturesSection styles", () => {
  it("uses primary-foreground text on the primary sign-in prompt background", () => {
    const root = postcss.parse(compile(stylesheetPath).css);
    const declarations = new Map<string, string>();

    root.walkRules(".signInPromptText", (rule) => {
      rule.walkDecls((declaration) => {
        declarations.set(declaration.prop, declaration.value);
      });
    });

    expect(declarations.get("color")).toBe("hsl(var(--aro-primary-foreground, var(--primary-foreground)))");
  });
});
