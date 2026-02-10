/**
 * @fileoverview Brand constants and shared primitives for React Email templates.
 * @module emails/components/brand
 */

export const BRAND = {
  name: "arolariu.ro",
  url: "https://arolariu.ro",
  supportEmail: "admin@arolariu.ro",
  location: "Bucharest, Romania",
  logoUrl:
    "https://di867tnz6fwga.cloudfront.net/brand-kits/071ab0be-ee67-4945-8807-29ecacfa97bc/primary/96729a74-5ced-4b21-bcc3-74e7d921cc03.png",
  tagline: "Your personal finance companion",
  signOff: "Warm regards",
  teamName: "The arolariu.ro Team",
} as const;

export const EMAIL_COLORS = {
  background: "#f8f9fa",
  cardBackground: "#ffffff",
  ink: "#0b0b0c",
  muted: "#666666",
  border: "#e9ecef",
  brandBlue: "#1124cb",
  brandPurple: "#b404ff",
  warningBackground: "#fff3cd",
  warningInk: "#856404",
} as const;

export const EMAIL_TYPOGRAPHY = {
  fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  monoFontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const;
