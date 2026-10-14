import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {parse} from "postcss";
import {describe, expect, it} from "vitest";

type Theme = "light" | "dark";

const themes: Record<Theme, Map<string, string>> = {light: new Map(), dark: new Map()};
parse(readFileSync(resolve(import.meta.dirname, "index.css"), "utf8")).walkRules((rule) => {
  if (rule.selector !== ":root" && !rule.selector.includes('[data-theme="dark"]')) return;
  const theme = rule.selector === ":root" ? themes.light : themes.dark;
  rule.walkDecls((declaration) => {
    theme.set(declaration.prop, declaration.value);
  });
});

// WCAG luminance from the package's opaque OKLCH tokens, in clipped linear sRGB.
// Translucent states, gamut mapping and actual adjacent pixels still need browser evaluation.
function luminance(theme: Theme, token: string): number {
  const value = themes[theme].get(`--ac-${token}`);
  if (!value) throw new Error(`Missing ${theme} token: ${token}`);
  const match = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/u.exec(value);
  if (!match) throw new Error(`Expected an opaque OKLCH color for ${theme} ${token}: ${value}`);
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

function contrast(theme: Theme, foreground: string, background: string): number {
  const first = luminance(theme, foreground);
  const second = luminance(theme, background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const textPairs = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["success-foreground", "success"],
  ["warning-foreground", "warning"],
  ["info-foreground", "info"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
] as const;

describe.each(["light", "dark"] as const)("%s default design-token accessibility", (theme) => {
  it.each(textPairs)("provides 4.5:1 ordinary text contrast for %s on %s", (foreground, background) => {
    expect(contrast(theme, foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["input", "background"],
    ["ring", "background"],
    ["sidebar-ring", "sidebar"],
  ] as const)("provides 3:1 essential control/focus contrast for %s on %s", (foreground, background) => {
    expect(contrast(theme, foreground, background)).toBeGreaterThanOrEqual(3);
  });
});
