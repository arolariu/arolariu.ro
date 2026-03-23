import {create} from "storybook/theming";

export default create({
  base: "dark",
  brandTitle: "@arolariu/components",
  brandUrl: "https://arolariu.ro",
  brandTarget: "_blank",

  // Colors
  colorPrimary: "#2563eb",
  colorSecondary: "#3b82f6",

  // UI
  appBg: "#0a0a0a",
  appContentBg: "#111111",
  appBorderColor: "#27272a",
  appBorderRadius: 8,

  // Text
  textColor: "#fafafa",
  textInverseColor: "#09090b",
  textMutedColor: "#a1a1aa",

  // Toolbar
  barBg: "#111111",
  barTextColor: "#a1a1aa",
  barHoverColor: "#fafafa",
  barSelectedColor: "#3b82f6",

  // Form
  inputBg: "#18181b",
  inputBorder: "#27272a",
  inputTextColor: "#fafafa",
  inputBorderRadius: 6,
});
