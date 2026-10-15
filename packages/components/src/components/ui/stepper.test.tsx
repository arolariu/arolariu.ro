import {render, screen} from "@testing-library/react";
import * as React from "react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import {describe, expect, it} from "vitest";

import {Stepper} from "./stepper";
import styles from "./stepper.module.css";

type Theme = "light" | "dark";
const stepperCss = parse(readFileSync(join(import.meta.dirname, "stepper.module.css"), "utf8"));
const themeTokens: Record<Theme, Map<string, string>> = {light: new Map(), dark: new Map()};
parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
  if (rule.selector !== ":root" && !rule.selector.includes('[data-theme="dark"]')) return;
  const tokens = rule.selector === ":root" ? themeTokens.light : themeTokens.dark;
  rule.walkDecls((declaration) => {
    tokens.set(declaration.prop, declaration.value);
  });
});

// Default opaque OKLCH token model, using clipped linear sRGB like the token gate.
// This is not painted-pixel or custom-theme proof.
function tokenLuminance(theme: Theme, token: string): number {
  const value = themeTokens[theme].get(token);
  const match = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/u.exec(value ?? "");
  if (!match) throw new Error(`Missing opaque ${theme} token ${token}: ${value}`);
  const lightness = Number(match[1]);
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
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

describe("Stepper", () => {
  it.each(["light", "dark"] as const)("review correction: current-step outline contrasts with the default %s surface", (theme) => {
    render(
      <Stepper
        steps={["Start", "Review"]}
        activeStep={1}
      />,
    );
    const indicator = screen.getAllByRole("listitem")[1]?.querySelector('[aria-hidden="true"]');
    if (!(indicator instanceof HTMLElement)) throw new Error("Missing active-step indicator");
    const active: Record<string, string> = {};
    stepperCss.walkRules('.step[data-state="active"] .indicator', (rule) => {
      const selector = rule.selector.replaceAll(".step", `.${styles.step}`).replaceAll(".indicator", `.${styles.indicator}`);
      if (rule.parent?.type === "root" && indicator.matches(selector))
        rule.walkDecls((decl) => {
          active[decl.prop] = decl.value;
        });
    });
    const outline = /^2px solid var\((--ac-[\w-]+)\)$/u.exec(active["outline"] ?? "");
    if (!outline?.[1]) throw new Error(`Missing token-backed active outline: ${active["outline"]}`);
    expect(active["outline-offset"]).toBe("2px");
    const foreground = tokenLuminance(theme, outline[1]);
    const background = tokenLuminance(theme, "--ac-background");
    expect((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toBeGreaterThanOrEqual(3);
  });

  it("React 19 refresh: authors reduced-motion, forced-colors and wrapping progress styles", () => {
    const css = readFileSync(join(import.meta.dirname, "stepper.module.css"), "utf8");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("forced-colors: active");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("flex-wrap: wrap");
  });

  it("renders caller-localized completion text while retaining native attributes and refs", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <Stepper
        ref={ref}
        steps={["Compte", "Profil", "Vérification"]}
        activeStep={1}
        completedLabel='Terminé'
        aria-label='Progression de la configuration'
        id='setup-progress'
        title='Configuration'
        data-workflow='setup'
      />,
    );
    const list = screen.getByRole("list", {name: "Progression de la configuration"});
    const items = screen.getAllByRole("listitem");
    expect(ref.current).toBe(list);
    expect(list).toHaveAttribute("id", "setup-progress");
    expect(list).toHaveAttribute("title", "Configuration");
    expect(list).toHaveAttribute("data-workflow", "setup");
    expect(list).not.toHaveAttribute("completedLabel");
    expect(items[0]).toHaveTextContent("Compte Terminé");
    expect(items[0]).not.toHaveTextContent("Completed");
    expect(items[1]).not.toHaveTextContent("Terminé");
    expect(items[2]).not.toHaveTextContent("Terminé");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    unmount();
    expect(ref.current).toBeNull();
  });

  it("lets callers suppress completion text with an empty label", () => {
    render(
      <Stepper
        steps={["Cont", "Profil"]}
        activeStep={1}
        completedLabel=''
      />,
    );
    const completed = screen.getAllByRole("listitem")[0];
    expect(completed).toHaveAttribute("data-state", "completed");
    expect(completed).toHaveTextContent("✓Cont");
    expect(completed).not.toHaveTextContent("Completed");
  });

  it("exposes the active step as aria-current and readable completion text", () => {
    render(
      <Stepper
        steps={["One", "Two", "Three"]}
        activeStep={1}
        aria-label='Setup progress'
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[0]).toHaveTextContent("Completed");
    expect(screen.getByRole("list", {name: "Setup progress"})).toBeInTheDocument();
  });
  it("renders all step labels", () => {
    render(
      <Stepper
        steps={["One", "Two", "Three"]}
        activeStep={0}
      />,
    );

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
  });

  it("marks active step correctly", () => {
    render(
      <Stepper
        steps={["One", "Two"]}
        activeStep={1}
      />,
    );

    const items = screen.getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("data-state", "completed");
    expect(items[1]).toHaveAttribute("data-state", "active");
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLDivElement | null};

    render(
      <Stepper
        ref={ref}
        steps={["One"]}
        activeStep={0}
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("renders stepper with vertical orientation", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["One", "Two", "Three"]}
        activeStep={1}
        orientation='vertical'
        data-testid='stepper-vertical'
      />,
    );

    // Assert
    const stepper = screen.getByTestId("stepper-vertical");
    expect(stepper).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
  });

  it("marks all step states correctly (completed, active, upcoming)", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["First", "Second", "Third", "Fourth"]}
        activeStep={2}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("data-state", "completed");
    expect(items[1]).toHaveAttribute("data-state", "completed");
    expect(items[2]).toHaveAttribute("data-state", "active");
    expect(items[3]).toHaveAttribute("data-state", "upcoming");
  });

  it("shows checkmark for completed steps", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["One", "Two"]}
        activeStep={1}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("✓");
    expect(items[1]).toHaveTextContent("2");
  });

  it("renders stepper with custom className", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["One", "Two"]}
        activeStep={0}
        className='custom-stepper'
        data-testid='stepper'
      />,
    );

    // Assert
    const stepper = screen.getByTestId("stepper");
    expect(stepper).toHaveClass("custom-stepper");
  });

  it("does not render connector after last step", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["One", "Two", "Three"]}
        activeStep={0}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");
    // Check that the last item doesn't have a connector
    const lastItem = items[items.length - 1];
    expect(items).toHaveLength(3);
    expect(lastItem?.querySelector('[aria-hidden="true"].connector')).not.toBeInTheDocument();
  });

  it("renders with activeStep at 0", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["First", "Second"]}
        activeStep={0}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("data-state", "active");
    expect(items[1]).toHaveAttribute("data-state", "upcoming");
  });

  it("renders with activeStep at last index", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["First", "Second", "Third"]}
        activeStep={2}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("data-state", "completed");
    expect(items[1]).toHaveAttribute("data-state", "completed");
    expect(items[2]).toHaveAttribute("data-state", "active");
  });
});
