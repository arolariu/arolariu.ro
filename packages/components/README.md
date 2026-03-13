# ✨ @arolariu/components

<div align="center">

![npm version](https://img.shields.io/npm/v/@arolariu/components?style=for-the-badge&color=blue)
![npm downloads](https://img.shields.io/npm/dm/@arolariu/components?style=for-the-badge&color=green)
![bundle size](https://img.shields.io/bundlephobia/minzip/@arolariu/components?style=for-the-badge&color=orange)
![license](https://img.shields.io/npm/l/@arolariu/components?style=for-the-badge&color=purple)

![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=for-the-badge&logo=typescript)
![Tree Shakeable](https://img.shields.io/badge/Tree%20Shakeable-✅-brightgreen?style=for-the-badge)
![React 19 Ready](https://img.shields.io/badge/React%2019-Ready-61dafb?style=for-the-badge&logo=react)
![GitHub Stars](https://img.shields.io/github/stars/arolariu/arolariu.ro?style=for-the-badge&logo=github)

**Modern • Accessible • Production Ready**

_A comprehensive collection of 71+ beautifully crafted React components built on [Base UI](https://base-ui.com/) primitives, styled with CSS Modules, and designed for modern applications that demand both beauty and performance._

[🚀 Get Started](#-quick-start) • [📖 Documentation](#-component-catalog) • 🎨 Storybook demos (Coming soon) • [💡 Examples](#-usage-examples) • [🤝 Contributing](#-contributing)

</div>

---

## 🎯 Why Choose @arolariu/components?

**For Developers Who Care About Quality**

- **🎨 Beautiful by Default** - Carefully designed components that look great out of the box
- **♿ Accessibility First** - Built on Base UI primitives with strong keyboard and screen reader support
- **🧩 CSS Modules Architecture** - Scoped `.module.css` styling with no Tailwind dependency inside the library
- **🌈 OKLCH Design Tokens** - Theme every component with `--ac-*` CSS custom properties such as `--ac-primary` and `--ac-radius-md`
- **⚡ Performance Optimized** - Tree-shakeable exports, minimal bundle impact, and source maps included
- **🔧 Developer Experience** - Full TypeScript support, comprehensive docs, and debugging tools
- **🌙 Flexible Theming** - Light and dark mode via `.dark` or `[data-theme="dark"]`
- **🚀 Modern Stack** - React 18/19, ESM, SSR compatible, built with RSLib

**Version 1.0.0 is the first major release of the new Base UI + CSS Modules architecture.**

## 🚀 Quick Start

Get up and running with @arolariu/components in under 2 minutes.

### Installation

```bash
npm install @arolariu/components

# Peer dependencies (install if not already in your project)
npm install react react-dom @base-ui/react motion react-hook-form recharts
```

### Basic Setup

```tsx
import { Button } from "@arolariu/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@arolariu/components/card";
import styles from "./app-shell.module.css";

export default function MyApp() {
  return (
    <Card className={styles.card}>
      <CardHeader>
        <CardTitle>Welcome to @arolariu/components 1.0.0</CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <Button>Get Started</Button>
      </CardContent>
    </Card>
  );
}
```

```css
/* app-shell.module.css */
.card {
  width: min(24rem, 100%);
}

.content {
  display: flex;
  justify-content: flex-start;
}
```

### Add Styles (Required)

```tsx
// Import design tokens only (colors, spacing, radii)
import "@arolariu/components/styles";

// Components auto-load their CSS when imported
import { Button, Card } from "@arolariu/components";
```

`@arolariu/components/styles` provides design tokens only. Component CSS is loaded automatically when you import components.

### Optional Theme Overrides

```css
/* app-theme.css */
:root {
  --ac-primary: oklch(0.62 0.21 262);
  --ac-primary-foreground: oklch(0.99 0.01 260);
  --ac-radius-md: 0.75rem;
}

.dark {
  --ac-background: oklch(0.18 0.01 286);
  --ac-foreground: oklch(0.98 0 0);
}
```

**That's it.** 🎉 You bring your app layout styles with CSS Modules, and the library provides component styling and tokens.

---

## 📖 Component Catalog

Explore our collection of **71+ components** organized by category.

### 🎨 Layout & Structure

| Component       | Description                             | Import                              |
| --------------- | --------------------------------------- | ----------------------------------- |
| **Card**        | Flexible container for grouping content | `@arolariu/components/card`         |
| **AspectRatio** | Maintain consistent aspect ratios       | `@arolariu/components/aspect-ratio` |
| **Separator**   | Visual dividers for content sections    | `@arolariu/components/separator`    |
| **Resizable**   | Split panes with resizable dividers     | `@arolariu/components/resizable`    |

### 🎭 Interactive Elements

| Component    | Description                               | Import                          |
| ------------ | ----------------------------------------- | ------------------------------- |
| **Button**   | Primary action triggers with variants     | `@arolariu/components/button`   |
| **Input**    | Text input fields with validation support | `@arolariu/components/input`    |
| **Checkbox** | Binary choice selections                  | `@arolariu/components/checkbox` |
| **Select**   | Dropdown selection menus                  | `@arolariu/components/select`   |
| **Slider**   | Range input controls                      | `@arolariu/components/slider`   |

### 🧭 Navigation

| Component          | Description                    | Import                                 |
| ------------------ | ------------------------------ | -------------------------------------- |
| **Tabs**           | Tabbed content navigation      | `@arolariu/components/tabs`            |
| **Breadcrumb**     | Hierarchical navigation trails | `@arolariu/components/breadcrumb`      |
| **NavigationMenu** | Complex dropdown navigation    | `@arolariu/components/navigation-menu` |
| **Sidebar**        | Collapsible side navigation    | `@arolariu/components/sidebar`         |
| **Menubar**        | Application and editor menus   | `@arolariu/components/menubar`         |

### 📦 Overlays & Dialogs

| Component      | Description                        | Import                            |
| -------------- | ---------------------------------- | --------------------------------- |
| **Dialog**     | Modal dialogs and confirmations    | `@arolariu/components/dialog`     |
| **Sheet**      | Slide-out panels from screen edges | `@arolariu/components/sheet`      |
| **Popover**    | Floating content containers        | `@arolariu/components/popover`    |
| **Tooltip**    | Contextual information on hover    | `@arolariu/components/tooltip`    |
| **DropDrawer** | Advanced drawer with drop zones    | `@arolariu/components/dropdrawer` |

### 📊 Data Display

| Component    | Description                            | Import                          |
| ------------ | -------------------------------------- | ------------------------------- |
| **Table**    | Data tables with sorting/pagination    | `@arolariu/components/table`    |
| **Calendar** | Date selection and navigation          | `@arolariu/components/calendar` |
| **Avatar**   | User profile pictures and placeholders | `@arolariu/components/avatar`   |
| **Badge**    | Status indicators and labels           | `@arolariu/components/badge`    |
| **Chart**    | Data visualization components          | `@arolariu/components/chart`    |

### 🎛️ Form Controls

| Component        | Description                               | Import                               |
| ---------------- | ----------------------------------------- | ------------------------------------ |
| **Form**         | Form validation and management            | `@arolariu/components/form`          |
| **Field**        | Form field layout primitives              | `@arolariu/components/field`         |
| **InputOTP**     | One-time password input fields            | `@arolariu/components/input-otp`     |
| **InputGroup**   | Grouped text inputs and actions           | `@arolariu/components/input-group`   |
| **RadioGroup**   | Single-choice option groups               | `@arolariu/components/radio-group`   |
| **Switch**       | Toggle switches for binary options        | `@arolariu/components/switch`        |
| **Textarea**     | Multi-line text input areas               | `@arolariu/components/textarea`      |
| **ToggleGroup**  | Coordinated toggle button groups          | `@arolariu/components/toggle-group`  |

### 💬 Feedback & Status

| Component    | Description                     | Import                          |
| ------------ | ------------------------------- | ------------------------------- |
| **Alert**    | Important message notifications | `@arolariu/components/alert`    |
| **Progress** | Task completion indicators      | `@arolariu/components/progress` |
| **Skeleton** | Loading state placeholders      | `@arolariu/components/skeleton` |
| **Toaster**  | Base UI-backed toast system     | `@arolariu/components/sonner`   |
| **Spinner**  | Loading indicators              | `@arolariu/components/spinner`  |

### 🎪 Animated Backgrounds

| Component               | Description                     | Import                                      |
| ----------------------- | ------------------------------- | ------------------------------------------- |
| **DotBackground**       | Animated dot matrix backgrounds | `@arolariu/components/dot-background`       |
| **BubbleBackground**    | Floating bubble animations      | `@arolariu/components/bubble-background`    |
| **FireworksBackground** | Particle explosion effects      | `@arolariu/components/fireworks-background` |
| **GradientBackground**  | Dynamic gradient animations     | `@arolariu/components/gradient-background`  |

**Storybook demos:** Coming soon.

---

## 🔄 Migrating from v0.x

- `@radix-ui/*` has been replaced internally with `@base-ui/react`; this is automatic and does not require consumer changes.
- `tailwindcss` is no longer a peer dependency.
- `asChild` still works for backward compatibility, but the `render` prop is now the preferred composition API.
- The `sonner` toast API is preserved through the compatibility wrapper exported from `@arolariu/components/sonner`.
- If you previously used `badgeVariants` or `buttonVariants`, migrate to component props such as `variant` and `size` instead.
- CSS custom properties now use the `--ac-*` prefix.

---

## 🏗️ Architecture

### Primitives

- **Base layer**: [`@base-ui/react`](https://base-ui.com/) provides the primitive building blocks
- **Composition**: Base UI's `render` prop is the preferred composition API
- **Backward compatibility**: `asChild` is still supported where available as a shim for Radix-era usage

### Styling

- Each component is styled with a colocated **CSS Module** such as `button.module.css`
- `className` remains the public extension point for consumer overrides
- Base UI state attributes such as `[data-open]`, `[data-disabled]`, `[data-checked]`, and `[data-selected]` drive stateful styling
- `cn()` now uses **`clsx` only** for predictable class composition

### Theming

- Design tokens live in `src/index.css`
- Theme tokens use the `--ac-` prefix, for example:
  - `--ac-primary`
  - `--ac-background`
  - `--ac-radius-md`
  - `--ac-chart-1`
- Dark mode is activated with either:
  - a `.dark` class
  - or a `[data-theme="dark"]` attribute

### Build & Distribution

- Built with **RSLib** using ESM output
- Tree-shakeable direct imports for components
- TypeScript declarations and source maps included

### Common Import Paths

```tsx
import { Button } from "@arolariu/components/button";
import { useIsMobile } from "@arolariu/components/useIsMobile";
import { cn } from "@arolariu/components/utilities";
import { hexToHsl } from "@arolariu/components/color-conversion-utilities";
```

---

## 💡 Usage Examples

### Building a Login Form

```tsx
import { useState } from "react";

import { Alert, AlertDescription } from "@arolariu/components/alert";
import { Button } from "@arolariu/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@arolariu/components/card";
import { Checkbox } from "@arolariu/components/checkbox";
import { Input } from "@arolariu/components/input";
import { Label } from "@arolariu/components/label";
import styles from "./login-form.module.css";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className={styles.wrapper}>
      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
        </CardHeader>
        <CardContent className={styles.content}>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className={styles.field}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className={styles.checkboxRow}>
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
            />
            <Label htmlFor="remember">Remember me</Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button className={styles.submitButton}>Sign In</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### Data Dashboard

```tsx
import { Badge } from "@arolariu/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@arolariu/components/card";
import { Progress } from "@arolariu/components/progress";
import styles from "./dashboard.module.css";

export function Dashboard() {
  return (
    <div className={styles.grid}>
      <Card>
        <CardHeader>
          <CardTitle className={styles.titleRow}>
            Sales <Badge variant="secondary">+12%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className={styles.stack}>
          <Progress value={75} />
          <p className={styles.mutedText}>75% of monthly goal</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Health</CardTitle>
        </CardHeader>
        <CardContent className={styles.stack}>
          <p className={styles.metric}>24 active contributors</p>
          <p className={styles.mutedText}>Using `--ac-*` tokens and Base UI primitives across the app</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Interactive Navigation

```tsx
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@arolariu/components/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@arolariu/components/sheet";
import { MenuIcon } from "lucide-react";
import styles from "./app-header.module.css";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <h1 className={styles.brand}>My App</h1>

        <NavigationMenu className={styles.desktopNav}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink href="/">Home</NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="/about">About</NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <Sheet>
          <SheetTrigger render={<button type="button" className={styles.mobileTrigger} />}>
            <MenuIcon />
          </SheetTrigger>
          <SheetContent>
            <nav className={styles.mobileNav}>
              <a href="/">Home</a>
              <a href="/about">About</a>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
```

---

## 🛠️ Advanced Features

### Tree Shaking & Bundle Optimization

**@arolariu/components** is built with bundle optimization in mind.

```tsx
// ✅ Optimal: import only what you need
import { Button } from "@arolariu/components/button";
import { Card } from "@arolariu/components/card";

// ❌ Avoid when bundle size matters
import { Button, Card } from "@arolariu/components";
```

**Bundle Impact**

- Individual components: typically a few KB gzipped
- Full library: importable as ESM
- With tree shaking: only pay for what you use

### TypeScript Integration

Full TypeScript support with intelligent autocomplete.

```tsx
import { Button, type ButtonProps } from "@arolariu/components/button";
import { cn } from "@arolariu/components/utilities";
import styles from "./custom-button.module.css";

interface CustomButtonProps extends ButtonProps {
  icon?: React.ReactNode;
}

export function CustomButton({
  icon,
  children,
  className,
  ...props
}: CustomButtonProps) {
  return (
    <Button
      className={cn(styles.customButton, className)}
      {...props}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span>{children}</span>
    </Button>
  );
}
```

### Server-Side Rendering (SSR)

Compatible with **Next.js**, **Remix**, and other SSR frameworks.

```tsx
// app/page.tsx
import { Button } from "@arolariu/components/button";
import { Card, CardContent } from "@arolariu/components/card";

export default function HomePage() {
  return (
    <Card>
      <CardContent>
        <Button>Server-rendered Button</Button>
      </CardContent>
    </Card>
  );
}
```

### Theming & Customization

Built around **OKLCH CSS custom properties** and **CSS Modules**.

```css
/* theme-overrides.module.css */
.themeScope {
  --ac-primary: oklch(0.7 0.19 250);
  --ac-primary-foreground: oklch(0.99 0.01 250);
  --ac-muted: oklch(0.96 0.01 286);
  --ac-radius-md: 0.875rem;
}
```

```tsx
import { Button } from "@arolariu/components/button";
import styles from "./theme-overrides.module.css";

export function ThemedExample() {
  return (
    <section className={styles.themeScope}>
      <Button>Custom themed button</Button>
    </section>
  );
}
```

---

## 🔍 Debugging & Development

### Complete Source Map Support

**Debug like a pro** with comprehensive development tools.

- ✅ **JavaScript source maps** for accurate debugging
- ✅ **CSS source maps** for CSS Module debugging
- ✅ **TypeScript declaration maps** for IDE IntelliSense
- ✅ **Original source access** via included `src/` directory

### Browser DevTools Integration

```tsx
import { Button } from "@arolariu/components/button";

function MyComponent() {
  return <Button onClick={() => console.log("Clicked!")}>Debug Me</Button>;
}
```

Inspect generated class names, Base UI data attributes, and source-mapped module styles directly in DevTools.

📖 **[Full Debugging Guide](./DEBUGGING.md)** - Learn advanced debugging techniques.

---

## 🌐 Browser Support

**Modern browsers only** for optimal performance.

| Browser            | Version     |
| ------------------ | ----------- |
| 🌟 **Chrome/Edge** | 90+ (2021+) |
| 🦊 **Firefox**     | 88+ (2021+) |
| 🧭 **Safari**      | 14+ (2020+) |

**Why modern browsers?** The library uses modern ESM output, CSS custom properties, and contemporary platform APIs for smaller bundles and better performance.

---

## 🤝 Contributing

We welcome contributions. Help make @arolariu/components even better.

### Quick Start for Contributors

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/arolariu.ro.git
cd arolariu.ro/packages/components

# 2. Install dependencies
npm install

# 3. Start development environment
npm run build:components
npm run dev:components

# 4. Make your changes and test
npm run build:components
```

### Ways to Contribute

- 🐛 **Report bugs** - Found an issue? [Open an issue](https://github.com/arolariu/arolariu.ro/issues)
- 💡 **Suggest features** - Have an idea? We'd love to hear it
- 🔧 **Fix issues** - Browse [open issues](https://github.com/arolariu/arolariu.ro/issues) and submit PRs
- 📖 **Improve docs** - Help make our documentation clearer
- 🎨 **Add components** - Contribute new components following our patterns

### Component Development Guidelines

1. **Follow accessibility standards** - Use Base UI primitives when appropriate
2. **Include TypeScript types** - Full type definitions required
3. **Add stories or demos** - Document variants and use cases
4. **Write tests** - Ensure components work correctly
5. **Follow naming conventions** - Use clear, descriptive names
6. **Prefer CSS Modules** - Keep component styles colocated and token-driven

**[Read our full contributing guide →](./CONTRIBUTING.md)**

---

## 📦 Package Details

### Bundle Information

```bash
# Package size analysis
npm install @arolariu/components
npx bundlephobia @arolariu/components
```

**Key Stats**

- 📦 **Version**: 1.0.0
- 🌲 **Tree-shakeable**: import only what you need
- 📝 **TypeScript**: typed package with declaration output
- ♿ **Accessibility**: Base UI-backed primitives and patterns
- 🎭 **Styling**: CSS Modules + package-level design tokens
- 🌙 **Theming**: `--ac-*` tokens with `.dark` and `[data-theme="dark"]` support

### Dependencies

Core runtime dependencies include:

- **@base-ui/react** - Accessible component primitives in a single package
- **clsx** - Class name composition used by `cn()`
- **lucide-react** - Icon set
- **motion** - Animation library
- **react-hook-form** and **zod** - Forms and validation helpers
- **embla-carousel-react**, **recharts**, **react-day-picker**, **input-otp**, **react-resizable-panels**, **shiki** - Specialized UI integrations

Removed from the 1.0.0 architecture:

- `@radix-ui/*`
- `tailwind-merge`
- `class-variance-authority`
- `tailwindcss-animate`
- `vaul`
- `sonner`
- `cmdk`

---

## 📄 License

**MIT License** - Use freely in personal and commercial projects.

```
MIT License

Copyright (c) 2025 Alexandru-Razvan Olariu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

[**View full license →**](./LICENSE)

---

## 👨‍💻 About the Author

**Alexandru-Razvan Olariu**

Senior Software Engineer passionate about creating beautiful, accessible user interfaces and developer tools.

- 🌐 **Website**: [arolariu.ro](https://arolariu.ro)
- 💻 **GitHub**: [@arolariu](https://github.com/arolariu)
- 💼 **LinkedIn**: [Alexandru-Razvan Olariu](https://www.linkedin.com/in/olariu-alexandru/)
- 📧 **Email**: [admin@arolariu.ro](mailto:admin@arolariu.ro)

---

## 🙏 Acknowledgments & Inspiration

This library wouldn't exist without these amazing projects.

- 🎨 **[Base UI](https://base-ui.com/)** - Accessible component primitives
- 💫 **[shadcn/ui](https://ui.shadcn.com/)** - Component design patterns and inspiration
- 🎭 **CSS Modules** - Scoped styling model used throughout the library
- ⚡ **[Motion](https://motion.dev/)** - Animation library for React
- 🛠️ **[Rslib](https://rslib.dev/)** - Fast, modern bundling with Rsbuild
- 📖 **[Storybook](https://storybook.js.org/)** - Component development environment
- 🎪 **[Magic UI](https://magicui.design/)** - Additional component inspiration
- ✨ **[Aceternity UI](https://ui.aceternity.com/)** - Creative component patterns

**Special thanks** to the open-source community for making all of this possible. 💜

---

<div align="center">

## ⭐ Star the Project

If **@arolariu/components** helps you build better UIs, please consider giving it a star on GitHub.

[![GitHub stars](https://img.shields.io/github/stars/arolariu/arolariu.ro?style=social)](https://github.com/arolariu/arolariu.ro)

**[⭐ Star on GitHub](https://github.com/arolariu/arolariu.ro)** • **[📖 View Component Catalog](#-component-catalog)** • **[🐛 Report Issues](https://github.com/arolariu/arolariu.ro/issues)**

---

**Built with ❤️ for the React community**

_Making beautiful, accessible UIs easier to build, one component at a time._

</div>
