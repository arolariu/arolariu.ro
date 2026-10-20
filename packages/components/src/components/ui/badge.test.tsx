import {mergeProps} from "@base-ui/react/merge-props";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef} from "react";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type ChildNode, type Node as CssNode} from "postcss";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it, vi} from "vitest";

import {Badge, badgeVariants} from "./badge";
import styles from "./badge.module.css";
import * as stories from "./badge.stories";

const {CallbackRender, Ghost, Large, Link, WithDot} = composeStories(stories);

// Lower real native CSS nesting before matching against emitted CSS Module roots.
// A nested selector's raw text is not its effective selector or media ancestry.
const compiledBadgeCss = parse(
  transform({
    filename: "badge.module.css",
    code: readFileSync(join(import.meta.dirname, "badge.module.css")),
    include: Features.Nesting,
    targets: {chrome: 100 << 16},
  }).code.toString(),
);
const badgeVariantsUnderReview = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;

function mediaApplies(node: ChildNode, hover: boolean, forcedColors: boolean): boolean {
  for (let ancestor: CssNode | undefined = node.parent; ancestor; ancestor = ancestor.parent) {
    if (!(ancestor instanceof AtRule)) continue;
    if (ancestor.name !== "media") throw new Error(`Unexpected compiled conditional: ${ancestor.name}`);
    const condition = ancestor.params.replace(/\s/gu, "");
    if (condition === "(hover:hover)" && !hover) return false;
    if (condition === "(forced-colors:active)" && !forcedColors) return false;
    if (condition === "(prefers-reduced-motion:reduce)") return false;
    if (!["(hover:hover)", "(forced-colors:active)", "(prefers-reduced-motion:reduce)"].includes(condition)) {
      throw new Error(`Unhandled compiled media condition: ${ancestor.params}`);
    }
  }
  return true;
}

function compiledDeclarations(target: HTMLElement, hover: boolean, forcedColors: boolean): Record<string, string> {
  const declarations: Record<string, string> = {};
  compiledBadgeCss.walkRules((rule) => {
    if (rule.parent?.type === "rule") throw new Error("Nesting compiler left a nested selector");
    const selector = rule.selector
      .replace(/\.([a-z][\w-]*)/giu, (_, name: string) => `.${CSS.escape(requiredClass(name))}`)
      .replace(/:hover\b/gu, hover ? "" : ":not(*)");
    if (!mediaApplies(rule, hover, forcedColors) || !target.matches(selector)) return;
    rule.walkDecls((decl) => {
      declarations[decl.prop] = decl.value;
      if (decl.prop !== "border" && decl.prop !== "outline") return;
      // Model these authored shorthands as well as longhands: a later variant
      // border must not leave an earlier forced-color declaration falsely active.
      // Happy DOM's CSSStyleDeclaration rejects CanvasText/Highlight, so assert
      // the real compiler's values rather than claiming emulated system paint.
      const color = /var\(--ac-[\w-]+\)|#[\da-f]{3,8}\b|canvastext\b|highlight\b/iu.exec(decl.value);
      if (!color && decl.value !== "none") throw new Error(`Unhandled compiled ${decl.prop} shorthand: ${decl.value}`);
      declarations[`${decl.prop}-color`] = color?.[0] ?? "currentcolor";
    });
  });
  return declarations;
}

type Theme = "light" | "dark";
type Rgba = readonly [number, number, number, number];
const themeTokens: Record<Theme, Record<string, string>> = {light: {}, dark: {}};
parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
  const theme = rule.selector === ":root" ? "light" : rule.selector.includes('[data-theme="dark"]') ? "dark" : undefined;
  if (theme) rule.walkDecls((decl) => void (themeTokens[theme][decl.prop] = decl.value));
});

// Evaluate the authored recipe with the real CSS compiler's sRGB fallback,
// then composite translucent paint in encoded sRGB over the default canvas.
// Native gamut mapping and consumer themes remain browser verification work.
function recipeColor(value: string | undefined, theme: Theme): Rgba {
  if (!value) throw new Error("Missing authored Badge paint");
  const resolved = value.replace(/var\((--ac-[\w-]+)\)/gu, (_, token: string): string => {
    const color = themeTokens[theme][token];
    if (!color) throw new Error(`Missing ${theme} token ${token}`);
    return color;
  });
  const output = transform({
    filename: "badge-contrast.css",
    code: Buffer.from(`.paint { color: ${resolved}; }`),
    targets: {chrome: 100 << 16},
  }).code.toString();
  const hex = /color:\s*#([\da-f]+);/iu.exec(output)?.[1];
  if (!hex) throw new Error(`Missing compiled sRGB paint: ${output}`);
  const expanded = hex.length <= 4 ? [...hex].map((digit) => digit.repeat(2)).join("") : hex;
  if (expanded.length !== 6 && expanded.length !== 8) throw new Error(`Unexpected sRGB paint: ${hex}`);
  const channel = (offset: number): number => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255;
  return [channel(0), channel(2), channel(4), expanded.length === 8 ? channel(6) : 1];
}

function composite(paint: Rgba, canvas: Rgba): Rgba {
  const alpha = paint[3];
  return [
    paint[0] * alpha + canvas[0] * (1 - alpha),
    paint[1] * alpha + canvas[1] * (1 - alpha),
    paint[2] * alpha + canvas[2] * (1 - alpha),
    1,
  ];
}

function textContrast(first: Rgba, second: Rgba): number {
  const luminance = ([red, green, blue]: Rgba): number => {
    const linear = (channel: number): number => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each(["light", "dark"] as const)("authored destructive Badge in %s defaults", (theme) => {
  it.each([false, true])("keeps ordinary text at 4.5:1 with hover=%s after canvas compositing", (hover) => {
    render(
      <Badge
        variant='destructive'
        render={<button type='button' />}>
        Delete
      </Badge>,
    );
    const root = screen.getByRole("button", {name: "Delete"});
    const state = compiledDeclarations(root, hover, false);
    const background = composite(recipeColor(state["background-color"], theme), recipeColor("var(--ac-background)", theme));
    const foreground = composite(recipeColor(state["color"], theme), background);
    expect(textContrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("review correction: compiled Badge link text", () => {
  it.each([false, true])("paints the contrast-verified primary emphasis token on a transparent surface with hover=%s", (hover) => {
    render(
      <Badge
        variant='link'
        render={<a href='#release-notes' />}>
        Release notes
      </Badge>,
    );
    const state = compiledDeclarations(screen.getByRole("link", {name: "Release notes"}), hover, false);
    // The link badge paints no surface, so its 12px text sits on the page background; `styles.test.ts`
    // keeps `--ac-primary-emphasis` at 4.5:1 on `--ac-background` in both default themes.
    expect(state["color"]).toBe("var(--ac-primary-emphasis)");
    expect(recipeColor(state["background-color"], "light")[3]).toBe(0);
  });
});

type Oklch = readonly [lightness: number, chroma: number, hue: number];
type ModelPaint = Readonly<{color: Oklch; alpha: number}>;
type EncodedRgb = readonly [red: number, green: number, blue: number];

function oklchToken(theme: Theme, token: string): Oklch {
  const value = themeTokens[theme][token];
  const match = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/u.exec(value ?? "");
  if (!match) throw new Error(`Missing opaque ${theme} token ${token}: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// `color-mix(in oklch, …)` of opaque colours: shorter-arc hue, and an achromatic hue (C = 0) is powerless.
function mixOklch(first: Oklch, second: Oklch, firstWeight: number): Oklch {
  let firstHue = first[1] === 0 ? second[2] : first[2];
  let secondHue = second[1] === 0 ? first[2] : second[2];
  if (secondHue - firstHue > 180) firstHue += 360;
  else if (firstHue - secondHue > 180) secondHue += 360;
  const mix = (a: number, b: number): number => a * firstWeight + b * (1 - firstWeight);
  return [mix(first[0], second[0]), mix(first[1], second[1]), mix(firstHue, secondHue) % 360];
}

/** Resolves compiled paint: a token, `transparent`, or a two-operand `color-mix(in oklch, …)`. */
function modelPaint(value: string | undefined, theme: Theme): ModelPaint {
  if (!value) throw new Error("Missing compiled Badge paint");
  const operand = (text: string): ModelPaint => {
    if (text === "transparent" || text === "#0000") return {color: [0, 0, 0], alpha: 0};
    const token = /^var\((--ac-[\w-]+)\)$/u.exec(text)?.[1];
    if (!token) throw new Error(`Unmodelled Badge paint: ${text}`);
    return {color: oklchToken(theme, token), alpha: 1};
  };
  const mixed = /^color-mix\(in oklch, (.+?)(?: (\d+)%)?, (.+?)(?: (\d+)%)?\)$/u.exec(value);
  if (!mixed?.[1] || !mixed[3]) return operand(value);
  if (mixed[2] && mixed[4] && Number(mixed[2]) + Number(mixed[4]) !== 100) throw new Error(`Unmodelled color-mix weights: ${value}`);
  const firstWeight = (mixed[2] ? Number(mixed[2]) : mixed[4] ? 100 - Number(mixed[4]) : 50) / 100;
  const first = operand(mixed[1]);
  const second = operand(mixed[3]);
  // Premultiplied interpolation with `transparent` keeps the colour and scales its alpha.
  if (second.alpha === 0) return {color: first.color, alpha: firstWeight * first.alpha};
  if (first.alpha !== 1 || second.alpha !== 1) throw new Error(`Unmodelled translucent color-mix: ${value}`);
  return {color: mixOklch(first.color, second.color, firstWeight), alpha: 1};
}

// Same default-token model as `src/styles.test.ts`: OKLCH → clipped linear sRGB → WCAG luminance. Translucent
// paint composites in gamma-encoded sRGB, as browsers paint it; gamut mapping and consumer themes stay browser work.
function linearRgb([lightness, chroma, hueDegrees]: Oklch): EncodedRgb {
  const hue = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (channel: number): number => Math.max(0, Math.min(1, channel));
  return [
    clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const encodeSrgb = (channel: number): number => (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055);
const decodeSrgb = (channel: number): number => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

function paintOver(paint: ModelPaint, backdrop: EncodedRgb): EncodedRgb {
  const [red = 0, green = 0, blue = 0] = linearRgb(paint.color).map(encodeSrgb);
  const blend = (channel: number, under: number): number => channel * paint.alpha + under * (1 - paint.alpha);
  return [blend(red, backdrop[0]), blend(green, backdrop[1]), blend(blue, backdrop[2])];
}

function modelContrast(first: EncodedRgb, second: EncodedRgb): number {
  const luminance = (rgb: EncodedRgb): number => {
    const [red = 0, green = 0, blue = 0] = rgb.map(decodeSrgb);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each(["light", "dark"] as const)("review correction: compiled Badge text in %s defaults (token luminance model)", (theme) => {
  it.each(badgeVariantsUnderReview.flatMap((variant) => [[variant, false] as const, [variant, true] as const]))(
    "keeps %s text at 4.5:1 on its compiled surface with hover=%s",
    (variant, hover) => {
      render(
        <Badge
          variant={variant}
          render={<button type='button' />}>
          {variant}
        </Badge>,
      );
      const state = compiledDeclarations(screen.getByRole("button", {name: variant}), hover, false);
      const page = paintOver(modelPaint("var(--ac-background)", theme), [0, 0, 0]);
      const surface = paintOver(modelPaint(state["background-color"], theme), page);
      const text = paintOver(modelPaint(state["color"], theme), surface);
      expect(modelContrast(text, surface)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe.each([
  ["button", false],
  ["button", true],
  ["link", false],
  ["link", true],
] as const)("review correction: compiled Badge %s root with hover=%s", (role, hover) => {
  function fixture(): React.ReactElement {
    return (
      <>
        {badgeVariantsUnderReview.map((variant) => (
          <Badge
            key={variant}
            variant={variant}
            render={role === "link" ? <a href='#details' /> : <button type='button' />}>
            {variant}
          </Badge>
        ))}
      </>
    );
  }

  it("applies the minimum control target to every variant without a destructive ancestor", () => {
    render(fixture());
    for (const variant of badgeVariantsUnderReview) {
      const root = screen.getByRole(role, {name: variant});
      expect(root.parentElement).not.toHaveClass(requiredClass("destructive"));
      expect(compiledDeclarations(root, hover, false)).toMatchObject({"min-inline-size": "24px", "min-block-size": "24px"});
    }
  });

  it("applies independent forced-color boundary and focus rules to every variant", () => {
    render(fixture());
    for (const variant of badgeVariantsUnderReview) {
      const root = screen.getByRole(role, {name: variant});
      root.focus();
      expect(root).toHaveFocus();
      const normal = compiledDeclarations(root, hover, false);
      const forced = compiledDeclarations(root, hover, true);
      expect(normal["border-color"]?.toLowerCase()).not.toBe("canvastext");
      expect(forced["border-color"]?.toLowerCase()).toBe("canvastext");
      expect(forced["outline-color"]?.toLowerCase()).toBe("highlight");
    }
  });
});

function requiredClass(name: string): string {
  const className = styles[name];
  if (typeof className !== "string" || className.trim().length === 0) {
    throw new Error(`Missing CSS Module class: ${name}`);
  }
  return className;
}

// Consumer fixture: the provided merged ref must spread onto a native anchor.
function BadgeAnchorConsumer({anchorRef}: Readonly<{anchorRef: React.Ref<HTMLAnchorElement>}>): React.ReactElement {
  return (
    <Badge
      ref={anchorRef}
      variant='link'
      onClick={(event) => event.preventDefault()}
      render={(props, state) => (
        <a
          {...props}
          href='#destination'
          aria-label={`${state.slot}-${state.variant}`}
        />
      )}>
      Navigate
    </Badge>
  );
}

const badgeVariantsToTest = [
  ["default", requiredClass("default")],
  ["secondary", requiredClass("secondary")],
  ["destructive", requiredClass("destructive")],
  ["outline", requiredClass("outline")],
  ["ghost", requiredClass("ghost")],
  ["link", requiredClass("link")],
] as const;

describe("Badge", () => {
  it("renders the canonical inline span with slot and variant metadata", () => {
    render(<Badge>Content</Badge>);

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Content").tagName).toBe("SPAN");
    expect(screen.getByText("Content")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByText("Content")).toHaveAttribute("data-variant", "default");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSpanElement>();

    render(<Badge ref={ref}>Content</Badge>);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Badge className='custom-badge'>Content</Badge>);

    const badge = screen.getByText("Content");

    expect(badge).toHaveClass("custom-badge");
    expect(badge.className).not.toBe("custom-badge");
  });

  it("renders children", () => {
    render(
      <Badge>
        <span>Beta</span>
      </Badge>,
    );

    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it.each(badgeVariantsToTest)("applies the %s variant styles", (variant, expectedClassName) => {
    render(<Badge variant={variant}>Status</Badge>);

    const badge = screen.getByText("Status");

    expect(badge).toHaveClass(expectedClassName);
    expect(badge).toHaveClass(requiredClass("badge"));
    expect(badge).toHaveAttribute("data-variant", variant);
  });

  it("forwards accessibility attributes", () => {
    render(
      <Badge
        aria-label='Status badge'
        aria-live='polite'>
        Online
      </Badge>,
    );

    const badge = screen.getByText("Online");

    expect(badge).toHaveAttribute("aria-label", "Status badge");
    expect(badge).toHaveAttribute("aria-live", "polite");
  });

  it("generates default and customized classes without rendering", () => {
    expect(badgeVariants()).toContain(requiredClass("badge"));
    expect(badgeVariants()).toContain(requiredClass("default"));
    expect(badgeVariants({variant: "ghost", className: "consumer"})).toContain(requiredClass("ghost"));
    expect(badgeVariants({variant: "link", className: "consumer"})).toContain(requiredClass("link"));
    expect(badgeVariants({className: "consumer"})).toContain("consumer");
  });

  it("composes navigation, child content, both refs, classes, and event handlers", async () => {
    const user = userEvent.setup();
    const wrapperRef = createRef<HTMLAnchorElement>();
    const childRef = createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <Badge
        ref={wrapperRef}
        variant='link'
        className='wrapper'
        onClick={() => calls.push("wrapper")}
        render={
          <a
            href='#release'
            ref={childRef}
            className='child'
            onClick={(event) => {
              event.preventDefault();
              calls.push("child");
            }}>
            Release notes
          </a>
        }>
        Fallback
      </Badge>,
    );
    const link = screen.getByRole("link", {name: "Release notes"});
    expect(link).toHaveAttribute("href", "#release");
    expect(link).toHaveClass(requiredClass("badge"), requiredClass("link"), "wrapper", "child");
    expect(screen.queryByText("Fallback")).not.toBeInTheDocument();
    expect(wrapperRef.current).toBe(link);
    expect(childRef.current).toBe(link);
    await user.click(link);
    expect(calls).toEqual(["child", "wrapper"]);
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("preserves wrapper content for empty render elements", () => {
    render(<Badge render={<a href='#beta' />}>Beta</Badge>);
    expect(screen.getByRole("link", {name: "Beta"})).toBeInTheDocument();
  });

  it("accepts anchor callback consumer props and forwards the correct anchor ref", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLAnchorElement>();
    const {unmount} = render(<BadgeAnchorConsumer anchorRef={ref} />);
    const link = screen.getByRole("link", {name: "badge-link"});

    expect(ref.current).toBe(link);
    expect(ref.current?.hash).toBe("#destination");
    expect(link).toHaveTextContent("Navigate");
    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(link).toHaveAttribute("href", "#destination");
    unmount();
    expect(ref.current).toBeNull();
  });

  it("evaluates callback renders with current badge state and forwarded props", () => {
    const ref = createRef<HTMLSpanElement>();
    const renderBadge: Exclude<React.ComponentProps<typeof Badge>["render"], React.ReactElement | undefined> = (props, state) => (
      <span
        {...props}
        aria-label={`${state.slot}-${state.variant}`}
      />
    );
    const {rerender} = render(
      <Badge
        ref={ref}
        variant='outline'
        render={renderBadge}>
        Preview
      </Badge>,
    );
    expect(screen.getByLabelText("badge-outline")).toHaveTextContent("Preview");
    expect(ref.current).toBe(screen.getByLabelText("badge-outline"));
    rerender(
      <Badge
        ref={ref}
        variant='ghost'
        render={renderBadge}>
        Updated
      </Badge>,
    );
    expect(screen.getByLabelText("badge-ghost")).toHaveTextContent("Updated");
    expect(ref.current).toBe(screen.getByLabelText("badge-ghost"));
  });

  it("allows a rendered child's event to cancel the wrapper handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Badge
        onClick={onClick}
        render={
          <a
            href='#release'
            {...mergeProps<"a">(
              {},
              {
                onClick: (event) => {
                  event.preventDefault();
                  event.preventBaseUIHandler();
                },
              },
            )}
          />
        }>
        Release
      </Badge>,
    );
    await user.click(screen.getByRole("link", {name: "Release"}));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders the real new variant and callback stories", () => {
    render(
      <>
        <Ghost />
        <Link />
        <CallbackRender />
      </>,
    );
    expect(screen.getByText("Ghost")).toHaveClass(requiredClass("ghost"));
    expect(screen.getByRole("link", {name: "Release notes"})).toHaveAttribute("href", "#release-notes");
    expect(screen.getByLabelText("outline badge")).toHaveTextContent("Preview");
  });

  it("renders real status and size stories with mounted story-owned styling", () => {
    render(
      <>
        <WithDot />
        <Large />
      </>,
    );
    expect(screen.getByText("Active").querySelector("span")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Large Default")).toHaveClass("ac-story-badge-storyLarge");
    expect(getComputedStyle(screen.getByText("Active").querySelector("span") as HTMLElement).borderRadius).toBe("50%");
  });
});
