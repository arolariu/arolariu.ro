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

_A comprehensive collection of 60+ beautifully crafted React components built on [Radix UI](https://www.radix-ui.com/) primitives, designed for modern applications that demand both beauty and performance._

[🚀 Get Started](#-quick-start) • [📖 Documentation](#-component-catalog) • [🎨 Storybook](https://storybook.arolariu.ro) • [💡 Examples](#-usage-examples) • [🤝 Contributing](#-contributing)

</div>

---

## 🎯 Why Choose @arolariu/components?

**For Developers Who Care About Quality**

- **🎨 Beautiful by Default** - Carefully designed components that look great out of the box
- **♿ Accessibility First** - Built on Radix UI primitives with WAI-ARIA compliance
- **⚡ Performance Optimized** - Tree-shakeable, minimal bundle impact, source maps included
- **🔧 Developer Experience** - Full TypeScript support, comprehensive docs, and debugging tools
- **🎭 Flexible Styling** - Tailwind CSS integration with easy customization
- **🚀 Modern Stack** - React 18/19, ESM, SSR compatible

**Perfect for building modern web applications, design systems, and prototypes.**

## � Quick Start

Get up and running with @arolariu/components in under 2 minutes!

### Installation

```bash
# npm
npm install @arolariu/components

# yarn
yarn add @arolariu/components

# pnpm
pnpm add @arolariu/components
```

### Basic Setup

```tsx
// 1. Import the component you need
import { Button } from "@arolariu/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@arolariu/components/card";

// 2. Use it in your React component
export default function MyApp() {
  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Welcome to @arolariu/components!</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Get Started</Button>
      </CardContent>
    </Card>
  );
}
```

### Add Styles (Required)

```tsx
// Import the CSS in your app's entry point (e.g., main.tsx, _app.tsx)
import "@arolariu/components/styles";
```

**That's it!** 🎉 You're ready to build beautiful UIs.

---

## 📖 Component Catalog

Explore our comprehensive collection of **60+ components** organized by category:

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

### � Overlays & Dialogs

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

### 🎪 Animated Backgrounds

| Component               | Description                     | Import                                      |
| ----------------------- | ------------------------------- | ------------------------------------------- |
| **DotBackground**       | Animated dot matrix backgrounds | `@arolariu/components/dot-background`       |
| **BubbleBackground**    | Floating bubble animations      | `@arolariu/components/bubble-background`    |
| **FireworksBackground** | Particle explosion effects      | `@arolariu/components/fireworks-background` |
| **GradientBackground**  | Dynamic gradient animations     | `@arolariu/components/gradient-background`  |

### 🎛️ Form Controls

| Component      | Description                        | Import                             |
| -------------- | ---------------------------------- | ---------------------------------- |
| **Form**       | Form validation and management     | `@arolariu/components/form`        |
| **InputOTP**   | One-time password input fields     | `@arolariu/components/input-otp`   |
| **RadioGroup** | Single-choice option groups        | `@arolariu/components/radio-group` |
| **Switch**     | Toggle switches for binary options | `@arolariu/components/switch`      |
| **Textarea**   | Multi-line text input areas        | `@arolariu/components/textarea`    |

### � Feedback & Status

| Component    | Description                     | Import                          |
| ------------ | ------------------------------- | ------------------------------- |
| **Alert**    | Important message notifications | `@arolariu/components/alert`    |
| **Progress** | Task completion indicators      | `@arolariu/components/progress` |
| **Skeleton** | Loading state placeholders      | `@arolariu/components/skeleton` |
| **Sonner**   | Toast notification system       | `@arolariu/components/sonner`   |

[**👀 View All Components**](https://storybook.arolariu.ro) in our interactive Storybook

---

## 💡 Usage Examples

### Building a Login Form

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@arolariu/components/card";
import { Input } from "@arolariu/components/input";
import { Button } from "@arolariu/components/button";
import { Label } from "@arolariu/components/label";

export function LoginForm() {
  return (
    <Card className="w-96 mx-auto">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Sign In</Button>
      </CardFooter>
    </Card>
  );
}
```

### Data Dashboard

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@arolariu/components/card";
import { Progress } from "@arolariu/components/progress";
import { Badge } from "@arolariu/components/badge";
import { Chart } from "@arolariu/components/chart";

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Sales <Badge variant="secondary">+12%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={75} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            75% of monthly goal
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart data={chartData} type="line" />
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
  NavigationMenuList,
} from "@arolariu/components/navigation-menu";
import { Button } from "@arolariu/components/button";
import { Sheet, SheetContent, SheetTrigger } from "@arolariu/components/sheet";
import { MenuIcon } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My App</h1>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Button variant="ghost">Home</Button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Button variant="ghost">About</Button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Button variant="ghost">Contact</Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <nav className="space-y-4">
              <Button variant="ghost" className="w-full justify-start">
                Home
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                About
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Contact
              </Button>
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

**@arolariu/components** is built with bundle optimization in mind:

```tsx
// ✅ Optimal: Import only what you need
import { Button } from "@arolariu/components/button";
import { Card } from "@arolariu/components/card";

// ❌ Avoid: Barrel imports increase bundle size
import { Button, Card } from "@arolariu/components";
```

**Bundle Impact:**

- Individual components: ~2-5KB gzipped
- Full library: ~150KB gzipped
- With tree shaking: Only pay for what you use

### TypeScript Integration

Full TypeScript support with intelligent autocomplete:

```tsx
import { Button, type ButtonProps } from "@arolariu/components/button";
import { type VariantProps } from "class-variance-authority";

// Get variant types for custom components
type ButtonVariant = VariantProps<typeof Button>["variant"];

interface CustomButtonProps extends ButtonProps {
  icon?: React.ReactNode;
  variant?: ButtonVariant;
}

export function CustomButton({ icon, children, ...props }: CustomButtonProps) {
  return (
    <Button {...props}>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  );
}
```

### Server-Side Rendering (SSR)

Compatible with **Next.js**, **Remix**, and other SSR frameworks:

```tsx
// app/page.tsx (Next.js App Router)
import { Card, CardContent } from "@arolariu/components/card";
import { Button } from "@arolariu/components/button";

export default function HomePage() {
  return (
    <Card>
      <CardContent>
        <Button>Server-rendered Button</Button>
      </CardContent>
    </Card>
  );
}

// For client-side interactivity
("use client");
import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@arolariu/components/dialog";

export function InteractiveComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <p>This dialog requires client-side JavaScript!</p>
      </DialogContent>
    </Dialog>
  );
}
```

### Theming & Customization

Built with **Tailwind CSS** for easy customization:

```tsx
// Custom theme configuration
import { Button } from "@arolariu/components/button";

// Override styles with Tailwind classes
<Button className="bg-purple-600 hover:bg-purple-700 text-white">
  Custom Styled Button
</Button>;

// Or create your own variants
import { cva } from "class-variance-authority";

const customButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        gradient:
          "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
        neon: "bg-black text-green-400 border border-green-400 hover:bg-green-400 hover:text-black",
      },
    },
  },
);
```

---

## 🔍 Debugging & Development

### Complete Source Map Support

**Debug like a pro** with comprehensive development tools:

- ✅ **JavaScript source maps** for accurate debugging
- ✅ **CSS source maps** for Tailwind debugging
- ✅ **TypeScript declaration maps** for IDE IntelliSense
- ✅ **Original source access** via included `src/` directory

### Browser DevTools Integration

```tsx
// Components are easily debuggable in DevTools
import { Button } from "@arolariu/components/button";

function MyComponent() {
  return <Button onClick={() => console.log("Clicked!")}>Debug Me</Button>;
}

// Set breakpoints in your original TypeScript code
// Stack traces point to exact source locations
// Inspect component props and state easily
```

📖 **[Full Debugging Guide](./DEBUGGING.md)** - Learn advanced debugging techniques

---

## 🌐 Browser Support

**Modern browsers only** for optimal performance:

| Browser            | Version     |
| ------------------ | ----------- |
| 🌟 **Chrome/Edge** | 90+ (2021+) |
| 🦊 **Firefox**     | 88+ (2021+) |
| 🧭 **Safari**      | 14+ (2020+) |

**Why modern browsers?** We use latest web standards for smaller bundles and better performance.

---

## 🤝 Contributing

We welcome contributions! Help make @arolariu/components even better.

### Quick Start for Contributors

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/arolariu.ro.git
cd arolariu.ro/packages/components

# 2. Install dependencies
yarn install

# 3. Start development environment
yarn storybook        # Launch Storybook at http://localhost:6006
yarn build           # Build the library

# 4. Make your changes and test
yarn build           # Ensure everything builds correctly
```

### Ways to Contribute

- 🐛 **Report bugs** - Found an issue? [Open an issue](https://github.com/arolariu/arolariu.ro/issues)
- 💡 **Suggest features** - Have an idea? We'd love to hear it!
- 🔧 **Fix issues** - Browse [open issues](https://github.com/arolariu/arolariu.ro/issues) and submit PRs
- 📖 **Improve docs** - Help make our documentation clearer
- 🎨 **Add components** - Contribute new components following our patterns

### Component Development Guidelines

1. **Follow accessibility standards** - Use Radix UI primitives when possible
2. **Include TypeScript types** - Full type definitions required
3. **Add Storybook stories** - Document all variants and use cases
4. **Write tests** - Ensure components work correctly
5. **Follow naming conventions** - Use clear, descriptive names

**[Read our full contributing guide →](./CONTRIBUTING.md)**

---

## 📦 Package Details

### Bundle Information

```bash
# Package size analysis
npm install @arolariu/components
npx bundlephobia @arolariu/components
```

**Key Stats:**

- � **Bundle size**: ~150KB (full library, gzipped)
- 🌲 **Tree-shakeable**: Import only what you need (2-5KB per component)
- 📝 **TypeScript**: 100% typed with declaration maps
- ♿ **Accessibility**: WAI-ARIA compliant via Radix UI
- 🎭 **Styling**: Tailwind CSS integration
- 📱 **Responsive**: Mobile-first design approach

### Dependencies

**Zero runtime dependencies** for end users! Built on top of:

- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling (peer dependency)
- **Motion** - Animation library (peer dependency)
- **React 18/19** - Modern React features (peer dependency)

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
- � **LinkedIn**: [Alexandru-Razvan Olariu](https://www.linkedin.com/in/olariu-alexandru/)
- 📧 **Email**: [admin@arolariu.ro](mailto:admin@arolariu.ro)

---

## 🙏 Acknowledgments & Inspiration

This library wouldn't exist without these amazing projects:

- 🎨 **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- 💫 **[shadcn/ui](https://ui.shadcn.com/)** - Component design patterns and inspiration
- 🎭 **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- ⚡ **[Motion](https://motion.dev/)** - Animation library for React
- 🛠️ **[Rslib](https://rslib.dev/)** - Fast, modern bundling with Rsbuild
- 📖 **[Storybook](https://storybook.js.org/)** - Component development environment
- 🎪 **[Magic UI](https://magicui.design/)** - Additional component inspiration
- ✨ **[Aceternity UI](https://ui.aceternity.com/)** - Creative component patterns

**Special thanks** to the open-source community for making all of this possible! 💜

---

<div align="center">

## ⭐ Star the Project

If **@arolariu/components** helps you build better UIs, please consider giving it a star on GitHub!

[![GitHub stars](https://img.shields.io/github/stars/arolariu/arolariu.ro?style=social)](https://github.com/arolariu/arolariu.ro)

**[⭐ Star on GitHub](https://github.com/arolariu/arolariu.ro)** • **[📖 View Documentation](https://storybook.arolariu.ro)** • **[🐛 Report Issues](https://github.com/arolariu/arolariu.ro/issues)**

---

**Built with ❤️ for the React community**

_Making beautiful, accessible UIs easier to build, one component at a time._

</div>
