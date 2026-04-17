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
