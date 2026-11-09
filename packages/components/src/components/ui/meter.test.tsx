import {render, screen} from "@testing-library/react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it, vi} from "vitest";

import {Meter, MeterIndicator, MeterLabel, MeterTrack} from "./meter";
import styles from "./meter.module.css";
import * as stories from "./meter.stories";

const {WithLabel} = composeStories(stories);

type Theme = "light" | "dark";
type Oklch = readonly [lightness: number, chroma: number, hue: number];
const meterCss = parse(readFileSync(join(import.meta.dirname, "meter.module.css"), "utf8"));
const themeTokens: Record<Theme, Map<string, string>> = {light: new Map(), dark: new Map()};
parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
  if (rule.selector !== ":root" && !rule.selector.includes('[data-theme="dark"]')) return;
  const tokens = rule.selector === ":root" ? themeTokens.light : themeTokens.dark;
  rule.walkDecls((declaration) => {
    tokens.set(declaration.prop, declaration.value);
  });
});

function authoredPaint(element: HTMLElement): Record<string, string> {
  const declarations: Record<string, string> = {};
  meterCss.walkRules((rule) => {
    // Forced-colors and reduced-motion overrides are separate contracts.
    if (rule.parent?.type !== "root") return;
    const selector = rule.selector.replace(/\.([a-z][\w-]*)/giu, (_, name: string) => {
      const className = styles[name];
      if (!className) throw new Error(`Missing meter class: ${name}`);
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

function stopColor(theme: Theme, stop: string): Oklch {
  const token = /^var\((--ac-[\w-]+)\)$/u.exec(stop)?.[1];
  if (token) return oklchToken(theme, token);
  const mixed = /^color-mix\(in oklch, var\((--ac-[\w-]+)\), white (\d+)%\)$/u.exec(stop);
  if (mixed?.[1] && mixed[2]) return mixOklch(oklchToken(theme, mixed[1]), [1, 0, 0], 1 - Number(mixed[2]) / 100);
  throw new Error(`Unmodelled meter gradient stop: ${stop}`);
}

function gradientStops(background: string | undefined): string[] {
  const body = /^linear-gradient\((.*)\)$/u.exec(background ?? "")?.[1];
  if (!body) throw new Error(`Expected a linear-gradient fill: ${background}`);
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (const [index, character] of [...body].entries()) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(body.slice(start).trim());
  // Drop the direction and each stop position, keeping only the colours.
  return parts.slice(1).map((stop) => stop.replace(/\s+[\d.]+%$/u, ""));
}

// Same default-token model as `src/styles.test.ts`: opaque OKLCH in clipped linear sRGB.
// Gamut mapping, consumer themes and actual painted pixels still need browser evaluation.
function luminance([lightness, chroma, hueDegrees]: Oklch): number {
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

function contrast(first: Oklch, second: Oklch): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each(["light", "dark"] as const)("review correction: Meter fill in %s defaults", (theme) => {
  it("keeps every gradient stop of the value indicator at 3:1 against the secondary track", () => {
    render(
      <Meter
        aria-label='Storage usage'
        value={70}>
        <MeterTrack data-testid='track'>
          <MeterIndicator data-testid='indicator' />
        </MeterTrack>
      </Meter>,
    );
    const track = authoredPaint(screen.getByTestId("track"))["background-color"];
    const stops = gradientStops(authoredPaint(screen.getByTestId("indicator"))["background"]);
    expect(track).toBe("var(--ac-secondary)");
    expect(stops).toHaveLength(2);
    for (const stop of stops) {
      expect(contrast(stopColor(theme, stop), oklchToken(theme, "--ac-secondary"))).toBeGreaterThanOrEqual(3);
      expect(stop).toContain("var(--ac-primary-emphasis)");
    }
  });
});

describe("Meter", () => {
  it.each(["root", "track", "indicator", "label"])("supplies owning props and the real empty Meter state to %s", (part) => {
    render(
      <Meter
        value={70}
        className={(state) => `root-state-${Object.keys(state).length}`}
        render={(props, state) => (
          <div
            {...props}
            data-testid='root'
            data-render-role={props.role}
            data-state-keys={Object.keys(state).length}
          />
        )}>
        <MeterLabel
          className={(state) => `label-state-${Object.keys(state).length}`}
          render={(props, state) => (
            <span
              {...props}
              data-testid='label'
              data-render-role={props.role}
              data-state-keys={Object.keys(state).length}
            />
          )}>
          Storage usage
        </MeterLabel>
        <MeterTrack
          className={(state) => `track-state-${Object.keys(state).length}`}
          render={(props, state) => (
            <div
              {...props}
              data-testid='track'
              data-has-children={String(Boolean(props.children))}
              data-state-keys={Object.keys(state).length}
            />
          )}>
          <MeterIndicator
            className={(state) => `indicator-state-${Object.keys(state).length}`}
            render={(props, state) => (
              <div
                {...props}
                data-testid='indicator'
                data-render-width={props.style?.width}
                data-state-keys={Object.keys(state).length}
              />
            )}
          />
        </MeterTrack>
      </Meter>,
    );

    const element = screen.getByTestId(part);
    if (part === "root") expect(element).toHaveAttribute("data-render-role", "meter");
    if (part === "label") expect(element).toHaveAttribute("data-render-role", "presentation");
    if (part === "track") expect(element).toHaveAttribute("data-has-children", "true");
    if (part === "indicator") expect(element).toHaveAttribute("data-render-width", "70%");
    expect(element).toHaveAttribute("data-state-keys", "0");
    expect(element).toHaveClass(`${part}-state-0`);
  });

  it.each(["element", "callback"] as const)("preserves every %s-rendered part's children, classes, DOM refs and ref cleanup", (mode) => {
    const attached: HTMLElement[] = [];
    const cleaned = vi.fn<(node: HTMLElement) => void>();
    const renderCleaned = vi.fn<(node: HTMLElement) => void>();
    const ref = (node: HTMLElement | null): (() => void) | undefined => {
      if (!node) return undefined;
      attached.push(node);
      return () => cleaned(node);
    };
    const renderRef = (node: HTMLElement | null): (() => void) | undefined => (node ? () => renderCleaned(node) : undefined);
    const {unmount} = render(
      <Meter
        ref={ref}
        value={40}
        className='root-custom'
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
        <MeterLabel
          ref={ref}
          className='label-custom'
          render={
            mode === "element" ? (
              <span
                ref={renderRef}
                className='label-render'>
                Rendered label
              </span>
            ) : (
              (props) => <span {...props} />
            )
          }>
          Wrapper label
        </MeterLabel>
        <MeterTrack
          ref={ref}
          data-testid='track'
          className='track-custom'
          render={
            mode === "element" ? (
              <div
                ref={renderRef}
                className='track-render'
              />
            ) : (
              (props) => <div {...props} />
            )
          }>
          <MeterIndicator
            ref={ref}
            data-testid='indicator'
            className='indicator-custom'
            render={
              mode === "element" ? (
                <div
                  ref={renderRef}
                  className='indicator-render'
                />
              ) : (
                (props) => <div {...props} />
              )
            }>
            Indicator content
          </MeterIndicator>
        </MeterTrack>
      </Meter>,
    );
    const label = screen.getByText(mode === "element" ? "Rendered label" : "Wrapper label");
    const root = screen.getByRole("meter", {name: label.textContent ?? ""});
    const parts = {root, label, track: screen.getByTestId("track"), indicator: screen.getByTestId("indicator")};
    for (const [part, node] of Object.entries(parts)) {
      expect(attached).toContain(node);
      expect(node).toHaveClass(`${part}-custom`);
      if (mode === "element") expect(node).toHaveClass(`${part}-render`);
    }
    expect(parts.track).toContainElement(parts.indicator);
    expect(parts.indicator).toHaveTextContent("Indicator content");
    expect(parts.indicator).toHaveStyle({width: "40%"});

    unmount();
    for (const node of Object.values(parts)) {
      expect(cleaned).toHaveBeenCalledWith(node);
      if (mode === "element") expect(renderCleaned).toHaveBeenCalledWith(node);
    }
    expect(cleaned).toHaveBeenCalledTimes(4);
    expect(renderCleaned).toHaveBeenCalledTimes(mode === "element" ? 4 : 0);
  });

  it("updates controlled value, bounds, label association and localized accessible text", () => {
    const getValueText = (formatted: string, value: number): string => `${formatted} (${value})`;
    const fixture = (value: number): React.ReactElement => (
      <Meter
        value={value}
        min={10}
        max={110}
        locale='de-DE'
        format={{maximumFractionDigits: 1}}
        getAriaValueText={getValueText}>
        <MeterLabel>Capacity</MeterLabel>
        <MeterTrack>
          <MeterIndicator data-testid='indicator' />
        </MeterTrack>
      </Meter>
    );
    const {rerender} = render(fixture(35.5));
    const root = screen.getByRole("meter", {name: "Capacity"});
    expect(root).toHaveAttribute("aria-valuemin", "10");
    expect(root).toHaveAttribute("aria-valuemax", "110");
    expect(root).toHaveAttribute("aria-valuenow", "35.5");
    expect(root).toHaveAttribute("aria-valuetext", "35,5 (35.5)");
    expect(root).toHaveAttribute("aria-labelledby", screen.getByText("Capacity").id);
    expect(screen.getByTestId("indicator")).toHaveStyle({width: "25.5%"});

    rerender(fixture(90));
    expect(root).toHaveAttribute("aria-valuenow", "90");
    expect(root).toHaveAttribute("aria-valuetext", "90 (90)");
    expect(screen.getByTestId("indicator")).toHaveStyle({width: "80%"});
  });

  it("renders the WithLabel story with its label inside the owning root", () => {
    const {container} = render(<WithLabel />);
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-meter-storyContainer");
    expect(screen.getByRole("meter", {name: "CPU Usage"})).toHaveAttribute("aria-valuenow", "65");
  });

  function renderMeter(className?: string): void {
    render(
      <Meter
        aria-label='Storage usage'
        className={className}
        max={100}
        min={0}
        value={70}>
        <MeterLabel>Storage usage</MeterLabel>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toBeInTheDocument();
  });

  it("exposes the current value", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toHaveAttribute("aria-valuenow", "70");
  });

  it("merges the root className", () => {
    // Arrange
    renderMeter("custom-meter");

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toHaveClass("custom-meter");
  });

  it("renders label children", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByText("Storage usage")).toBeInTheDocument();
  });
});
