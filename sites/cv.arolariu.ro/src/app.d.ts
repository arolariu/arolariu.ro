/**
 * @fileoverview SvelteKit global type augmentations for the CV site.
 * @module sites/cv.arolariu.ro/src/app
 */

/// <reference types="svelte-adapter-azure-swa" />

declare global {
  namespace App {}
}

declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.scss";

export {};
