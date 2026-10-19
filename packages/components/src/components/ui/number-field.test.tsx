import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse} from "postcss";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it, vi} from "vitest";

import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "./number-field";
import styles from "./number-field.module.css";
import * as stories from "./number-field.stories";

type Theme = "light" | "dark";
type Oklch = readonly [lightness: number, chroma: number, hue: number];
type ModelPaint = Readonly<{color: Oklch; alpha: number}>;
type EncodedRgb = readonly [red: number, green: number, blue: number];
type Specificity = readonly [ids: number, classes: number, types: number];

const themeTokens: Record<Theme, Map<string, string>> = {light: new Map(), dark: new Map()};
parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
  if (rule.selector !== ":root" && !rule.selector.includes('[data-theme="dark"]')) return;
  const tokens = rule.selector === ":root" ? themeTokens.light : themeTokens.dark;
  rule.walkDecls((declaration) => {
    tokens.set(declaration.prop, declaration.value);
  });
});

// Lower real native CSS nesting so every compiled rule carries its effective selector and media.
const compiledNumberFieldCss = parse(
  transform({
    filename: "number-field.module.css",
    code: readFileSync(join(import.meta.dirname, "number-field.module.css")),
    include: Features.Nesting,
    targets: {chrome: 100 << 16},
  }).code.toString(),
);

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

/** Selectors Level 4 specificity for the selector forms this stylesheet uses. */
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
 * Cascaded compiled declarations: specificity, then source order, decide each property. `(hover: hover)` rules apply only
 * to a hovering fine pointer; forced-colors and reduced-motion overrides are separate contracts.
 */
function cascadedPaint(element: HTMLElement, hover: boolean): Record<string, string> {
  const winners = new Map<string, Readonly<{value: string; specificity: Specificity}>>();
  compiledNumberFieldCss.walkRules((rule) => {
    const media = rule.parent instanceof AtRule ? rule.parent : undefined;
    if (media && !(hover && media.name === "media" && media.params === "(hover: hover)")) return;
    const strongest = selectorList(rule.selector)
      // Pseudo-elements never match an element.
      .filter((selector) => !selector.includes("::"))
      .filter((selector) =>
        element.matches(
          selector
            .replace(/\.([a-z][\w-]*)/giu, (_, name: string) => {
              const className = styles[name];
              if (!className) throw new Error(`Missing number field class: ${name}`);
              return `.${CSS.escape(className)}`;
            })
            .replace(/:hover\b/gu, hover ? "" : ":not(*)"),
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
  return Object.fromEntries([...winners].map(([property, {value}]) => [property, value]));
}

function oklchToken(theme: Theme, token: string): Oklch {
  const value = themeTokens[theme].get(token);
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
  if (!value) throw new Error("Missing compiled NumberField paint");
  const operand = (text: string): ModelPaint => {
    if (text === "transparent" || text === "#0000") return {color: [0, 0, 0], alpha: 0};
    const token = /^var\((--ac-[\w-]+)\)$/u.exec(text)?.[1];
    if (!token) throw new Error(`Unmodelled NumberField paint: ${text}`);
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

describe.each(["light", "dark"] as const)("review correction: NumberField scrub paint in %s defaults (token luminance model)", (theme) => {
  it("keeps the cascaded idle and scrubbing handle text at 4.5:1 on its compiled surface", async () => {
    const user = userEvent.setup();
    render(
      <NumberField defaultValue={2}>
        <NumberFieldInput aria-label='Quantity' />
        <NumberFieldScrubArea data-testid='scrub' />
      </NumberField>,
    );
    const scrub = screen.getByTestId("scrub");
    const page = paintOver(modelPaint("var(--ac-background)", theme), [0, 0, 0]);
    const contrastOf = (state: Record<string, string>): number => {
      const surface = paintOver(modelPaint(state["background-color"], theme), page);
      return modelContrast(paintOver(modelPaint(state["color"], theme), surface), surface);
    };

    const idle = cascadedPaint(scrub, false);
    expect(idle["color"]).toBe("var(--ac-muted-foreground)");
    expect(contrastOf(idle)).toBeGreaterThanOrEqual(4.5);

    await user.pointer({target: scrub, keys: "[MouseLeft>]"});
    expect(scrub).toHaveAttribute("data-scrubbing");
    // Without a hovering fine pointer (touch scrubbing) the scrubbing rule paints the handle; a hovering pointer gets the
    // accent/accent-foreground token pair gated in `styles.test.ts`.
    expect(contrastOf(cascadedPaint(scrub, false))).toBeGreaterThanOrEqual(4.5);

    await user.pointer({keys: "[/MouseLeft]"});
    expect(scrub).not.toHaveAttribute("data-scrubbing");
  });
});

describe("NumberField", () => {
  const {WithLimits, WithStep, Currency, WithCurrency, MinMax} = composeStories(stories);

  it.each([
    {Example: WithLimits, label: "Select quantity (1-10)"},
    {Example: WithStep, label: "Adjust opacity"},
    {Example: Currency, label: "Enter amount"},
    {Example: WithCurrency, label: "Budget Amount"},
    {Example: MinMax, label: "Progress Percentage"},
  ])("associates the full visible story label '$label' with each mounted input and label-click focus", async ({Example, label}) => {
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <Example />
      </>,
    );
    const inputs = screen.getAllByRole("textbox", {name: label});
    expect(inputs).toHaveLength(2);
    expect(inputs[0]?.id).not.toBe(inputs[1]?.id);
    const labels = screen.getAllByText(label, {selector: "label"});
    for (const [index, visibleLabel] of labels.entries()) {
      const input = inputs[index];
      expect((visibleLabel as HTMLLabelElement).control).toBe(input);
      expect(input).toHaveAccessibleName(label);
      await user.click(visibleLabel);
      expect(input).toHaveFocus();
    }
  });

  function statefulField(value: number, disabled: boolean): React.ReactElement {
    return (
      <NumberField
        value={value}
        disabled={disabled}
        className={(state) => `root-value-${state.value}`}
        render={(props, state) => (
          <div
            {...props}
            data-testid='root'
            data-contract-value={state.value}
            data-contract-disabled={String(state.disabled)}
          />
        )}>
        <NumberFieldGroup
          className={(state) => `group-value-${state.value}`}
          render={(props, state) => (
            <div
              {...props}
              data-testid='group'
              data-contract-value={state.value}
              data-contract-disabled={String(state.disabled)}
            />
          )}>
          <NumberFieldInput
            className={(state) => `input-value-${state.value}`}
            render={(props, state) => (
              <input
                {...props}
                data-testid='input'
                data-contract-value={state.value}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
          <NumberFieldIncrement
            className={(state) => `increment-value-${state.value}`}
            render={(props, state) => (
              <button
                {...props}
                data-testid='increment'
                data-contract-value={state.value}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
          <NumberFieldDecrement
            className={(state) => `decrement-value-${state.value}`}
            render={(props, state) => (
              <button
                {...props}
                data-testid='decrement'
                data-contract-value={state.value}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
          <NumberFieldScrubArea
            className={(state) => `scrub-value-${state.value}`}
            render={(props, state) => (
              <span
                {...props}
                data-testid='scrub'
                data-contract-value={state.value}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
        </NumberFieldGroup>
      </NumberField>
    );
  }

  it.each(["root", "group", "input", "increment", "decrement", "scrub"])(
    "supplies owning value state and className callbacks to %s",
    (part) => {
      const {rerender} = render(statefulField(7, true));
      const element = screen.getByTestId(part);
      expect(element).toHaveAttribute("data-contract-value", "7");
      expect(element).toHaveAttribute("data-contract-disabled", "true");
      expect(element).toHaveClass(`${part}-value-7`);

      rerender(statefulField(11, false));
      expect(screen.getByTestId(part)).toBe(element);
      expect(element).toHaveAttribute("data-contract-value", "11");
      expect(element).toHaveAttribute("data-contract-disabled", "false");
      expect(element).toHaveClass(`${part}-value-11`);
      expect(screen.getByRole("textbox")).toHaveValue("11");
    },
  );

  it.each(["element", "callback"] as const)("preserves every %s-rendered part's children, classes, refs and cleanup", (mode) => {
    const attached: HTMLElement[] = [];
    const cleaned = vi.fn<(node: HTMLElement) => void>();
    const renderCleaned = vi.fn<(node: HTMLElement) => void>();
    const ref = (node: HTMLElement | null): (() => void) | undefined => {
      if (!node) return undefined;
      attached.push(node);
      return () => cleaned(node);
    };
    const renderRef = (node: HTMLElement | null): (() => void) | undefined => (node ? () => renderCleaned(node) : undefined);
    const inputRef = React.createRef<HTMLInputElement>();
    const {unmount} = render(
      <NumberField
        ref={ref}
        inputRef={inputRef}
        defaultValue={2}
        className='root-custom'
        data-testid='root'
        render={
          mode === "element" ? (
            <div
              ref={renderRef}
              className='root-render'
            />
          ) : (
            (props) => <div {...props} />
          )
        }>
        <NumberFieldGroup
          ref={ref}
          data-testid='group'
          className='group-custom'
          render={
            mode === "element" ? (
              <div
                ref={renderRef}
                className='group-render'
              />
            ) : (
              (props) => <div {...props} />
            )
          }>
          <NumberFieldInput
            ref={ref}
            className='input-custom'
            aria-label='Quantity'
            render={
              mode === "element" ? (
                <input
                  ref={renderRef}
                  className='input-render'
                />
              ) : (
                (props) => <input {...props} />
              )
            }
          />
          <NumberFieldIncrement
            ref={ref}
            className='increment-custom'
            render={
              mode === "element" ? (
                <button
                  ref={renderRef}
                  className='increment-render'>
                  Rendered increase
                </button>
              ) : (
                (props) => <button {...props} />
              )
            }>
            Wrapper increase
          </NumberFieldIncrement>
          <NumberFieldDecrement
            ref={ref}
            className='decrement-custom'
            render={
              mode === "element" ? (
                <button
                  ref={renderRef}
                  className='decrement-render'>
                  Rendered decrease
                </button>
              ) : (
                (props) => <button {...props} />
              )
            }>
            Wrapper decrease
          </NumberFieldDecrement>
          <NumberFieldScrubArea
            ref={ref}
            data-testid='scrub'
            className='scrub-custom'
            render={
              mode === "element" ? (
                <span
                  ref={renderRef}
                  className='scrub-render'>
                  Rendered scrub
                </span>
              ) : (
                (props) => <span {...props} />
              )
            }>
            Wrapper scrub
          </NumberFieldScrubArea>
        </NumberFieldGroup>
      </NumberField>,
    );
    const parts = {
      root: screen.getByTestId("root"),
      group: screen.getByTestId("group"),
      input: screen.getByRole("textbox", {name: "Quantity"}),
      increment: screen.getByRole("button", {name: "Increase"}),
      decrement: screen.getByRole("button", {name: "Decrease"}),
      scrub: screen.getByTestId("scrub"),
    };
    for (const [part, node] of Object.entries(parts)) {
      expect(attached).toContain(node);
      expect(node).toHaveClass(`${part}-custom`);
      if (mode === "element") expect(node).toHaveClass(`${part}-render`);
    }
    expect(inputRef.current).not.toBe(parts.input);
    expect(inputRef.current).toHaveAttribute("type", "number");
    expect(inputRef.current).toHaveAttribute("aria-hidden", "true");
    expect(inputRef.current).toHaveValue(2);
    expect(parts.input).toHaveValue("2");
    expect(parts.increment).toHaveTextContent(mode === "element" ? "Rendered increase" : "Wrapper increase");
    expect(parts.decrement).toHaveTextContent(mode === "element" ? "Rendered decrease" : "Wrapper decrease");
    expect(parts.scrub).toHaveTextContent(mode === "element" ? "Rendered scrub" : "Wrapper scrub");
    unmount();
    expect(inputRef.current).toBeNull();
    for (const node of Object.values(parts)) {
      expect(cleaned).toHaveBeenCalledWith(node);
      if (mode === "element") expect(renderCleaned).toHaveBeenCalledWith(node);
    }
    expect(cleaned).toHaveBeenCalledTimes(6);
    expect(renderCleaned).toHaveBeenCalledTimes(mode === "element" ? 6 : 0);
  });

  it("parses localized input and preserves numeric form submission, callbacks and blur formatting", async () => {
    const user = userEvent.setup();
    const values: Array<number | null> = [];
    const commits: Array<number | null> = [];
    render(
      <form aria-label='Order'>
        <NumberField
          name='quantity'
          defaultValue={1.5}
          locale='de-DE'
          step={0.25}
          min={0}
          max={10}
          onValueChange={(value) => values.push(value)}
          onValueCommitted={(value) => commits.push(value)}>
          <NumberFieldGroup>
            <NumberFieldInput aria-label='Quantity' />
            <NumberFieldIncrement />
            <NumberFieldDecrement />
          </NumberFieldGroup>
        </NumberField>
      </form>,
    );
    const input = screen.getByRole("textbox", {name: "Quantity"});
    const form = screen.getByRole<HTMLFormElement>("form", {name: "Order"});
    expect(input).toHaveValue("1,5");
    await user.clear(input);
    await user.type(input, "2,75");
    await user.tab();
    expect(input).toHaveValue("2,75");
    expect(values.at(-1)).toBe(2.75);
    expect(commits.at(-1)).toBe(2.75);
    expect(new FormData(form).get("quantity")).toBe("2.75");
    await user.click(screen.getByRole("button", {name: "Increase"}));
    expect(input).toHaveValue("3");
    expect(values.at(-1)).toBe(3);
    await user.click(screen.getByRole("button", {name: "Decrease"}));
    expect(input).toHaveValue("2,75");
    expect(values.at(-1)).toBe(2.75);
  });

  it("honors steps, keyboard modifiers and min/max bounds with state-aware disabled steppers", async () => {
    const user = userEvent.setup();
    render(
      <NumberField
        defaultValue={1}
        min={1}
        max={9}
        step={2}
        smallStep={1}
        largeStep={4}>
        <NumberFieldGroup>
          <NumberFieldInput aria-label='Quantity' />
          <NumberFieldIncrement
            render={(props, state) => (
              <button
                {...props}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
          <NumberFieldDecrement
            render={(props, state) => (
              <button
                {...props}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
        </NumberFieldGroup>
      </NumberField>,
    );
    const input = screen.getByRole("textbox", {name: "Quantity"});
    const increase = screen.getByRole("button", {name: "Increase"});
    const decrease = screen.getByRole("button", {name: "Decrease"});
    expect(decrease).toHaveAttribute("data-contract-disabled", "true");
    await user.click(increase);
    expect(input).toHaveValue("3");
    input.focus();
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("5");
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(input).toHaveValue("9");
    expect(increase).toHaveAttribute("data-contract-disabled", "true");
    await user.click(increase);
    expect(input).toHaveValue("9");
    input.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(input).toHaveValue("8");
    await user.clear(input);
    await user.type(input, "99");
    await user.tab();
    expect(input).toHaveValue("9");
    await user.clear(input);
    await user.type(input, "-5");
    await user.tab();
    expect(input).toHaveValue("5");
    await user.clear(input);
    await user.type(input, "0");
    await user.tab();
    expect(input).toHaveValue("1");
    expect(decrease).toHaveAttribute("data-contract-disabled", "true");
  });

  it("retains controlled value until the caller rerenders and honors canceled value changes", async () => {
    const user = userEvent.setup();
    const values: Array<number | null> = [];
    const fixture = (value: number): React.ReactElement => (
      <NumberField
        value={value}
        onValueChange={(nextValue) => values.push(nextValue)}>
        <NumberFieldInput aria-label='Controlled quantity' />
        <NumberFieldIncrement />
      </NumberField>
    );
    const {rerender, unmount} = render(fixture(2));
    await user.click(screen.getByRole("button", {name: "Increase"}));
    expect(values).toEqual([3]);
    expect(screen.getByRole("textbox")).toHaveValue("2");
    rerender(fixture(3));
    expect(screen.getByRole("textbox")).toHaveValue("3");
    unmount();

    render(
      <NumberField
        defaultValue={4}
        onValueChange={(_, details) => details.cancel()}>
        <NumberFieldInput aria-label='Cancelable quantity' />
        <NumberFieldIncrement />
      </NumberField>,
    );
    await user.click(screen.getByRole("button", {name: "Increase"}));
    expect(screen.getByRole("textbox")).toHaveValue("4");
  });

  it("merges rendered stepper events and supports canceling primitive activation", async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    render(
      <NumberField defaultValue={2}>
        <NumberFieldInput aria-label='Quantity' />
        <NumberFieldIncrement
          onClick={() => clicks.push("wrapper")}
          render={<button onClick={() => clicks.push("render")} />}
        />
        <NumberFieldDecrement
          onClick={(event) => {
            clicks.push("canceled");
            event.preventBaseUIHandler();
          }}
          onPointerDown={(event) => event.preventBaseUIHandler()}
        />
      </NumberField>,
    );
    await user.click(screen.getByRole("button", {name: "Increase"}));
    expect(clicks).toEqual(["render", "wrapper"]);
    expect(screen.getByRole("textbox")).toHaveValue("3");
    await user.click(screen.getByRole("button", {name: "Decrease"}));
    expect(clicks).toEqual(["render", "wrapper", "canceled"]);
    expect(screen.getByRole("textbox")).toHaveValue("3");
  });

  it.each(["disabled", "readOnly"] as const)("blocks text entry, steppers and scrubbing when %s", async (mode) => {
    const user = userEvent.setup();
    const changes: Array<number | null> = [];
    render(
      <NumberField
        defaultValue={2}
        disabled={mode === "disabled"}
        readOnly={mode === "readOnly"}
        onValueChange={(value) => changes.push(value)}>
        <NumberFieldInput aria-label='Unavailable quantity' />
        <NumberFieldIncrement />
        <NumberFieldDecrement />
        <NumberFieldScrubArea
          data-testid='scrub'
          render={(props, state) => (
            <span
              {...props}
              data-contract-scrubbing={String(state.scrubbing)}
            />
          )}
        />
      </NumberField>,
    );
    const input = screen.getByRole("textbox");
    await user.type(input, "9");
    await user.click(screen.getByRole("button", {name: "Increase"}));
    await user.click(screen.getByRole("button", {name: "Decrease"}));
    await user.pointer([{target: screen.getByTestId("scrub"), keys: "[MouseLeft>]"}, {keys: "[/MouseLeft]"}]);
    expect(input).toHaveValue("2");
    expect(screen.getByTestId("scrub")).toHaveAttribute("data-contract-scrubbing", "false");
    expect(changes).toEqual([]);
  });

  it.each([
    {direction: "horizontal" as const, movementX: 3, movementY: 0},
    {direction: "vertical" as const, movementX: 0, movementY: -3},
  ])("preserves real $direction scrubbing, bounds, state callbacks and release commits", async ({direction, movementX, movementY}) => {
    const user = userEvent.setup();
    const changes: Array<number | null> = [];
    const commits: Array<number | null> = [];
    render(
      <NumberField
        defaultValue={2}
        min={0}
        max={4}
        onValueChange={(value) => changes.push(value)}
        onValueCommitted={(value) => commits.push(value)}>
        <NumberFieldInput aria-label='Scrub quantity' />
        <NumberFieldScrubArea
          direction={direction}
          pixelSensitivity={1}
          data-testid='scrub'
          className={(state) => (state.scrubbing ? "active-scrub" : "idle-scrub")}
          render={(props, state) => (
            <span
              {...props}
              data-contract-scrubbing={String(state.scrubbing)}
            />
          )}
        />
      </NumberField>,
    );
    const scrub = screen.getByTestId("scrub");
    await user.pointer({target: scrub, keys: "[MouseLeft>]"});
    expect(scrub).toHaveAttribute("data-contract-scrubbing", "true");
    expect(scrub).toHaveClass("active-scrub");
    const movement = new PointerEvent("pointermove", {bubbles: true, pointerType: "mouse"});
    Object.defineProperties(movement, {
      movementX: {value: movementX},
      movementY: {value: movementY},
    });
    fireEvent(window, movement);
    expect(screen.getByRole("textbox")).toHaveValue("4");
    expect(changes.at(-1)).toBe(4);
    await user.pointer({keys: "[/MouseLeft]"});
    expect(scrub).toHaveAttribute("data-contract-scrubbing", "false");
    expect(scrub).toHaveClass("idle-scrub");
    expect(commits.at(-1)).toBe(4);
  });

  function renderNumberField(className?: string): ReturnType<typeof render> {
    return render(
      <NumberField
        aria-label='Quantity'
        className={className}
        defaultValue={2}
        step={1}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderNumberField();

    // Assert
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("increments and decrements the displayed value", async () => {
    // Arrange
    const user = userEvent.setup();
    renderNumberField();
    const input = screen.getByRole("textbox");

    // Act
    await user.click(screen.getByRole("button", {name: "Increase"}));
    await user.click(screen.getByRole("button", {name: "Decrease"}));

    // Assert
    expect(input).toHaveValue("2");
  });

  it("merges the root className", () => {
    // Arrange
    const {container} = renderNumberField("custom-number-field");

    // Assert
    expect(container.firstElementChild).toHaveClass("custom-number-field");
  });

  it("renders custom increment children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={2}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement>Increase</NumberFieldIncrement>
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Increase"})).toBeInTheDocument();
  });

  it("renders default increment symbol when no children provided", () => {
    // Arrange
    renderNumberField();

    // Assert
    const incrementButton = screen.getByRole("button", {name: "Increase"});
    expect(incrementButton).toHaveTextContent("+");
  });

  it("renders default decrement symbol when no children provided", () => {
    // Arrange
    renderNumberField();

    // Assert
    const decrementButton = screen.getByRole("button", {name: "Decrease"});
    expect(decrementButton).toHaveTextContent("−");
  });

  it("renders custom decrement children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={5}>
        <NumberFieldGroup>
          <NumberFieldDecrement>Decrement</NumberFieldDecrement>
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Decrease"})).toHaveTextContent("Decrement");
  });

  it("renders NumberFieldScrubArea with default scrub handle", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={10}>
        <NumberFieldGroup>
          <NumberFieldScrubArea data-testid='scrub-area' />
          <NumberFieldInput />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    const scrubArea = screen.getByTestId("scrub-area");
    expect(scrubArea).toBeInTheDocument();
    expect(scrubArea).toHaveTextContent("⋮⋮");
  });

  it("renders NumberFieldScrubArea with custom children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={10}>
        <NumberFieldGroup>
          <NumberFieldScrubArea data-testid='scrub-area'>
            <span>Custom Scrub</span>
          </NumberFieldScrubArea>
          <NumberFieldInput />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    const scrubArea = screen.getByTestId("scrub-area");
    expect(scrubArea).toHaveTextContent("Custom Scrub");
  });
});
