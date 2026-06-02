// Ambient declarations for style imports. Lets TypeScript accept
// side-effect imports (`import "./globals.scss"`) and CSS-Modules imports
// (`import styles from "./x.module.scss"`) without `@ts-ignore`.

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.scss" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

// Raw-text imports (e.g., `import csv from "./file.csv?raw"`).
// Supported by Turbopack (Next.js) and Vite (Vitest) out of the box;
// the `?raw` query suffix tells the bundler to embed the file's text
// content as a string literal at build time.
declare module "*?raw" {
  const content: string;
  export default content;
}
