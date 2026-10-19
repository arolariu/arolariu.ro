import {transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import {describe, expect, expectTypeOf, it} from "vitest";

import type {ButtonGroupTextProps} from "./button-group";
import type {CollapsibleTrigger} from "./collapsible";
import type {InputOTPSlot, InputOTPSeparator} from "./input-otp";
import type {RadioGroupItem} from "./radio-group";
import type {Switch} from "./switch";

/** CSS contract checks, not browser geometry, contrast, or assistive-technology proof. */
function stylesheet(family: string): ReturnType<typeof parse> {
  return parse(
    new TextDecoder().decode(
      transform({
        filename: `${family}.module.css`,
        code: readFileSync(join(import.meta.dirname, `${family}.module.css`)),
        targets: {chrome: 100 << 16},
      }).code,
    ),
  );
}

function declarations(family: string, selector: string, media?: string): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  stylesheet(family).walkRules((rule) => {
    if (
      !rule.selector
        .split(",")
        .map((part) => part.trim())
        .includes(selector)
    )
      return;
    const owner = rule.parent;
    const matchesMedia =
      media === undefined ? owner?.type === "root" : owner?.type === "atrule" && owner.name === "media" && owner.params === media;
    if (matchesMedia)
      rule.walkDecls((decl) => {
        result.set(decl.prop, decl.value);
      });
  });
  return result;
}

type ButtonTheme = "light" | "dark";
type RGBA = readonly [red: number, green: number, blue: number, alpha: number];

function resolveButtonColors(value: string, theme: ButtonTheme): string {
  const tokens = new Map<string, string>();
  parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
    const isDark = rule.selector.split(",").some((selector) => selector.trim() === '[data-theme="dark"]');
    if (rule.selector !== ":root" && !(theme === "dark" && isDark)) return;
    rule.walkDecls((declaration) => {
      tokens.set(declaration.prop, declaration.value);
    });
  });
  return value.replace(/var\((--ac-[\w-]+)\)/gu, (_match, token: string) => {
    const color = tokens.get(token);
    if (!color) throw new Error(`Missing ${theme} Button color token: ${token}`);
    return color;
  });
}

/** Evaluate the compiler's sRGB fallback, not a native browser's gamut mapping or rasterization. */
function fallbackColor(value: string): RGBA {
  const compiled = transform({
    filename: "button-color.css",
    code: new TextEncoder().encode(`.probe { color: ${value}; }`),
    targets: {chrome: 100 << 16},
    minify: true,
  });
  const match = /color:#([\da-f]{3,8})(?:;|\})/iu.exec(new TextDecoder().decode(compiled.code));
  if (!match?.[1]) throw new Error(`Expected a compiled sRGB fallback for ${value}`);
  const shortHex = match[1];
  const hex = shortHex.length <= 4 ? [...shortHex].map((digit) => digit + digit).join("") : shortHex;
  const channel = (index: number): number => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16) / 255;
  return [channel(0), channel(1), channel(2), hex.length === 8 ? channel(3) : 1];
}

function compositeColor(color: RGBA, backdrop: RGBA): RGBA {
  const alpha = color[3];
  return [
    color[0] * alpha + backdrop[0] * (1 - alpha),
    color[1] * alpha + backdrop[1] * (1 - alpha),
    color[2] * alpha + backdrop[2] * (1 - alpha),
    1,
  ];
}

function colorContrast(first: RGBA, second: RGBA): number {
  const luminance = ([red, green, blue]: RGBA): number => {
    const linear = (channel: number): number => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each(["light", "dark"] as const)("%s destructive Button hover", (theme) => {
  function colors(): Readonly<{foreground: RGBA; normal: RGBA; hover: RGBA; backdrop: RGBA}> {
    const base = declarations("button", ".destructive");
    const hover = declarations("button", ".destructive:hover:not([data-disabled])", "(hover: hover)");
    const resolveColor = (value: string | undefined): RGBA => {
      if (!value) throw new Error("Missing destructive Button color declaration.");
      return fallbackColor(resolveButtonColors(value, theme));
    };
    return {
      foreground: resolveColor(base.get("color")),
      normal: resolveColor(base.get("background-color")),
      hover: resolveColor(hover.get("background-color")),
      backdrop: resolveColor("var(--ac-background)"),
    };
  }

  it("keeps the enabled hover surface opaque instead of depending on the ancestor color", () => {
    expect(colors().hover[3]).toBe(1);
  });

  it("retains 4.5:1 ordinary-text contrast in normal and hovered sRGB fallback states", () => {
    const {foreground, normal, hover, backdrop} = colors();
    expect(colorContrast(foreground, compositeColor(normal, backdrop))).toBeGreaterThanOrEqual(4.5);
    expect(colorContrast(foreground, compositeColor(hover, backdrop))).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each(["light", "dark"] as const)("%s essential selection visuals", (theme) => {
  const resolveColor = (value: string): RGBA => fallbackColor(resolveButtonColors(value, theme));
  function border(family: string, selector: string): RGBA {
    const rule = declarations(family, selector);
    const value = rule.get("border-color") ?? rule.get("border");
    const token = value?.match(/var\(--ac-[\w-]+\)/u)?.[0];
    if (!token) throw new Error(`Missing ${family} ${selector} border color.`);
    return resolveColor(token);
  }

  it.each([".checkbox", ".checkbox[data-checked]", ".checkbox[data-indeterminate]"])(
    "keeps the checkbox boundary distinguishable against the page in %s",
    (selector) => {
      expect(colorContrast(border("checkbox", selector), resolveColor("var(--ac-background)"))).toBeGreaterThanOrEqual(3);
    },
  );

  it.each([".checkbox[data-checked]", ".checkbox[data-indeterminate]"])(
    "keeps the checkbox glyph distinguishable from its selected fill in %s",
    (selector) => {
      const rule = declarations("checkbox", selector);
      expect(colorContrast(resolveColor(rule.get("color") ?? ""), resolveColor(rule.get("background-color") ?? ""))).toBeGreaterThanOrEqual(
        3,
      );
    },
  );

  it("keeps both the radio boundary and its currentcolor selection dot distinguishable from the input fill", () => {
    const rule = declarations("radio-group", ".item");
    const background = resolveColor(rule.get("background-color") ?? "");
    expect(colorContrast(border("radio-group", ".item"), background)).toBeGreaterThanOrEqual(3);
    expect(declarations("radio-group", ".icon").get("fill")).toBe("currentColor");
    expect(colorContrast(resolveColor(rule.get("color") ?? ""), background)).toBeGreaterThanOrEqual(3);
  });

  it.each(["normal", "hover"] as const)("retains a distinguishable pressed toggle marker during %s", (state) => {
    const pressed = declarations("toggle", ".root[data-pressed]");
    const hover = declarations("toggle", ".root:not([data-disabled]):hover");
    const surface = state === "hover" ? hover.get("background-color") : pressed.get("background-color");
    const marker = border("toggle", ".root[data-pressed]");
    expect(colorContrast(marker, resolveColor(surface ?? ""))).toBeGreaterThanOrEqual(3);
    expect(colorContrast(marker, resolveColor("var(--ac-background)"))).toBeGreaterThanOrEqual(3);
    expect(hover.has("border-color")).toBe(false);
  });
});

describe("Controls accessibility CSS contracts", () => {
  it("removes slot adapters and ignored children from public composition contracts", () => {
    expectTypeOf<ButtonGroupTextProps>().not.toHaveProperty("asChild");
    expectTypeOf<CollapsibleTrigger.Props>().not.toHaveProperty("asChild");
    expectTypeOf<InputOTPSlot.Props>().not.toHaveProperty("children");
    expectTypeOf<InputOTPSeparator.Props>().not.toHaveProperty("children");
    expectTypeOf<RadioGroupItem.Props>().not.toHaveProperty("children");
    expectTypeOf<Switch.Props>().not.toHaveProperty("children");
  });
  it.each([
    "accordion",
    "button",
    "button-group",
    "checkbox",
    "checkbox-group",
    "input",
    "input-group",
    "input-otp",
    "textarea",
    "native-select",
    "number-field",
    "radio-group",
    "switch",
    "select",
    "combobox",
    "slider",
    "toggle",
    "toggle-group",
    "toolbar",
    "field",
    "form",
    "meter",
    "progress",
    "collapsible",
    "tabs",
  ])("%s keeps accessibility media independent of hover and motion preferences", (family) => {
    const authored = parse(readFileSync(join(import.meta.dirname, `${family}.module.css`), "utf8"));
    authored.walkAtRules("media", (query) => {
      if (/forced-colors|prefers-reduced-motion/.test(query.params)) expect(query.parent?.type).toBe("root");
    });
  });
  it.each([
    ["checkbox", ".checkbox"],
    ["radio-group", ".item"],
    ["switch", ".root"],
    ["slider", ".thumb"],
    ["button", ".button"],
    ["toolbar", ".item"],
    ["collapsible", ".trigger"],
    ["combobox", ".trigger"],
  ])("%s provides 24px CSS target minima without relying on consumer spacing", (family, selector) => {
    const rule = declarations(family, selector);
    expect(rule.get("min-inline-size") ?? rule.get("min-width")).toBe("24px");
    expect(rule.get("min-block-size") ?? rule.get("min-height")).toBe("24px");
  });

  it.each(["button", "accordion", "select", "number-field", "toolbar", "meter", "collapsible"])(
    "%s retains visible controls/state when forced colors suppress authored backgrounds and shadows",
    (family) => {
      let hasForcedColors = false;
      stylesheet(family).walkAtRules("media", (rule) => {
        if (rule.params === "(forced-colors: active)") hasForcedColors = true;
      });
      expect(hasForcedColors).toBe(true);
    },
  );

  it.each([
    ["number-field", ".group"],
    ["toolbar", ".item"],
    ["meter", ".indicator"],
  ])("%s removes its transitions for reduced motion", (family, selector) => {
    expect(declarations(family, selector, "(prefers-reduced-motion: reduce)").get("transition")).toBe("none");
  });

  it.each([
    ["button", ".button:focus-visible"],
    ["accordion", ".trigger:focus-visible"],
    ["select", ".trigger:focus-visible"],
    ["number-field", ".stepper:focus-visible"],
    ["toolbar", ".item:focus-visible"],
    ["collapsible", ".trigger:focus-visible"],
  ])("%s uses a system highlight for forced-colors focus", (family, selector) => {
    expect(declarations(family, selector, "(forced-colors: active)").get("outline-color")?.toLowerCase()).toBe("highlight");
  });

  it.each(["select", "combobox"])("%s highlights the active option with a contrasting outline, not just a pale background", (family) => {
    const highlighted = declarations(family, ".item[data-highlighted]");
    expect(highlighted.get("outline")).toBe("2px solid var(--ac-ring)");
    expect(highlighted.get("outline-offset")).toBe("-2px");
  });

  it("preserves a visible pressed toggle state during hover", () => {
    expect(declarations("toggle", ".root[data-pressed]").get("border-color")).toBe("var(--ac-ring)");
  });

  it.each([
    ["button", ".sizeDefault"],
    ["button", ".sizeXs"],
    ["button", ".sizeSm"],
    ["button", ".sizeLg"],
    ["toggle", ".sizeDefault"],
    ["toggle", ".sizeSm"],
    ["toggle", ".sizeLg"],
  ])("%s %s lets text expand vertically instead of fixing a potentially clipping height", (family, selector) => {
    const rule = declarations(family, selector);
    expect(rule.has("height")).toBe(false);
    expect(rule.has("block-size")).toBe(false);
    expect(rule.get("min-block-size")).toBeDefined();
  });
});

/** Compiled CSS contract for native `<a className={buttonVariants()}>` links; UA link styles themselves are browser-owned. */
describe("Native links styled with buttonVariants", () => {
  it("resets the user-agent link underline on the shared button base", () => {
    expect(declarations("button", ".button").get("text-decoration")).toBe("none");
    expect(declarations("button", ".button:any-link").size).toBe(0);
  });

  it.each([".default", ".destructive", ".outline", ".secondary", ".ghost"])(
    "%s adds no underline at rest, as a real link, or on hover, so styled links match the button preset",
    (variant) => {
      expect(declarations("button", variant).has("text-decoration")).toBe(false);
      expect(declarations("button", `${variant}:any-link`).size).toBe(0);
      expect(declarations("button", `${variant}:hover:not([data-disabled])`, "(hover: hover)").has("text-decoration")).toBe(false);
    },
  );

  it("underlines real links with the link preset at rest (WCAG 1.4.1) at the hover underline's offset", () => {
    const preset = declarations("button", ".link");
    // A <button> never matches :any-link, so <Button variant="link"> keeps no rest underline.
    expect(preset.has("text-decoration")).toBe(false);
    expect(preset.get("text-underline-offset")).toBe("4px");
    // Unconditional (root-level, not hover-gated) and above the single-class base reset in specificity.
    const realLink = declarations("button", ".link:any-link");
    expect(realLink.get("text-decoration")).toBe("underline");
    expect(realLink.has("text-underline-offset")).toBe(false);
    expect(declarations("button", ".link:hover:not([data-disabled])", "(hover: hover)").get("text-decoration")).toBe("underline");
  });

  it("leaves focus-visible and forced-colors presentation unchanged", () => {
    const focus = declarations("button", ".button:focus-visible");
    expect(focus.get("outline")).toBe("2px solid var(--ac-ring)");
    expect(focus.get("outline-offset")).toBe("-1px");
    const forcedFocus = declarations("button", ".button:focus-visible", "(forced-colors: active)");
    expect(forcedFocus.get("outline-color")?.toLowerCase()).toBe("highlight");
    expect(forcedFocus.get("outline-offset")).toBe("2px");
    const forced = declarations("button", ".button", "(forced-colors: active)");
    expect(forced.get("border")?.toLowerCase()).toBe("1px solid buttontext");
    expect(forced.get("color")?.toLowerCase()).toBe("buttontext");
    expect(forced.get("background-color")?.toLowerCase()).toBe("buttonface");
    expect(forced.get("box-shadow")).toBe("none");
    for (const rule of [focus, forcedFocus, forced]) expect(rule.has("text-decoration")).toBe(false);
  });
});
