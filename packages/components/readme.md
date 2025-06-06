# ✨ @arolariu/components ✨

![npm version](https://img.shields.io/npm/v/@arolariu/components)
![license](https://img.shields.io/npm/l/@arolariu/components)
![bundle size](https://img.shields.io/bundlephobia/minzip/@arolariu/components)
![types](https://img.shields.io/npm/types/@arolariu/components)
![downloads](https://img.shields.io/npm/dm/@arolariu/components)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Tree-Shakeable](https://img.shields.io/badge/tree--shakeable-true-brightgreen.svg)
![GitHub Stars](https://img.shields.io/github/stars/arolariu/arolariu.ro?style=social)

A collection of reusable, accessible UI components for React applications, built on top of [Radix UI](https://www.radix-ui.com/) primitives and inspired by [shadcn/ui](https://ui.shadcn.com/).

## 📚 Table of Contents

- Features
- Installation
- Usage
- Available Components
- Component Documentation
- TypeScript Support
- Server-Side Rendering
- Browser Support
- Contributing
- License
- Author
- Acknowledgments

## 🚀 Features

- **🌲 Fully Tree-Shakeable** - Import only the components you need
- **📝 TypeScript Support** - Full type definitions for all components
- **📦 Multiple Module Formats** - ESM, CommonJS, and UMD support
- **♿ Accessibility** - Built on Radix UI primitives with their ARIA compliance standard
- **🎨 Customizable** - Override styles with Tailwind CSS and/or your styling methods
- **🔄 Modern** - Designed for React 18+ and modern (year 2020+) browsers
- **🪶 Zero Runtime CSS** - Uses Tailwind for styling
- **🖥️ Server-Side Rendering Compatible** - Works with Next.js and other SSR frameworks

## 📥 Installation

Choose your preferred package manager:

```bash
# npm
npm install @arolariu/components

# yarn
yarn add @arolariu/components

# pnpm
pnpm add @arolariu/components
```

## 🧩 Usage

### Basic Import

```tsx
import { Button } from "@arolariu/components/button";
import { Card, CardHeader, CardTitle
  CardDescription, CardFooter
 } from "@arolariu/components/card";

export default function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button>Click Me</Button>
      </CardFooter>
    </Card>
  );
}
```

### Tree-Shaking

For optimal bundle size, import components directly:

```tsx
// ✅ Good: Only imports the Button component
import { Button } from "@arolariu/components/button";

// ❌ Avoid: Imports all the components
import { Button } from "@arolariu/components";
```

## 🧰 Available Components

This library includes over 60 components, organized by category:

| Category         | Components                                                        |
| ---------------- | ----------------------------------------------------------------- |
| **Layout**       | `Card`, `AspectRatio`, `Separator`, `Resizable`                   |
| **Background**   | `HoleBackground`, `DotBackground`, `GradientBackground`           |
| **Inputs**       | `Button`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select` |
| **Navigation**   | `Breadcrumb`, `Tabs`, `NavigationMenu`, `Sidebar`                 |
| **Overlays**     | `Dialog`, `Drawer`, `Sheet`, `Popover`, `Tooltip`                 |
| **Feedback**     | `Alert`, `Progress`, `Skeleton`                                   |
| **Data Display** | `Table`, `Calendar`, `Avatar`, `Badge`                            |
| **Advanced**     | `Form`, `Command`, `Chart`, `Carousel`                            |

## 📖 Component Documentation

Each component can be imported individually:

```tsx
// Buttons
import { Button, buttonVariants } from "@arolariu/components/button";

// Forms
import { Form } from "@arolariu/components/form";
import { Input } from "@arolariu/components/input";

// Data Display
import { Table } from "@arolariu/components/table";
import { Avatar } from "@arolariu/components/avatar";

// Overlays
import { Dialog } from "@arolariu/components/dialog";
import { Sheet } from "@arolariu/components/sheet";
```

The NPM package delivers declaration maps for each component, providing detailed documentation and prop types.

The declaration maps, coupled with source code that's available under the `src` directory makes troubleshooting and debugging components extremely easy.

## 🔍 Debugging and Development Support

This package is fully optimized for debugging with comprehensive development tools:

### ✅ Complete Source Map Support

- **JavaScript source maps** (`.js.map`, `.cjs.map`) for accurate debugging
- **CSS source maps** (`.css.map`) for Tailwind CSS debugging
- **TypeScript declaration maps** for IDE IntelliSense
- **Original source access** via included `src/` directory

### 🛠️ Development Features

- **Breakpoint debugging** in original TypeScript source
- **Stack trace accuracy** pointing to exact source locations
- **Browser DevTools integration** with full source mapping
- **IDE debugging support** for VS Code, WebStorm, and others

### 📖 Comprehensive Documentation

For detailed debugging instructions, troubleshooting, and development setup, see our **[Debugging Guide](./DEBUGGING.md)**.

The guide covers:

- Browser DevTools configuration
- IDE setup for debugging
- Common issues and solutions
- Performance analysis tools
- Component introspection methods
- Source map validation

## 🔍 TypeScript Support

This library includes comprehensive TypeScript definitions. All components are properly typed and have declaration maps for tight integration.

```tsx
import { Button } from "@arolariu/components/button";
import type { buttonVariants } from "@arolariu/components/button";

// TypeScript will provide autocomplete and type checking for props
const MyButton = () => {
  return <Button variant={buttonVariants.primary}>Click Me</Button>;
};
```

## 🖥️ Server-Side Rendering

All components are compatible with server-side rendering frameworks like Next.js, by default:

```tsx
// Next.js App Router example
import { Button } from "@arolariu/components/button";

export default async function SSR_Page() {
  return (
    <div>
      <Button>Server Component Button</Button>
    </div>
  );
}

// For client interactions
import { Button } from "@arolariu/components/button";

export default function CSR_Page() {
  return (
    <div>
      <Button>Client Component Button</Button>
    </div>
  );
}
```

## 🌐 Browser Support

- 🌟 Chrome/Edge (All modern versions from 2020 onwards)
- 🦊 Firefox (All modern versions from 2020 onwards)
- 🧭 Safari (All modern versions from 2020 onwards)

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. 🍴 Fork the repository
2. 🌿 Create your feature branch: `git checkout -b my-new-feature`
3. 💾 Commit your changes: `git commit -am 'Add some feature'`
4. 🚀 Push to the branch: `git push origin my-new-feature`
5. 🔍 Submit a pull request

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)

## 👨‍💻 Author

**Alexandru-Razvan Olariu**

- 🌐 Website: [https://arolariu.ro](https://arolariu.ro)
- 💻 GitHub: [@arolariu](https://github.com/arolariu)
- 👥 LinkedIn: [Alexandru-Razvan Olariu](https://www.linkedin.com/in/olariu-alexandru/)

## 🙏 Acknowledgments

- [Radix UI](https://www.radix-ui.com/) for providing accessible primitives
- [Animate-UI](https://animate-ui.com) for animated components
- [Magic-UI](https://magicui.design/) for utility components
- [Aceternity-UI](https://ui.aceternity.com/) for utility components
- [shadcn/ui](https://ui.shadcn.com/) for inspiration and component patterns
- [Tailwind CSS](https://tailwindcss.com/) for styling utilities
- [RsBuild](https://rsbuild.dev/) for bundling and building
- [TypeScript](https://www.typescriptlang.org/) for static typing

---

⭐ **If you find this library helpful, please consider giving it a star on GitHub!** ⭐
