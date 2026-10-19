import {Slider as BaseSlider} from "@base-ui/react/slider";
import {Field as BaseField} from "@base-ui/react/field";
import {act, fireEvent, render as renderComponent, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse} from "postcss";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {beforeEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {Slider} from "./slider";
import styles from "./slider.module.css";
import * as stories from "./slider.stories";

async function render(element: React.ReactElement): Promise<ReturnType<typeof renderComponent>> {
  return act(async () => renderComponent(element));
}

function getPart(container: HTMLElement, slot: string): HTMLElement {
  const part = container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
  if (!part) throw new Error(`Missing slider part: ${slot}`);
  return part;
}

type Theme = "light" | "dark";
type Oklch = readonly [lightness: number, chroma: number, hue: number];
type ModelPaint = Readonly<{color: Oklch; alpha: number}>;
type EncodedRgb = readonly [red: number, green: number, blue: number];

const themeTokens: Record<Theme, Map<string, string>> = {light: new Map(), dark: new Map()};
parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
  if (rule.selector !== ":root" && !rule.selector.includes('[data-theme="dark"]')) return;
  const tokens = rule.selector === ":root" ? themeTokens.light : themeTokens.dark;
  rule.walkDecls((declaration) => {
    tokens.set(declaration.prop, declaration.value);
  });
});

// Lower real native CSS nesting before matching compiled rules against the rendered parts.
const compiledSliderCss = parse(
  transform({
    filename: "slider.module.css",
    code: readFileSync(join(import.meta.dirname, "slider.module.css")),
    include: Features.Nesting,
    targets: {chrome: 100 << 16},
  }).code.toString(),
);

/** Unconditional compiled declarations; forced-colors and reduced-motion overrides are separate contracts. */
function compiledPaint(element: HTMLElement): Record<string, string> {
  const declarations: Record<string, string> = {};
  compiledSliderCss.walkRules((rule) => {
    if (rule.parent instanceof AtRule) return;
    const selector = rule.selector.replace(/\.([a-z][\w-]*)/giu, (_, name: string) => {
      const className = styles[name];
      if (!className) throw new Error(`Missing slider class: ${name}`);
      return `.${CSS.escape(className)}`;
    });
    if (element.matches(selector))
      rule.walkDecls((declaration) => {
        declarations[declaration.prop] = declaration.value;
      });
  });
  return declarations;
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
  if (!value) throw new Error("Missing compiled Slider paint");
  const operand = (text: string): ModelPaint => {
    if (text === "transparent" || text === "#0000") return {color: [0, 0, 0], alpha: 0};
    const token = /^var\((--ac-[\w-]+)\)$/u.exec(text)?.[1];
    if (!token) throw new Error(`Unmodelled Slider paint: ${text}`);
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

describe.each(["light", "dark"] as const)("review correction: Slider range in %s defaults (token luminance model)", (theme) => {
  it("keeps the compiled range fill at 3:1 against the translucent track it fills", async () => {
    const {container} = await render(
      <Slider
        aria-label='Volume'
        defaultValue={40}
      />,
    );
    const track = compiledPaint(getPart(container, "slider-track"));
    const range = compiledPaint(getPart(container, "slider-range"));
    const page = paintOver(modelPaint("var(--ac-background)", theme), [0, 0, 0]);
    const unfilled = paintOver(modelPaint(track["background-color"], theme), page);
    const filled = paintOver(modelPaint(range["background-color"], theme), unfilled);
    // The fill is the value indicator inside the track, so it must stand out from the unfilled track it abuts.
    expect(modelContrast(filled, unfilled)).toBeGreaterThanOrEqual(3);
    expect(range["background-color"]).toBe("var(--ac-primary-emphasis)");
  });
});

describe("Slider", () => {
  it("sets and clears explicit invalidity on actual range inputs without losing names, form values or keyboard state", async () => {
    const user = userEvent.setup();
    function fixture(invalid: React.AriaAttributes["aria-invalid"]): React.JSX.Element {
      return (
        <form aria-label='Validation form'>
          <p id='validation-help'>Choose both endpoints.</p>
          <Slider
            name='range'
            defaultValue={[20, 80]}
            getAriaLabel={(index) => (index === 0 ? "Lower bound" : "Upper bound")}
            aria-describedby='validation-help'
            aria-invalid={invalid}
          />
        </form>
      );
    }
    const {rerender, container} = await render(fixture(undefined));
    const sliders = screen.getAllByRole("slider");
    expect(sliders.map((slider) => slider.getAttribute("aria-invalid"))).toEqual([null, null]);
    rerender(fixture(true));
    for (const slider of screen.getAllByRole("slider")) {
      expect(slider).toHaveAttribute("aria-invalid", "true");
      expect(slider).toHaveAccessibleDescription("Choose both endpoints.");
      expect(slider.closest('[data-slot="slider-thumb"]')).toHaveAttribute("data-invalid");
    }
    expect(screen.getByRole("slider", {name: "Lower bound"})).toBe(sliders[0]);
    expect(screen.getByRole("slider", {name: "Upper bound"})).toBe(sliders[1]);
    await user.click(sliders[0]!);
    await user.keyboard("{ArrowRight}");
    expect(sliders[0]).toHaveAttribute("aria-valuenow", "21");
    expect(new FormData(screen.getByRole("form") as HTMLFormElement).getAll("range")).toEqual(["21", "80"]);
    rerender(fixture(false));
    for (const slider of screen.getAllByRole("slider")) {
      expect(slider).toHaveAttribute("aria-invalid", "false");
      expect(slider.closest('[data-slot="slider-thumb"]')).not.toHaveAttribute("data-invalid");
    }
    rerender(fixture("grammar"));
    expect(screen.getAllByRole("slider").every((slider) => slider.getAttribute("aria-invalid") === "grammar")).toBe(true);
    rerender(fixture(undefined));
    expect(screen.getAllByRole("slider")).toEqual(sliders);
    expect(sliders[0]).toHaveAttribute("aria-valuenow", "21");
    expect(container.querySelector("[data-invalid]")).toBeNull();
  });

  it("retains inherited Field validation, labels and form ownership when no explicit invalidity is supplied", async () => {
    function fixture(invalid: boolean): React.JSX.Element {
      return (
        <form>
          <BaseField.Root
            invalid={invalid}
            name='field-range'>
            <BaseField.Label>Field range</BaseField.Label>
            <BaseField.Description>Field help.</BaseField.Description>
            <Slider defaultValue={[20, 80]} />
          </BaseField.Root>
        </form>
      );
    }
    const {rerender, container} = await render(fixture(true));
    for (const slider of screen.getAllByRole("slider")) {
      expect(slider).toHaveAccessibleName("Field range");
      expect(slider).toHaveAccessibleDescription("Field help.");
      expect(slider).toHaveAttribute("aria-invalid", "true");
      expect(slider).toHaveAttribute("name", "field-range");
    }
    rerender(fixture(false));
    expect(screen.getAllByRole("slider").every((slider) => slider.getAttribute("aria-invalid") !== "true")).toBe(true);
    expect(container.querySelector('[data-slot="slider-thumb"][data-invalid]')).toBeNull();
  });

  it("names and describes the actual focusable inputs, including distinct range endpoints", async () => {
    await render(
      <>
        <p id='price-help'>Amounts in euros</p>
        <Slider
          defaultValue={[10, 90]}
          aria-label='Price'
          aria-describedby='price-help'
          getAriaLabel={(index) => (index === 0 ? "Minimum price" : "Maximum price")}
          getAriaValueText={(_formatted, value) => `${value} euros`}
        />
      </>,
    );
    const minimum = screen.getByRole("slider", {name: "Minimum price"});
    const maximum = screen.getByRole("slider", {name: "Maximum price"});
    expect(minimum).toHaveAccessibleDescription("Amounts in euros");
    expect(maximum).toHaveAccessibleDescription("Amounts in euros");
    expect(minimum).toHaveAttribute("aria-valuetext", "10 euros");
    expect(maximum).toHaveAttribute("aria-valuetext", "90 euros");
  });

  it("uses the caller's accessible name on the scalar input rather than only the group", async () => {
    await render(
      <Slider
        aria-label='Volume'
        defaultValue={40}
      />,
    );
    expect(screen.getByRole("slider", {name: "Volume"})).toHaveAttribute("aria-valuenow", "40");
  });

  it("applies playground controls to the real Slider and supplies vertical story geometry", async () => {
    const {Default} = composeStories(stories);
    const {container} = await render(
      <Default
        orientation='vertical'
        disabled
        thumbAlignment='center'
      />,
    );
    expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByRole("slider")).toBeDisabled();
    const layout = container.querySelector(".ac-story-slider-storyVertical");
    expect(layout).not.toBeNull();
    expect(getComputedStyle(layout as HTMLElement).height).toBe("256px");
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-slider-storyVertical");
  });

  beforeEach(() => {
    // Happy DOM has no layout. Supply only the measurement boundary; Base UI owns value/position math.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element): DOMRect {
      const vertical = this.closest('[data-slot="slider"]')?.getAttribute("data-orientation") === "vertical";
      if (this.getAttribute("data-slot") === "slider-thumb") {
        const input = this.querySelector("input");
        const min = Number(input?.min ?? 0);
        const max = Number(input?.max ?? 100);
        const fraction = ((input?.valueAsNumber ?? min) - min) / (max - min);
        return vertical ? new DOMRect(10, 220 - 200 * fraction, 20, 20) : new DOMRect(10 + 200 * fraction, 20, 20, 20);
      }
      return vertical ? new DOMRect(10, 20, 20, 220) : new DOMRect(10, 20, 220, 20);
    });
    const capturedPointers = new Map<Element, Set<number>>();
    vi.spyOn(Element.prototype, "setPointerCapture").mockImplementation(function (this: Element, pointerId: number): void {
      const captures = capturedPointers.get(this) ?? new Set<number>();
      captures.add(pointerId);
      capturedPointers.set(this, captures);
    });
    vi.spyOn(Element.prototype, "hasPointerCapture").mockImplementation(function (this: Element, pointerId: number): boolean {
      return capturedPointers.get(this)?.has(pointerId) ?? false;
    });
    vi.spyOn(Element.prototype, "releasePointerCapture").mockImplementation(function (this: Element, pointerId: number): void {
      capturedPointers.get(this)?.delete(pointerId);
    });
  });

  it("renders an independently focusable thumb for each range endpoint", async () => {
    await render(
      <Slider
        aria-label='Price range'
        defaultValue={[25, 75]}
      />,
    );
    const thumbs = await screen.findAllByRole("slider");
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "25");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "75");
  });

  it.each([
    {min: undefined, max: undefined, expected: "0"},
    {min: 20, max: 80, expected: "20"},
  ])("characterizes the primitive's omitted value as a single minimum ($expected)", async ({min, max, expected}) => {
    await render(
      <BaseSlider.Root
        min={min}
        max={max}
        render={(props, state) => (
          <div
            {...props}
            data-testid='primitive-root'
            data-values={JSON.stringify(state.values)}
          />
        )}>
        <BaseSlider.Control>
          <BaseSlider.Track>
            <BaseSlider.Indicator />
          </BaseSlider.Track>
          <BaseSlider.Thumb index={0} />
        </BaseSlider.Control>
      </BaseSlider.Root>,
    );
    expect(screen.getByTestId("primitive-root")).toHaveAttribute("data-values", `[${expected}]`);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", expected);
  });

  it("keeps the primitive's single minimum default without manufacturing a maximum thumb", async () => {
    await render(
      <Slider
        aria-label='Default value'
        min={20}
        max={80}
      />,
    );
    expect(await screen.findAllByRole("slider")).toHaveLength(1);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "20");
  });

  it.each(
    (["controlled", "uncontrolled"] as const).flatMap((mode) =>
      [
        {value: 127, expected: [100], name: "out-of-range"},
        {value: [80, 20], expected: [20, 80], name: "reversed"},
        {value: 23, expected: [23], name: "off-step"},
      ].map((sample) => ({mode, ...sample})),
    ),
  )("characterizes $mode $name initial values against the real SDK without wrapper normalization", async ({mode, value, expected}) => {
    const valueProps = mode === "controlled" ? {value} : {defaultValue: value};
    await render(
      <>
        <BaseSlider.Root<number | readonly number[]>
          {...valueProps}
          min={0}
          max={100}
          step={10}
          render={(props, state) => (
            <div
              {...props}
              data-testid='sdk-values'
              data-values={JSON.stringify(state.values)}
            />
          )}
        />
        <Slider<number | readonly number[]>
          {...valueProps}
          min={0}
          max={100}
          step={10}
          render={(props, state) => (
            <div
              {...props}
              data-testid='wrapper-values'
              data-values={JSON.stringify(state.values)}
            />
          )}
        />
      </>,
    );
    expect(screen.getByTestId("sdk-values")).toHaveAttribute("data-values", JSON.stringify(expected));
    expect(screen.getByTestId("wrapper-values")).toHaveAttribute("data-values", JSON.stringify(expected));
  });

  it("does not manufacture a thumb for an explicitly empty range", async () => {
    await render(
      <Slider
        aria-label='Empty range'
        defaultValue={[]}
      />,
    );
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it("preserves scalar values and typed change/commit details", async () => {
    const user = userEvent.setup();
    const changes: number[] = [];
    const reasons: string[] = [];
    const commits: number[] = [];
    await render(
      <Slider
        aria-label='Scalar value'
        defaultValue={20}
        step={10}
        onValueChange={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<number>();
          expectTypeOf(details).toEqualTypeOf<BaseSlider.Root.ChangeEventDetails>();
          changes.push(value);
          reasons.push(details.reason);
          expect(details.activeThumbIndex).toBe(0);
          expect(details.event).toBeInstanceOf(KeyboardEvent);
        }}
        onValueCommitted={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<number>();
          expectTypeOf(details).toEqualTypeOf<BaseSlider.Root.CommitEventDetails>();
          commits.push(value);
          expect(details.reason).toBe("keyboard");
          expect(details.event).toBeInstanceOf(KeyboardEvent);
        }}
      />,
    );
    const thumb = await screen.findByRole("slider");
    act(() => thumb.focus());
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "30");
    expect(changes).toEqual([30]);
    expect(reasons).toEqual(["keyboard"]);
    expect(commits).toEqual([30]);
  });

  it("does not let an array default add phantom thumbs to a controlled scalar", async () => {
    await render(
      <Slider<number | readonly number[]>
        aria-label='Controlled scalar'
        value={40}
        defaultValue={[25, 75]}
      />,
    );
    expect(await screen.findAllByRole("slider")).toHaveLength(1);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "40");
  });

  it("preserves readonly ranges without converting them to scalar callbacks", async () => {
    const user = userEvent.setup();
    const range: readonly number[] = [25, 75];
    const changes: (readonly number[])[] = [];
    await render(
      <Slider
        aria-label='Readonly range'
        defaultValue={range}
        step={5}
        onValueChange={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<readonly number[]>();
          expectTypeOf(details).toEqualTypeOf<BaseSlider.Root.ChangeEventDetails>();
          changes.push(value);
          expect(details.activeThumbIndex).toBe(1);
        }}
      />,
    );
    const thumbs = await screen.findAllByRole("slider");
    act(() => thumbs[1]?.focus());
    await user.keyboard("{ArrowRight}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "25");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    expect(changes).toEqual([[25, 80]]);
    expect(range).toEqual([25, 75]);
  });

  it("lets the primitive cancel a change without committing it", async () => {
    const user = userEvent.setup();
    const committed = vi.fn<NonNullable<BaseSlider.Root.Props<number>["onValueCommitted"]>>();
    await render(
      <Slider
        aria-label='Canceled change'
        defaultValue={25}
        onValueChange={(_value, details) => details.cancel()}
        onValueCommitted={committed}
      />,
    );
    const thumb = await screen.findByRole("slider");
    act(() => thumb.focus());
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "25");
    expect(committed).not.toHaveBeenCalled();
  });

  it("passes live primitive state to render and className callbacks", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLDivElement>();
    await render(
      <Slider
        ref={ref}
        aria-label='Composed range'
        defaultValue={[25, 75]}
        orientation='vertical'
        className={(state) => (state.activeThumbIndex === 1 ? "second-active" : "idle")}
        render={(props, state) => (
          <div
            {...props}
            data-testid='composed-root'
            data-values={JSON.stringify(state.values)}
            data-active-index={state.activeThumbIndex}>
            <span>Custom content</span>
            {props.children}
          </div>
        )}
      />,
    );
    const root = screen.getByTestId("composed-root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("idle");
    expect(root).toHaveAttribute("data-values", "[25,75]");
    expect(root).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByText("Custom content")).toBeInTheDocument();
    const thumbs = await screen.findAllByRole("slider");
    act(() => thumbs[1]?.focus());
    await user.keyboard("{ArrowUp}");
    expect(root).toHaveClass("second-active");
    expect(root).toHaveAttribute("data-active-index", "1");
    expect(root).toHaveAttribute("data-values", "[25,76]");
  });

  it("preserves render element refs and merged handlers alongside generated thumbs", async () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const elementRef = React.createRef<HTMLDivElement>();
    const rootClick = vi.fn();
    const elementClick = vi.fn();
    await render(
      <Slider
        ref={rootRef}
        aria-label='Element composition'
        defaultValue={[25, 75]}
        onClick={rootClick}
        render={
          <div
            ref={elementRef}
            className='composed-element'
            onClick={elementClick}
          />
        }
      />,
    );
    const root = screen.getByRole("group", {name: "Element composition"});
    expect(rootRef.current).toBe(root);
    expect(elementRef.current).toBe(root);
    expect(root).toHaveClass("composed-element");
    expect(await screen.findAllByRole("slider")).toHaveLength(2);
    fireEvent.click(root);
    expect(rootClick).toHaveBeenCalledTimes(1);
    expect(elementClick).toHaveBeenCalledTimes(1);
  });

  it("preserves supplied child content while composing the generated slider", async () => {
    await render(
      <Slider
        aria-label='Slider with content'
        defaultValue={[25, 75]}>
        <span>Supporting content</span>
      </Slider>,
    );
    expect(screen.getByText("Supporting content")).toBeInTheDocument();
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("retains the primitive render element's child-content replacement contract", async () => {
    await render(
      <Slider
        aria-label='Replaced content'
        defaultValue={[25, 75]}
        render={
          <div>
            <span>Replacement content</span>
          </div>
        }
      />,
    );
    expect(screen.getByRole("group", {name: "Replaced content"})).toBeInTheDocument();
    expect(screen.getByText("Replacement content")).toBeInTheDocument();
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(document.querySelector('[data-slot="slider-control"]')).toBeNull();
    expect(document.querySelector('[data-slot="slider-thumb"]')).toBeNull();
  });

  it("forwards the center alignment override without replacing primitive positioning", async () => {
    const {container} = await render(
      <Slider
        aria-label='Centered thumbs'
        defaultValue={[0, 100]}
        thumbAlignment='center'
      />,
    );
    const thumbs = container.querySelectorAll<HTMLElement>('[data-slot="slider-thumb"]');
    expect(thumbs[0]?.style.insetInlineStart).toBe("0%");
    expect(thumbs[1]?.style.insetInlineStart).toBe("100%");
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it.each(["horizontal", "vertical"] as const)("supports controlled keyboard changes at both %s endpoints", async (orientation) => {
    const user = userEvent.setup();
    const changes: number[][] = [];
    const activeIndices: number[] = [];
    const commits: number[][] = [];
    function ControlledRange(): React.JSX.Element {
      const [value, setValue] = React.useState([25, 75]);
      return (
        <Slider
          aria-label='Controlled range'
          orientation={orientation}
          value={value}
          step={5}
          onValueChange={(nextValue, details) => {
            expectTypeOf(nextValue).toEqualTypeOf<number[]>();
            setValue(nextValue);
            changes.push(nextValue);
            activeIndices.push(details.activeThumbIndex);
          }}
          onValueCommitted={(nextValue, details) => {
            commits.push(nextValue);
            expect(details.reason).toBe("keyboard");
          }}
        />
      );
    }
    await render(<ControlledRange />);
    const thumbs = screen.getAllByRole("slider");
    await user.tab();
    expect(thumbs[0]).toHaveFocus();
    await user.keyboard(orientation === "vertical" ? "{ArrowUp}" : "{ArrowRight}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "30");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "75");
    await user.tab();
    expect(thumbs[1]).toHaveFocus();
    await user.keyboard(orientation === "vertical" ? "{ArrowDown}" : "{ArrowLeft}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "30");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "70");
    expect(changes).toEqual([
      [30, 75],
      [30, 70],
    ]);
    expect(commits).toEqual(changes);
    expect(activeIndices).toEqual([0, 1]);
  });

  it("reconciles controlled endpoint counts without retaining stale or phantom thumbs", async () => {
    const {rerender} = await render(
      <Slider
        aria-label='Changing range'
        value={[25, 75]}
      />,
    );
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    await act(async () => {
      rerender(
        <Slider
          aria-label='Changing range'
          value={[10, 50, 90]}
        />,
      );
    });
    await waitFor(() => {
      expect(screen.getAllByRole("slider")).toHaveLength(3);
    });
    expect(screen.getAllByRole("slider").map((thumb) => thumb.getAttribute("aria-valuenow"))).toEqual(["10", "50", "90"]);
    await act(async () => {
      rerender(
        <Slider
          aria-label='Changing range'
          value={[]}
        />,
      );
    });
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it.each(["horizontal", "vertical"] as const)("keeps min/max/step and minimum endpoint separation in %s mode", async (orientation) => {
    const user = userEvent.setup();
    await render(
      <Slider
        aria-label='Bounded range'
        orientation={orientation}
        defaultValue={[20, 80]}
        min={10}
        max={90}
        step={5}
        minStepsBetweenValues={2}
      />,
    );
    const thumbs = screen.getAllByRole("slider");
    await user.tab();
    await user.keyboard("{Home}{ArrowLeft}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "10");
    await user.keyboard("{End}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "70");
    await user.tab();
    await user.keyboard("{End}{ArrowRight}");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "90");
    await user.keyboard("{Home}");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    for (const thumb of thumbs) {
      expect(thumb).toHaveAttribute("min", "10");
      expect(thumb).toHaveAttribute("max", "90");
      expect(thumb).toHaveAttribute("step", "5");
      expect(thumb).toHaveAttribute("aria-orientation", orientation);
    }
  });

  it("submits every endpoint using the primitive's named form controls", async () => {
    const {container} = await render(
      <>
        <form
          id='range-form'
          aria-label='Range form'
        />
        <Slider
          aria-label='Named range'
          name='price'
          form='range-form'
          defaultValue={[25, 75]}
        />
      </>,
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Missing form");
    expect(new FormData(form).getAll("price")).toEqual(["25", "75"]);
    const thumbs = screen.getAllByRole("slider");
    const upperThumb = thumbs[1];
    if (!upperThumb) throw new Error("Missing upper endpoint");
    fireEvent.change(upperThumb, {target: {value: "80"}});
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    expect(new FormData(form).getAll("price")).toEqual(["25", "80"]);
  });

  it.each(["horizontal", "vertical"] as const)("exposes primitive orientation on every styled %s part", async (orientation) => {
    const {container} = await render(
      <Slider
        aria-label='Styled range'
        defaultValue={[25, 75]}
        orientation={orientation}
      />,
    );
    for (const slot of ["slider", "slider-control", "slider-track", "slider-range", "slider-thumb"]) {
      const part = getPart(container, slot);
      expect(part).toHaveAttribute("data-orientation", orientation);
      expect(part.className).not.toBe("");
    }
    expect(container.querySelectorAll('[data-slot="slider-thumb"]')).toHaveLength(2);
  });

  it.each([
    {
      orientation: "horizontal",
      first: {clientX: 60, clientY: 30},
      firstMove: {clientX: 80, clientY: 30},
      second: {clientX: 160, clientY: 30},
    },
    {
      orientation: "vertical",
      first: {clientX: 20, clientY: 190},
      firstMove: {clientX: 20, clientY: 170},
      second: {clientX: 20, clientY: 90},
    },
  ] as const)("updates both endpoints with real $orientation pointer interactions", async ({orientation, first, firstMove, second}) => {
    const changes: (readonly number[])[] = [];
    const changeReasons: string[] = [];
    const indices: number[] = [];
    const commits: (readonly number[])[] = [];
    const commitReasons: string[] = [];
    const {container} = await render(
      <Slider
        aria-label='Pointer range'
        orientation={orientation}
        defaultValue={[25, 75]}
        step={5}
        className={(state) => (state.dragging ? "dragging" : undefined)}
        render={(props, state) => (
          <div
            {...props}
            data-dragging-state={String(state.dragging)}
          />
        )}
        onValueChange={(value, details) => {
          changes.push(value);
          changeReasons.push(details.reason);
          indices.push(details.activeThumbIndex);
          expect(details.event).toBeInstanceOf(PointerEvent);
        }}
        onValueCommitted={(value, details) => {
          commits.push(value);
          commitReasons.push(details.reason);
          expect(details.event).toBeInstanceOf(PointerEvent);
        }}
      />,
    );
    const control = getPart(container, "slider-control");
    const root = getPart(container, "slider");
    const firstThumb = getPart(container, "slider-thumb");
    const thumbs = screen.getAllByRole("slider");
    const pointer = {pointerId: 1, pointerType: "mouse", button: 0, buttons: 1};
    fireEvent.pointerDown(firstThumb, {...pointer, ...first});
    expect(root).toHaveClass("dragging");
    expect(root).toHaveAttribute("data-dragging-state", "true");
    expect(firstThumb).toHaveAttribute("data-dragging");
    expect(control.hasPointerCapture(1)).toBe(true);
    expect(changes).toEqual([]);
    fireEvent.pointerMove(document, {...pointer, ...firstMove});
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "35");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "75");
    fireEvent.pointerUp(document, {...pointer, buttons: 0, ...firstMove});
    expect(control.hasPointerCapture(1)).toBe(false);
    expect(root).not.toHaveClass("dragging");
    expect(root).toHaveAttribute("data-dragging-state", "false");
    expect(firstThumb).not.toHaveAttribute("data-dragging");
    fireEvent.pointerDown(control, {...pointer, ...second});
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "35");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "70");
    fireEvent.pointerMove(document, {
      ...pointer,
      ...(orientation === "horizontal" ? {clientX: 180, clientY: 30} : {clientX: 20, clientY: 70}),
    });
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    fireEvent.pointerUp(document, {...pointer, buttons: 0});
    expect(changes).toEqual([
      [35, 75],
      [35, 70],
      [35, 80],
    ]);
    expect(commits).toEqual([
      [35, 75],
      [35, 80],
    ]);
    expect(changeReasons).toEqual(["drag", "track-press", "drag"]);
    expect(commitReasons).toEqual(["drag", "drag"]);
    expect(indices).toEqual([0, 1, 1]);
  });

  it.each(["horizontal", "vertical"] as const)(
    "keeps disabled %s ranges unfocusable, unsubmitted and non-interactive",
    async (orientation) => {
      const user = userEvent.setup();
      const change = vi.fn();
      const commit = vi.fn();
      const {container} = await render(
        <form aria-label='Disabled form'>
          <Slider
            aria-label='Disabled range'
            orientation={orientation}
            name='disabled-range'
            defaultValue={[25, 75]}
            disabled
            onValueChange={change}
            onValueCommitted={commit}
          />
        </form>,
      );
      const thumbs = screen.getAllByRole("slider");
      for (const thumb of thumbs) expect(thumb).toBeDisabled();
      await user.tab();
      expect(thumbs[0]).not.toHaveFocus();
      expect(thumbs[1]).not.toHaveFocus();
      await user.keyboard("{ArrowRight}{ArrowUp}");
      const control = getPart(container, "slider-control");
      fireEvent.pointerDown(control, {pointerId: 1, button: 0, buttons: 1, clientX: 180, clientY: 70});
      fireEvent.pointerMove(document, {pointerId: 1, buttons: 1, clientX: 210, clientY: 40});
      fireEvent.pointerUp(document, {pointerId: 1});
      expect(thumbs[0]).toHaveAttribute("aria-valuenow", "25");
      expect(thumbs[1]).toHaveAttribute("aria-valuenow", "75");
      expect(change).not.toHaveBeenCalled();
      expect(commit).not.toHaveBeenCalled();
      const form = container.querySelector("form");
      if (!form) throw new Error("Missing disabled form");
      expect(new FormData(form).getAll("disabled-range")).toEqual([]);
      expect(control).toHaveAttribute("data-disabled");
    },
  );

  it("renders without crashing", async () => {
    // Arrange
    await render(
      <Slider
        aria-label='Volume'
        defaultValue={[25]}
      />,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Volume"})).toBeInTheDocument();
    expect(await screen.findByRole("slider")).toBeInTheDocument();
  });

  it("forwards its ref to the slider root DOM element", async () => {
    // Arrange
    const ref = React.createRef<HTMLDivElement>();
    const {container} = await render(
      <Slider
        ref={ref}
        aria-label='Forwarded slider'
        defaultValue={[25]}
      />,
    );

    // Assert
    expect(ref.current).toBe(container.firstElementChild);
  });

  it("merges custom class names", async () => {
    // Arrange
    await render(
      <Slider
        aria-label='Styled slider'
        defaultValue={[25]}
        className='custom-slider'
      />,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Styled slider"})).toHaveClass("custom-slider");
  });

  it("updates value when changed with keyboard input", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: number[], eventDetails: unknown) => void>();

    await render(
      <Slider
        aria-label='Brightness'
        defaultValue={[20]}
        min={0}
        max={100}
        step={10}
        onValueChange={handleValueChange}
      />,
    );

    const slider = await screen.findByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Brightness"})).toBeInTheDocument();

    // Act
    act(() => slider.focus());
    await user.keyboard("{ArrowRight}");

    // Assert
    expect(slider).toHaveAttribute("aria-valuenow", "30");
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toEqual([30]);
  });

  it("marks disabled sliders with data-disabled", async () => {
    // Arrange
    const {container} = await render(
      <Slider
        aria-label='Disabled slider'
        defaultValue={[20]}
        disabled
      />,
    );

    // Assert
    expect(container.firstElementChild).toHaveAttribute("data-disabled");
  });

  it("supports keyboard adjustments with arrow keys", async () => {
    // Arrange
    const user = userEvent.setup();

    await render(
      <Slider
        aria-label='Contrast'
        defaultValue={[50]}
        min={0}
        max={100}
        step={10}
      />,
    );

    const slider = await screen.findByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Contrast"})).toBeInTheDocument();

    // Act
    act(() => slider.focus());
    await user.keyboard("{ArrowRight}{ArrowLeft}");

    // Assert
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("exposes accessible slider semantics", async () => {
    // Arrange
    await render(
      <Slider
        aria-label='Accessible slider'
        value={[40]}
        min={0}
        max={100}
      />,
    );

    const slider = await screen.findByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Accessible slider"})).toBeInTheDocument();
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveAttribute("aria-orientation", "horizontal");
    expect(slider).toHaveAttribute("aria-valuenow", "40");
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: number[]) => void>();

    function ControlledSlider(): React.JSX.Element {
      const [value, setValue] = React.useState<number[]>([20]);

      return (
        <Slider
          aria-label='Controlled slider'
          value={value}
          min={0}
          max={100}
          step={10}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            handleValueChange(nextValue);
          }}
        />
      );
    }

    await render(<ControlledSlider />);

    const slider = await screen.findByRole("slider");

    expect(slider).toHaveAttribute("aria-valuenow", "20");

    // Act
    act(() => slider.focus());
    await user.keyboard("{ArrowRight}");

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith([30]);
    expect(slider).toHaveAttribute("aria-valuenow", "30");
  });
});
