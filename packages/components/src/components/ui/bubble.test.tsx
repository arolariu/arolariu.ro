import {fireEvent, getRoles, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type Node as CssNode, type Root} from "postcss";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, expectTypeOf, it} from "vitest";

import {Bubble, BubbleContent, BubbleGroup, BubbleReactions} from "./bubble";
import styles from "./bubble.module.css";
import * as stories from "./bubble.stories";
import {buttonVariants} from "./button";
import buttonStyles from "./button.module.css";

const {ErrorStates} = composeStories(stories);

const css = parse(readFileSync(join(import.meta.dirname, "bubble.module.css"), "utf8"));
function cssClass(name: string): string {
  const value = styles[name];
  if (!value) throw new Error(`Missing bubble class: ${name}`);
  return value;
}

function declarations(selector: string): Record<string, string> {
  const result: Record<string, string> = {};
  css.walkRules(selector, (rule) => rule.walkDecls((declaration) => void (result[declaration.prop] = declaration.value)));
  return result;
}

type Theme = "light" | "dark";
type Rgba = readonly [number, number, number, number];
const themeTokens: Record<Theme, Record<string, string>> = {light: {}, dark: {}};
parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
  const theme = rule.selector === ":root" ? "light" : rule.selector.includes('[data-theme="dark"]') ? "dark" : undefined;
  if (theme) rule.walkDecls((decl) => void (themeTokens[theme][decl.prop] = decl.value));
});

function authoredPaint(target: HTMLElement, hover: boolean): Record<string, string> {
  const result: Record<string, string> = {};
  css.walkRules((rule) => {
    for (let ancestor: CssNode | undefined = rule.parent; ancestor; ancestor = ancestor.parent) {
      if (!(ancestor instanceof AtRule)) continue;
      if (ancestor.name !== "media" || ancestor.params !== "(hover: hover)" || !hover) return;
    }
    const selector = rule.selector
      .replace(/:global\(([^)]+)\)/gu, "$1")
      .replace(/\.([a-z][\w-]*)/giu, (_, name: string) => `.${CSS.escape(cssClass(name))}`)
      .replace(/:hover\b/gu, hover ? "" : ":not(*)");
    if (target.matches(selector)) rule.walkDecls((decl) => void (result[decl.prop] = decl.value));
  });
  return result;
}

// Use the real compiler to evaluate authored OKLCH mixes with live default
// tokens. Its sRGB fallback is a deterministic model, not native pixel proof.
function recipeColor(value: string | undefined, theme: Theme): Rgba {
  if (!value) throw new Error("Missing authored Bubble paint");
  const resolved = value.replace(/var\((--ac-[\w-]+)\)/gu, (_, token: string): string => {
    const color = themeTokens[theme][token];
    if (!color) throw new Error(`Missing ${theme} token ${token}`);
    return color;
  });
  const output = transform({
    filename: "bubble-contrast.css",
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

describe.each(["light", "dark"] as const)("authored destructive Bubble in %s defaults", (theme) => {
  it.each([
    ["text", false],
    ["text", true],
    ["button", false],
    ["button", true],
    ["link", false],
    ["link", true],
  ] as const)("keeps ordinary %s text at 4.5:1 with hover=%s", (kind, hover) => {
    render(
      <Bubble variant='destructive'>
        <BubbleContent render={kind === "button" ? <button type='button' /> : kind === "link" ? <a href='#details' /> : undefined}>
          Message could not be sent
        </BubbleContent>
      </Bubble>,
    );
    const target = screen.getByText("Message could not be sent");
    const state = authoredPaint(target, hover);
    const background = composite(recipeColor(state["background-color"], theme), recipeColor("var(--ac-background)", theme));
    const foreground = composite(recipeColor(state["color"], theme), background);
    expect(textContrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});

type Oklch = readonly [lightness: number, chroma: number, hue: number];
const bubbleVariants = ["default", "secondary", "muted", "tinted", "outline", "ghost", "destructive"] as const;

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

/** Resolves an authored opaque Bubble paint: one token or a two-token `color-mix(in oklch, …)`. */
function modelColor(value: string | undefined, theme: Theme): Oklch {
  if (!value) throw new Error("Missing authored Bubble paint");
  const token = /^var\((--ac-[\w-]+)\)$/u.exec(value)?.[1];
  if (token) return oklchToken(theme, token);
  const mixed = /^color-mix\(in oklch, var\((--ac-[\w-]+)\)(?: (\d+)%)?, var\((--ac-[\w-]+)\)(?: (\d+)%)?\)$/u.exec(value);
  if (!mixed?.[1] || !mixed[3]) throw new Error(`Unmodelled Bubble paint: ${value}`);
  const [firstPercent, secondPercent] = [mixed[2], mixed[4]].map((percent) => (percent === undefined ? undefined : Number(percent)));
  if (firstPercent !== undefined && secondPercent !== undefined && firstPercent + secondPercent !== 100) {
    throw new Error(`Unmodelled color-mix weights: ${value}`);
  }
  const firstWeight = (firstPercent ?? (secondPercent === undefined ? 50 : 100 - secondPercent)) / 100;
  return mixOklch(oklchToken(theme, mixed[1]), oklchToken(theme, mixed[3]), firstWeight);
}

/** A transparent or unpainted content surface shows the default page background. */
function surfaceColor(value: string | undefined, theme: Theme): Oklch {
  return value === undefined || value === "transparent" ? oklchToken(theme, "--ac-background") : modelColor(value, theme);
}

// Same default-token model as `src/styles.test.ts`: opaque OKLCH in clipped linear sRGB.
// Gamut mapping, consumer themes and actual painted pixels still need browser evaluation.
function modelLuminance([lightness, chroma, hueDegrees]: Oklch): number {
  const hue = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (channel: number): number => Math.max(0, Math.min(1, channel));
  return (
    0.2126 * clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
    + 0.7152 * clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
    + 0.0722 * clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  );
}

function modelContrast(first: Oklch, second: Oklch): number {
  const a = modelLuminance(first);
  const b = modelLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each(["light", "dark"] as const)("review correction: authored Bubble surfaces in %s defaults", (theme) => {
  it.each([
    ["text", false],
    ["text", true],
    ["button", false],
    ["button", true],
    ["link", false],
    ["link", true],
  ] as const)("keeps ordinary default-variant %s text at 4.5:1 with hover=%s", (kind, hover) => {
    render(
      <Bubble>
        <BubbleContent render={kind === "button" ? <button type='button' /> : kind === "link" ? <a href='#details' /> : undefined}>
          Message delivered
        </BubbleContent>
      </Bubble>,
    );
    const state = authoredPaint(screen.getByText("Message delivered"), hover);
    expect(modelContrast(modelColor(state["color"], theme), surfaceColor(state["background-color"], theme))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(bubbleVariants)("lets links nested in %s content inherit its 4.5:1 surface text colour with an underline", (variant) => {
    render(
      <Bubble variant={variant}>
        <BubbleContent>
          Read the <a href='#delivery-details'>delivery details</a>.
        </BubbleContent>
      </Bubble>,
    );
    const link = screen.getByRole("link", {name: "delivery details"});
    const content = link.parentElement;
    if (!content) throw new Error("Missing Bubble content");
    expect(content).toHaveClass(cssClass("content"));
    // Without an authored colour a nested link keeps the user agent's link colour on every surface.
    expect(authoredPaint(link, false)).toMatchObject({color: "inherit", "text-decoration": "underline"});
    const surface = authoredPaint(content, false);
    expect(modelContrast(modelColor(surface["color"], theme), surfaceColor(surface["background-color"], theme))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});

type Specificity = readonly [ids: number, classes: number, types: number];
type CompiledSheet = Readonly<{root: Root; classes: Readonly<Record<string, string>>}>;

// Lower real native CSS nesting so every compiled rule carries its effective selector and media.
function compileSheet(filename: string, code: Buffer | string, classes: Readonly<Record<string, string>>): CompiledSheet {
  return {
    root: parse(transform({filename, code: Buffer.from(code), include: Features.Nesting, targets: {chrome: 100 << 16}}).code.toString()),
    classes,
  };
}

const compiledBubble = compileSheet("bubble.module.css", readFileSync(join(import.meta.dirname, "bubble.module.css")), styles);
const compiledButton = compileSheet("button.module.css", readFileSync(join(import.meta.dirname, "button.module.css")), buttonStyles);
// An element-only consumer reset, as in `sites/arolariu.ro/src/styles/base/_reset.scss:90-92`, plus a competing link colour.
const elementReset = compileSheet("element-reset.css", "a { color: #0000ee; text-decoration: none; }", {});

/** Splits a selector list at top-level commas; commas inside `:is()` arguments stay together. */
function selectorList(list: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (const [index, character] of [...list].entries()) {
    if (character === "(" || character === "[") depth += 1;
    else if (character === ")" || character === "]") depth -= 1;
    else if (character === "," && depth === 0) {
      selectors.push(list.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(list.slice(start).trim());
  return selectors;
}

function compareSpecificity(first: Specificity, second: Specificity): number {
  return first[0] - second[0] || first[1] - second[1] || first[2] - second[2];
}

/** Selectors Level 4 specificity for the selector forms these stylesheets use. */
function specificity(selector: string): Specificity {
  const counts: [number, number, number] = [0, 0, 0];
  const nameEnd = (from: number): number => {
    let end = from;
    while (end < selector.length && /[\w-]/u.test(selector.charAt(end))) end += 1;
    return end;
  };
  let index = 0;
  while (index < selector.length) {
    const character = selector.charAt(index);
    if (character === "#" || character === ".") {
      counts[character === "#" ? 0 : 1] += 1;
      index = nameEnd(index + 1);
    } else if (character === "[") {
      const close = selector.indexOf("]", index);
      if (close < 0) throw new Error(`Unterminated attribute selector: ${selector}`);
      counts[1] += 1;
      index = close + 1;
    } else if (selector.startsWith("::", index)) {
      counts[2] += 1;
      index = nameEnd(index + 2);
    } else if (character === ":") {
      const end = nameEnd(index + 1);
      const name = selector.slice(index + 1, end);
      if (selector.charAt(end) !== "(") {
        counts[1] += 1;
        index = end;
        continue;
      }
      let depth = 0;
      let close = end;
      do {
        if (selector.charAt(close) === "(") depth += 1;
        if (selector.charAt(close) === ")") depth -= 1;
        close += 1;
      } while (depth > 0 && close < selector.length);
      // :is()/:not()/:has() take their most specific argument, :where() adds nothing, other functions count once.
      if (name === "is" || name === "not" || name === "has") {
        const strongest = selectorList(selector.slice(end + 1, close - 1))
          .map(specificity)
          .sort(compareSpecificity)
          .at(-1);
        counts[0] += strongest?.[0] ?? 0;
        counts[1] += strongest?.[1] ?? 0;
        counts[2] += strongest?.[2] ?? 0;
      } else if (name !== "where") counts[1] += 1;
      index = close;
    } else if (/[a-z]/iu.test(character)) {
      counts[2] += 1;
      index = nameEnd(index);
    } else {
      index += 1; // Whitespace, combinators and the universal selector add nothing.
    }
  }
  return counts;
}

/**
 * Rest-state declarations cascaded across compiled stylesheets in the given order: specificity, then order, decide each
 * property. Conditional (hover, forced-colors, reduced-motion) rules are separate contracts.
 */
function cascadedPaint(element: Element, sheets: readonly CompiledSheet[]): Record<string, string> {
  const winners = new Map<string, Readonly<{value: string; specificity: Specificity}>>();
  for (const sheet of sheets) {
    sheet.root.walkRules((rule) => {
      if (rule.parent instanceof AtRule) return;
      const strongest = selectorList(rule.selector)
        // CSS Modules emit `:global(X)` as X; pseudo-elements never match an element.
        .map((selector) => selector.replace(/:global\(([^)]+)\)/gu, "$1"))
        .filter((selector) => !selector.includes("::"))
        .filter((selector) =>
          element.matches(
            selector.replace(/\.([a-z][\w-]*)/giu, (_, name: string) => {
              const className = sheet.classes[name];
              if (!className) throw new Error(`Missing CSS Module class: ${name}`);
              return `.${CSS.escape(className)}`;
            }),
          ),
        )
        .map(specificity)
        .sort(compareSpecificity)
        .at(-1);
      if (!strongest) return;
      rule.walkDecls((declaration) => {
        const current = winners.get(declaration.prop);
        if (!current || compareSpecificity(strongest, current.specificity) >= 0) {
          winners.set(declaration.prop, {value: declaration.value, specificity: strongest});
        }
      });
    });
  }
  return Object.fromEntries([...winners].map(([property, {value}]) => [property, value]));
}

/** The used text colour: an `inherit` or unset cascaded colour resolves through the ancestors. */
function usedColor(element: Element, sheets: readonly CompiledSheet[]): string {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const color = cascadedPaint(current, sheets)["color"];
    if (color && color !== "inherit") return color;
  }
  throw new Error("No cascaded text colour");
}

describe.each([
  ["reset, Bubble, Button", [elementReset, compiledBubble, compiledButton]],
  ["reset, Button, Bubble", [elementReset, compiledButton, compiledBubble]],
  ["Bubble, Button, reset", [compiledBubble, compiledButton, elementReset]],
  ["Button, Bubble, reset", [compiledButton, compiledBubble, elementReset]],
] as const)("review correction: compiled nested-link rule with %s stylesheet order", (_, sheets) => {
  it("keeps plain nested links inheriting and underlined over an element-only reset while class-styled anchors keep their paint", () => {
    render(
      <Bubble>
        <BubbleContent>
          Read the <a href='#delivery-details'>delivery details</a> or{" "}
          <a
            href='#retry'
            className={buttonVariants({variant: "outline", size: "sm"})}>
            retry
          </a>
          .
        </BubbleContent>
      </Bubble>,
    );
    const plain = screen.getByRole("link", {name: "delivery details"});
    const styled = screen.getByRole("link", {name: "retry"});

    expect(cascadedPaint(plain, sheets)).toMatchObject({color: "inherit", "text-decoration": "underline"});
    expect(usedColor(plain, sheets)).toBe("var(--ac-primary-foreground)");

    const own = cascadedPaint(styled, sheets);
    for (const theme of ["light", "dark"] as const) {
      // The outline fill is the page background, so inheriting the primary surface's text colour would be ≈1.09:1.
      const text = modelColor(usedColor(styled, sheets), theme);
      expect(modelContrast(text, modelColor(own["background-color"], theme))).toBeGreaterThanOrEqual(4.5);
    }
    expect(own).toMatchObject({"background-color": "var(--ac-background)", "text-decoration": "none"});
    expect(usedColor(styled, sheets)).toBe("var(--ac-foreground)");
  });
});

describe("Bubble", () => {
  it("keeps a link-rendered content surface's own paint rather than nested-link inheritance", () => {
    render(
      <Bubble>
        <BubbleContent render={<a href='#message' />}>Open message</BubbleContent>
      </Bubble>,
    );
    expect(authoredPaint(screen.getByRole("link", {name: "Open message"}), false)).toMatchObject({
      color: "var(--ac-primary-foreground)",
      "background-color": "var(--ac-primary)",
      "text-decoration": "none",
    });
  });
  it("makes authored idle and interactive error stories reachable in both themes", async () => {
    const user = userEvent.setup();
    const {container} = render(<ErrorStates />);
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-bubble-errorSurface");
    for (const theme of ["light", "dark"]) {
      const region = screen.getByRole("region", {name: `${theme} destructive states`});
      expect(region).toHaveAttribute("data-theme", theme);
      const text = within(region).getByText("Message could not be sent.");
      const button = within(region).getByRole("button", {name: "Retry sending message"});
      const link = within(region).getByRole("link", {name: "Review delivery error"});
      for (const target of [text, button, link]) {
        expect(target).toHaveClass(cssClass("content"));
        expect(target.parentElement).toHaveClass(cssClass("destructive"));
      }
      await user.hover(button);
      await user.click(button);
      expect(within(region).getByLabelText("Retry attempts")).toHaveTextContent("1");
      await user.hover(link);
      expect(link).toHaveAttribute("href", "#delivery-details");
    }
  });

  it("lets native rest props override preset slot and alignment attributes", () => {
    render(
      <Bubble
        align='start'
        {...{"data-slot": "caller-bubble", "data-align": "end"}}>
        Caller surface
      </Bubble>,
    );
    expect(screen.getByText("Caller surface")).toHaveAttribute("data-slot", "caller-bubble");
    expect(screen.getByText("Caller surface")).toHaveAttribute("data-align", "end");
  });

  it("publishes native group/root/reaction refs and the content's actual composed element ref", () => {
    expectTypeOf<React.ComponentRef<typeof Bubble>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof BubbleGroup>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof BubbleReactions>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof BubbleContent>>().toEqualTypeOf<HTMLElement>();
  });

  it.each(["default", "secondary", "muted", "tinted", "outline", "ghost", "destructive"] as const)(
    "preserves %s variant and caller content",
    (variant) => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Bubble
          variant={variant}
          ref={ref}>
          <BubbleContent>Caller message</BubbleContent>
        </Bubble>,
      );
      expect(ref.current).toHaveAttribute("data-slot", "bubble");
      expect(ref.current).toHaveAttribute("data-variant", variant);
      expect(ref.current).toHaveAttribute("data-align", "start");
      expect(ref.current).toHaveTextContent("Caller message");
      expect(ref.current).toHaveClass(cssClass(variant));
    },
  );

  it("supports end alignment and every native slot ref without imposing chat semantics", () => {
    const group = React.createRef<HTMLDivElement>();
    const root = React.createRef<HTMLDivElement>();
    const content = React.createRef<HTMLElement>();
    const reactions = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <BubbleGroup
        ref={group}
        dir='rtl'
        className='caller'>
        <Bubble
          ref={root}
          align='end'>
          <BubbleContent ref={content}>مرحبا</BubbleContent>
          <BubbleReactions ref={reactions}>👍</BubbleReactions>
        </Bubble>
      </BubbleGroup>,
    );
    for (const [ref, slot] of [
      [group, "bubble-group"],
      [root, "bubble"],
      [content, "bubble-content"],
      [reactions, "bubble-reactions"],
    ] as const) {
      expect(ref.current).toHaveAttribute("data-slot", slot);
      expect(ref.current?.tagName).toBe("DIV");
      expect(ref.current).not.toHaveAttribute("role");
    }
    expect(group.current).toHaveAttribute("dir", "rtl");
    expect(group.current).toHaveClass("caller");
    expect(root.current).toHaveAttribute("data-align", "end");
    expect(reactions.current).toHaveAttribute("data-side", "bottom");
    expect(reactions.current).toHaveAttribute("data-align", "end");
    unmount();
    for (const ref of [group, root, content, reactions]) expect(ref.current).toBeNull();
  });

  it.each(["top", "bottom"] as const)("positions caller reactions on the %s side with both alignments", (side) => {
    const {rerender} = render(
      <BubbleReactions
        side={side}
        align='start'
        data-testid='reactions'>
        Reaction
      </BubbleReactions>,
    );
    expect(screen.getByTestId("reactions")).toHaveAttribute("data-side", side);
    expect(screen.getByTestId("reactions")).toHaveAttribute("data-align", "start");
    rerender(
      <BubbleReactions
        side={side}
        align='end'
        data-testid='reactions'
      />,
    );
    expect(screen.getByTestId("reactions")).toHaveAttribute("data-align", "end");
  });

  it("supports empty content and long text without rewriting or truncating its DOM", () => {
    const {rerender} = render(<BubbleContent data-testid='content' />);
    expect(screen.getByTestId("content")).toBeEmptyDOMElement();
    const text = "LongUnbrokenCallerContent".repeat(40);
    rerender(<BubbleContent data-testid='content'>{text}</BubbleContent>);
    expect(screen.getByTestId("content").textContent).toBe(text);
  });

  it("merges composed content, refs, child-first events and native cancellation", () => {
    const parent = React.createRef<HTMLAnchorElement>();
    const child = React.createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <BubbleContent
        ref={parent}
        className='parent'
        onClick={(event) => calls.push(`parent:${event.defaultPrevented}`)}
        render={
          <a
            ref={child}
            href='#message'
            className='child'
            aria-label='Read message'
            onClick={(event) => {
              event.preventDefault();
              calls.push("child");
            }}>
            Child text
          </a>
        }>
        Ignored text
      </BubbleContent>,
    );
    const link = screen.getByRole("link", {name: "Read message"});
    expect(fireEvent.click(link)).toBe(false);
    expect(calls).toEqual(["child", "parent:true"]);
    expect(link).toHaveTextContent("Child text");
    expect(link).toHaveClass(cssClass("content"), "parent", "child");
    expect(link.querySelector("div")).toBeNull();
    expect(parent.current).toBe(link);
    expect(child.current).toBe(link);
    unmount();
    expect(parent.current).toBeNull();
    expect(child.current).toBeNull();
  });

  it("lets composed children suppress the wrapper event", () => {
    const calls: string[] = [];
    render(
      <BubbleContent
        onClick={() => calls.push("wrapper")}
        render={
          <button
            type='button'
            onClick={(event) => {
              if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") event.preventBaseUIHandler();
              calls.push("child");
            }}>
            React
          </button>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "React"}));
    expect(calls).toEqual(["child"]);
  });

  it("preserves composed native submit and disabled attributes without inventing interaction state", () => {
    const calls: string[] = [];
    const {rerender} = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          calls.push("submit");
        }}>
        <BubbleContent render={<button type='submit' />}>Submit message choice</BubbleContent>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Submit message choice"}));
    expect(calls).toEqual(["submit"]);
    rerender(
      <BubbleContent
        onClick={() => calls.push("wrapper")}
        render={
          <button
            type='button'
            disabled
          />
        }>
        Disabled content
      </BubbleContent>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Disabled content"}));
    expect(calls).toEqual(["submit"]);
    expect(screen.getByRole("button", {name: "Disabled content"})).toBeDisabled();
  });

  it("passes owned slot state and a polymorphic ref through callback composition", () => {
    const ref = React.createRef<HTMLButtonElement>();
    const fixture: BubbleContent.Props = {
      ref,
      children: "Native callback",
      render: (props, state) => {
        expectTypeOf(state).toEqualTypeOf<BubbleContent.State>();
        expectTypeOf(props.ref).toEqualTypeOf<React.RefCallback<HTMLElement> | null | undefined>();
        return (
          <button
            {...props}
            type='button'
            data-render-slot={state.slot}
          />
        );
      },
    };
    render(<BubbleContent {...fixture} />);
    expect(ref.current).toBe(screen.getByRole("button", {name: "Native callback"}));
    expect(ref.current).toHaveAttribute("data-render-slot", "bubble-content");
  });

  it("binds wrapping, maximum width and logical RTL reaction positions in the stylesheet", () => {
    render(
      <Bubble align='end'>
        <BubbleContent>UnbrokenContent</BubbleContent>
        <BubbleReactions>👍</BubbleReactions>
      </Bubble>,
    );
    expect(screen.getByText("UnbrokenContent")).toHaveClass(cssClass("content"));
    expect(declarations(".content")).toMatchObject({
      "overflow-wrap": "anywhere",
      "max-inline-size": "100%",
      "min-inline-size": "0",
    });
    expect(declarations(".content").overflow).not.toBe("hidden");
    expect(declarations(".bubble")).toHaveProperty("max-inline-size", "80%");
    expect(declarations('.bubble[data-align="end"]')).toHaveProperty("align-self", "flex-end");
    expect(declarations('.reactions[data-align="start"]')).toHaveProperty("inset-inline-start", "var(--ac-space-3)");
    expect(declarations('.reactions[data-align="end"]')).toHaveProperty("inset-inline-end", "var(--ac-space-3)");
    expect(declarations('.reactions[data-side="top"]')).toMatchObject({top: "0", transform: "translateY(-75%)"});
    expect(declarations('.reactions[data-side="bottom"]')).toMatchObject({bottom: "0", transform: "translateY(75%)"});
  });
});

/** ARIA 1.2 prohibits naming these roles, so assistive technologies ignore an `aria-label` on them. */
const namingProhibitedRoles = new Set([
  "caption",
  "code",
  "deletion",
  "emphasis",
  "generic",
  "insertion",
  "none",
  "paragraph",
  "presentation",
  "strong",
  "subscript",
  "superscript",
]);
const composedBubbleStories: Readonly<Record<string, React.ComponentType>> = composeStories(stories);

describe("review correction (L26): Bubble stories name elements only through roles that support naming", () => {
  it.each(Object.entries(composedBubbleStories))("%s labels no generic element and exposes every label as a computed name", (_, Story) => {
    const {container} = render(<Story />);
    const roles = new Map<Element, string>();
    for (const [role, elements] of Object.entries(getRoles(container))) {
      for (const element of elements) roles.set(element, role);
    }
    for (const element of container.querySelectorAll("[aria-label]")) {
      // Elements without an exposed role, or hidden from the accessibility tree, count as generic and fail.
      const role = roles.get(element) ?? "generic";
      // A name on a generic div or span is ignored: name a group or an image, or let visible text carry the meaning.
      expect(namingProhibitedRoles.has(role), `${role}: ${element.outerHTML}`).toBe(false);
      expect(within(container).getAllByRole(role, {name: element.getAttribute("aria-label") ?? ""})).toContain(element);
    }
  });

  it("names the reaction summary and the empty content as images", () => {
    const {Default, EmptyErrorLongContentAndRTL} = composeStories(stories);
    const {unmount} = render(<Default />);
    expect(screen.getByRole("img", {name: "2 thumbs-up reactions"})).toHaveTextContent("👍 2");
    unmount();
    render(<EmptyErrorLongContentAndRTL />);
    expect(screen.getByRole("img", {name: "Empty message"})).toBeEmptyDOMElement();
  });
});
