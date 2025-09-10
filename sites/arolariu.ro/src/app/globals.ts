import en from "../../messages/en.json";

const locales = ["en", "ro"] as const;

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number];
    Messages: typeof en;
  }
}
