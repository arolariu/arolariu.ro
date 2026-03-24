import {create} from "storybook/theming";

const shared = {
  brandTitle: "@arolariu/components",
  brandUrl: "https://arolariu.ro",
  brandTarget: "_blank" as const,
  brandImage: "/logo.svg",
  appBorderRadius: 8,
  inputBorderRadius: 6,
  fontBase: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
  fontCode: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
};

export const darkTheme = create({
  ...shared,
  base: "dark",
  colorPrimary: "#3b82f6",
  colorSecondary: "#60a5fa",
  appBg: "#09090b",
  appContentBg: "#0a0a0a",
  appBorderColor: "#27272a",
  textColor: "#fafafa",
  textInverseColor: "#09090b",
  textMutedColor: "#a1a1aa",
  barBg: "#09090b",
  barTextColor: "#a1a1aa",
  barHoverColor: "#fafafa",
  barSelectedColor: "#60a5fa",
  inputBg: "#18181b",
  inputBorder: "#27272a",
  inputTextColor: "#fafafa",
});

export const lightTheme = create({
  ...shared,
  base: "light",
  colorPrimary: "#2563eb",
  colorSecondary: "#3b82f6",
  appBg: "#fafafa",
  appContentBg: "#ffffff",
  appBorderColor: "#e4e4e7",
  textColor: "#09090b",
  textInverseColor: "#fafafa",
  textMutedColor: "#71717a",
  barBg: "#ffffff",
  barTextColor: "#71717a",
  barHoverColor: "#09090b",
  barSelectedColor: "#2563eb",
  inputBg: "#ffffff",
  inputBorder: "#e4e4e7",
  inputTextColor: "#09090b",
});

export default darkTheme;
