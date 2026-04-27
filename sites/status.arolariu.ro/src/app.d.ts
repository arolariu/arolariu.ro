/// <reference types="@sveltejs/kit" />

// Side-effect CSS imports (e.g. `import "../app.css";` in +layout.svelte)
// need a module declaration to satisfy `noUncheckedSideEffectImports` from
// the monorepo-root tsconfig. Vite/SvelteKit handle the actual loading —
// this file only tells TypeScript the module is a known extension.
declare module "*.css";

declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.scss";

declare global {
  namespace App {
    interface Error {}
    interface Locals {}
    interface PageData {}
    interface PageState {}
    interface Platform {}
  }
}

export {};
