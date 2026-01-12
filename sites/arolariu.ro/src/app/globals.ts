/**
 * @fileoverview next-intl module augmentation and locale typing.
 * @module sites/arolariu.ro/src/app/globals
 *
 * @remarks
 * Declares the supported locales and wires the message schema into next-intl types.
 */

import en from "../../messages/en.json";

const locales = ["en", "ro"] as const;

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number];
    Messages: typeof en;
  }
}
