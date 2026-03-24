# 🚀 Migration Guide: v0.x → v1.0

> **Breaking changes from Radix UI + Tailwind to Base UI + CSS Modules**

This guide helps you migrate from **@arolariu/components v0.x** (Radix UI + Tailwind CSS) to **v1.0** (Base UI + CSS Modules). The 1.0 release is a complete architectural rewrite with breaking changes in primitives, styling, composition, and design tokens.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Breaking Changes Summary](#-breaking-changes-summary)
- [Step-by-Step Migration](#-step-by-step-migration)
  - [1. Update Dependencies](#1-update-dependencies)
  - [2. Remove Radix UI Packages](#2-remove-radix-ui-packages)
  - [3. Update Imports](#3-update-imports)
  - [4. Migrate from Tailwind to CSS Modules](#4-migrate-from-tailwind-to-css-modules)
  - [5. Replace `asChild` with `render`](#5-replace-aschild-with-render)
  - [6. Update Design Tokens](#6-update-design-tokens)
  - [7. Migrate Variant Helpers](#7-migrate-variant-helpers)
  - [8. Update Toast Usage](#8-update-toast-usage)
  - [9. Update Command Palette](#9-update-command-palette)
  - [10. Update DropDrawer](#10-update-dropdrawer)
- [Component-Specific Changes](#-component-specific-changes)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

### What Changed?

| Aspect | v0.x | v1.0 |
|--------|------|------|
| **Primitives** | Radix UI (`@radix-ui/react-*`) | Base UI (`@base-ui/react`) |
| **Styling** | Tailwind CSS utility classes | CSS Modules (`.module.css`) |
| **Composition** | `asChild` prop | `render` prop (Base UI pattern) |
| **Design Tokens** | `--ui-*` CSS variables | `--ac-*` OKLCH color space |
| **Variants** | CVA (class-variance-authority) | CSS Module class maps |
| **Toast** | `sonner` package | Base UI Toast-backed |
| **Command** | `cmdk` package | Native implementation |
| **Drawer** | `vaul` package | Base UI Drawer |

### Why Migrate?

- ✅ **Smaller Bundle**: No Tailwind JIT, CVA, or multiple Radix packages
- ✅ **Better Performance**: CSS Modules are statically extracted
- ✅ **Modern Standards**: Base UI is the successor to Radix UI
- ✅ **Type Safety**: Namespace types (`Component.Props`, `Component.State`)
- ✅ **Flexibility**: OKLCH design tokens for advanced color manipulation

---

## 💥 Breaking Changes Summary

### 1. Primitive Library Migration

**Before (v0.x):**
```tsx
import * as Dialog from "@radix-ui/react-dialog";
```

**After (v1.0):**
```tsx
import { Dialog } from "@base-ui/react/dialog";
```

**Impact:** All components now use `@base-ui/react` instead of 25+ separate `@radix-ui/react-*` packages.

---

### 2. Styling Migration

**Before (v0.x):**
```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2">
  Click Me
</Button>
```

**After (v1.0):**
```tsx
import styles from "./my-app.module.css";

<Button className={styles.myButton}>
  Click Me
</Button>

/* my-app.module.css */
.myButton {
  background-color: var(--ac-primary);
  color: var(--ac-primary-foreground);
  padding: 0.5rem 1rem;
}

.myButton:hover {
  background-color: color-mix(in oklch, var(--ac-primary) 90%, transparent);
}
```

**Impact:** Components no longer use Tailwind utility classes internally. Use CSS Modules for custom styling.

---

### 3. Composition Pattern Migration

**Before (v0.x):**
```tsx
<Button asChild>
  <a href="/dashboard">Go to Dashboard</a>
</Button>
```

**After (v1.0):**
```tsx
<Button render={<a href="/dashboard" />}>
  Go to Dashboard
</Button>
```

**Impact:** `asChild` still works as a backward-compatibility shim, but `render` is preferred.

---

### 4. Design Token Migration

**Before (v0.x):**
```css
:root {
  --ui-primary: 210 100% 50%;
  --ui-primary-foreground: 0 0% 100%;
  --ui-radius: 0.5rem;
}
```

**After (v1.0):**
```css
:root {
  --ac-primary: oklch(0.6 0.2 250);
  --ac-primary-foreground: oklch(1 0 0);
  --ac-radius-md: 0.5rem;
}
```

**Impact:** All CSS custom properties are prefixed with `--ac-*` and use OKLCH color space.

---

### 5. Variant Helper Migration

**Before (v0.x):**
```tsx
import { buttonVariants } from "@arolariu/components/button";
import { cva } from "class-variance-authority";

const variants = buttonVariants({ variant: "destructive", size: "lg" });
// Returns: "bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11 px-8"
```

**After (v1.0):**
```tsx
import { buttonVariants } from "@arolariu/components/button";

const variants = buttonVariants({ variant: "destructive", size: "lg" });
// Returns: "destructive sizeLg" (CSS Module class names)
```

**Impact:** Variant helpers return CSS Module class names, not Tailwind utilities. Use with `cn()` for merging.

---

### 6. Removed Dependencies

**Before (v0.x):**
```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "tailwind-merge": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "sonner": "^1.0.0",
    "cmdk": "^0.2.0",
    "vaul": "^0.9.0"
  }
}
```

**After (v1.0):**
```json
{
  "dependencies": {
    "@base-ui/react": "^0.0.1"
  }
}
```

**Impact:** Removed 28+ dependencies. Library is now much lighter.

---

## 📝 Step-by-Step Migration

### 1. Update Dependencies

```bash
# Uninstall old version
npm uninstall @arolariu/components

# Install new version
npm install @arolariu/components@1.0.0

# Update peer dependencies
npm install react@^19.0.0 react-dom@^19.0.0 @base-ui/react@^0.0.1 motion@^11.0.0
```

**Optional Dependencies (if using specific features):**
```bash
# For forms with validation
npm install react-hook-form @hookform/resolvers zod

# For charts
npm install recharts
```

---

### 2. Remove Radix UI Packages

If you were importing Radix UI directly in your app:

```bash
# Remove all Radix UI packages
npm uninstall @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover
# ... (and any other @radix-ui packages)
```

**Search and replace** in your codebase:
```tsx
// Find all direct Radix UI imports
import * as Dialog from "@radix-ui/react-dialog";
// Replace with Base UI imports
import { Dialog } from "@base-ui/react/dialog";
```

---

### 3. Update Imports

**Before (v0.x):**
```tsx
import "@arolariu/components/dist/index.css"; // Old path
import { Button } from "@arolariu/components";
```

**After (v1.0):**
```tsx
import "@arolariu/components/styles"; // New path (design tokens only)
import { Button } from "@arolariu/components/button"; // Subpath imports preferred
```

**Bulk import update:**
```tsx
// Still works but not recommended for tree-shaking
import { Button, Card, Dialog } from "@arolariu/components";

// Preferred: subpath imports
import { Button } from "@arolariu/components/button";
import { Card, CardHeader, CardContent } from "@arolariu/components/card";
import { Dialog, DialogTrigger, DialogContent } from "@arolariu/components/dialog";
```

---

### 4. Migrate from Tailwind to CSS Modules

**Before (v0.x): Tailwind utility classes**
```tsx
<Card className="w-96 p-6 bg-card text-card-foreground shadow-lg">
  <h2 className="text-xl font-bold mb-4">Title</h2>
  <p className="text-sm text-muted-foreground">Description</p>
</Card>
```

**After (v1.0): CSS Modules**
```tsx
import styles from "./my-card.module.css";

<Card className={styles.card}>
  <h2 className={styles.title}>Title</h2>
  <p className={styles.description}>Description</p>
</Card>
```

```css
/* my-card.module.css */
.card {
  width: 24rem;
  padding: 1.5rem;
  background-color: var(--ac-card);
  color: var(--ac-card-foreground);
  box-shadow: var(--ac-shadow-lg);
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.description {
  font-size: 0.875rem;
  color: var(--ac-muted-foreground);
}
```

**Strategy:** Create a CSS Module file for each component or page and migrate utility classes to semantic class names.

---

### 5. Replace `asChild` with `render`

**Before (v0.x):**
```tsx
import { Button } from "@arolariu/components/button";

<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>

<Dialog.Trigger asChild>
  <Button>Open Dialog</Button>
</Dialog.Trigger>
```

**After (v1.0):**
```tsx
import { Button } from "@arolariu/components/button";
import { Dialog, DialogTrigger } from "@arolariu/components/dialog";

<Button render={<a href="/dashboard" />}>
  Dashboard
</Button>

<DialogTrigger render={<Button />}>
  Open Dialog
</DialogTrigger>
```

**Note:** `asChild` still works in v1.0 as a backward-compatibility shim, but it's deprecated. Use `render` for new code.

---

### 6. Update Design Tokens

**Step 1: Find all custom token definitions**

```bash
# Search for old token prefix
grep -r "--ui-" ./styles
```

**Step 2: Rename tokens**

**Before (v0.x):**
```css
:root {
  --ui-primary: 210 100% 50%;
  --ui-primary-foreground: 0 0% 100%;
  --ui-secondary: 220 14% 96%;
  --ui-accent: 210 100% 95%;
  --ui-radius: 0.5rem;
}

.dark {
  --ui-primary: 210 100% 45%;
}
```

**After (v1.0):**
```css
:root {
  --ac-primary: oklch(0.6 0.2 250);
  --ac-primary-foreground: oklch(1 0 0);
  --ac-secondary: oklch(0.96 0.01 250);
  --ac-accent: oklch(0.95 0.05 250);
  --ac-radius-md: 0.5rem;
}

.dark,
[data-theme="dark"] {
  --ac-primary: oklch(0.55 0.18 250);
}
```

**Step 3: Convert HSL to OKLCH**

Use the color conversion utilities:

```tsx
import { convertHexToOklchString } from "@arolariu/components/color-conversion-utilities";

// Convert existing colors
const oklch = convertHexToOklchString("#3b82f6");
console.log(oklch); // "oklch(0.6 0.2 250)"
```

**Common token mappings:**

| v0.x | v1.0 | Description |
|------|------|-------------|
| `--ui-primary` | `--ac-primary` | Primary brand color |
| `--ui-radius` | `--ac-radius-md` | Border radius (medium) |
| `--ui-spacing-4` | `--ac-spacing-md` | Spacing scale |
| `--ui-foreground` | `--ac-foreground` | Main text color |
| `--ui-muted` | `--ac-muted` | Muted background |

---

### 7. Migrate Variant Helpers

**Before (v0.x): CVA-based variants**
```tsx
import { buttonVariants } from "@arolariu/components/button";

const className = buttonVariants({ variant: "outline", size: "lg" });
// Returns Tailwind classes: "border border-input bg-background hover:bg-accent h-11 px-8"

<a className={className}>Link as Button</a>
```

**After (v1.0): CSS Module class maps**
```tsx
import { buttonVariants } from "@arolariu/components/button";
import { cn } from "@arolariu/components/utilities";
import styles from "./my-link.module.css";

const className = cn(
  buttonVariants({ variant: "outline", size: "lg" }),
  styles.myLink
);
// Returns CSS Module classes: "outline sizeLg myLink"

<a className={className}>Link as Button</a>
```

**CSS Module:**
```css
/* my-link.module.css */
.myLink {
  text-decoration: none;
  display: inline-flex;
}
```

---

### 8. Update Toast Usage

**Before (v0.x): Sonner toast**
```tsx
import { toast } from "sonner";

toast.success("Success!");
toast.error("Error!");
toast.promise(promise, {
  loading: "Loading...",
  success: "Done!",
  error: "Failed!",
});
```

**After (v1.0): Base UI Toast-backed implementation**
```tsx
import { toast } from "@arolariu/components/sonner";

// API is identical, but implementation uses Base UI
toast.success("Success!");
toast.error("Error!");
toast.promise(promise, {
  loading: "Loading...",
  success: "Done!",
  error: "Failed!",
});
```

**Setup:**
```tsx
import { Toaster } from "@arolariu/components/sonner";

// Add once in app root
<Toaster />
```

**Impact:** No API changes, but the underlying implementation is now Base UI-backed.

---

### 9. Update Command Palette

**Before (v0.x): cmdk package**
```tsx
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
} from "@arolariu/components/command";

<Command>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandItem onSelect={() => console.log("Selected")}>
      Option 1
    </CommandItem>
  </CommandList>
</Command>
```

**After (v1.0): Native implementation**
```tsx
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
} from "@arolariu/components/command";

// API is identical, but implementation is package-native
<Command>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandItem onSelect={() => console.log("Selected")}>
      Option 1
    </CommandItem>
  </CommandList>
</Command>
```

**Impact:** No API changes, but the underlying implementation is now Base UI-aligned.

---

### 10. Update DropDrawer

**Before (v0.x): vaul package**
```tsx
import { DropDrawer } from "@arolariu/components/dropdrawer";

<DropDrawer>
  <DropDrawer.Trigger>Open Drawer</DropDrawer.Trigger>
  <DropDrawer.Content>
    <DropDrawer.Title>Drawer Title</DropDrawer.Title>
    <p>Content here</p>
  </DropDrawer.Content>
</DropDrawer>
```

**After (v1.0): Base UI Drawer foundation**
```tsx
import {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerTitle,
} from "@arolariu/components/dropdrawer";

<DropDrawer>
  <DropDrawerTrigger>Open Drawer</DropDrawerTrigger>
  <DropDrawerContent>
    <DropDrawerTitle>Drawer Title</DropDrawerTitle>
    <p>Content here</p>
  </DropDrawerContent>
</DropDrawer>
```

**Impact:** API is similar, but imports may need to be updated to use compound components.

---

## 🔧 Component-Specific Changes

### Button

**Before (v0.x):**
```tsx
<Button variant="destructive" size="lg" asChild>
  <a href="/delete">Delete</a>
</Button>
```

**After (v1.0):**
```tsx
<Button variant="destructive" size="lg" render={<a href="/delete" />}>
  Delete
</Button>
```

---

### Dialog

**Before (v0.x):**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**After (v1.0):**
```tsx
import styles from "./my-dialog.module.css";

<Dialog>
  <DialogTrigger render={<Button />}>
    Open
  </DialogTrigger>
  <DialogContent className={styles.content}>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

```css
/* my-dialog.module.css */
.content {
  max-width: 28rem;
}
```

---

### Form

**Before (v0.x):**
```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} type="email" className="w-full" />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**After (v1.0):**
```tsx
import styles from "./my-form.module.css";

<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} type="email" className={styles.input} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

```css
/* my-form.module.css */
.input {
  width: 100%;
}
```

---

### Table

**Before (v0.x):**
```tsx
<Table className="w-full">
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">ID</TableHead>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">001</TableCell>
      <TableCell>John Doe</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**After (v1.0):**
```tsx
import styles from "./my-table.module.css";

<Table className={styles.table}>
  <TableHeader>
    <TableRow>
      <TableHead className={styles.idColumn}>ID</TableHead>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className={styles.idCell}>001</TableCell>
      <TableCell>John Doe</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

```css
/* my-table.module.css */
.table {
  width: 100%;
}

.idColumn {
  width: 6.25rem;
}

.idCell {
  font-weight: 500;
}
```

---

### Select

**Before (v0.x):**
```tsx
<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**After (v1.0):**
```tsx
import styles from "./my-select.module.css";

<Select>
  <SelectTrigger className={styles.trigger}>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

```css
/* my-select.module.css */
.trigger {
  width: 11.25rem;
}
```

---

## 🐛 Troubleshooting

### Issue: Components have no styling

**Cause:** Missing design token import.

**Solution:**
```tsx
// Add this once in your app entry point
import "@arolariu/components/styles";
```

---

### Issue: Tailwind classes not working on components

**Cause:** Components no longer use Tailwind internally in v1.0.

**Solution:** Use CSS Modules instead:
```tsx
import styles from "./my-styles.module.css";

<Button className={styles.myButton}>Click</Button>
```

---

### Issue: `asChild` prop not working

**Cause:** `asChild` is deprecated in v1.0. It works as a backward-compatibility shim but may have edge cases.

**Solution:** Migrate to `render` prop:
```tsx
// Old
<Button asChild>
  <a href="/link">Link</a>
</Button>

// New
<Button render={<a href="/link" />}>
  Link
</Button>
```

---

### Issue: Variant helpers return wrong classes

**Cause:** Variant helpers now return CSS Module class names, not Tailwind utilities.

**Solution:** Use `cn()` to merge classes:
```tsx
import { buttonVariants } from "@arolariu/components/button";
import { cn } from "@arolariu/components/utilities";

const className = cn(
  buttonVariants({ variant: "outline" }),
  "my-custom-class"
);
```

---

### Issue: Dark mode not working

**Cause:** Dark mode selector changed in v1.0.

**Solution:** Use `.dark` class or `[data-theme="dark"]` attribute:
```tsx
// Option 1: Class-based
<html className="dark">

// Option 2: Attribute-based
<html data-theme="dark">
```

---

### Issue: TypeScript errors on component props

**Cause:** v1.0 uses namespace types (`Component.Props`, `Component.State`).

**Solution:** Update type imports:
```tsx
// Old
import { ButtonProps } from "@arolariu/components/button";

// New
import { Button } from "@arolariu/components/button";
type ButtonProps = Button.Props;
```

---

### Issue: Missing components after upgrade

**Cause:** Some components were renamed or removed.

**Solution:** Check the [CHANGELOG.md](./CHANGELOG.md) for component renames. New components in v1.0:
- `NumberField`
- `Meter`
- `Toolbar`
- `CheckboxGroup`

---

### Issue: Build errors with CSS Modules

**Cause:** CSS Module support not configured in bundler.

**Solution:** Ensure your bundler supports CSS Modules:

**Next.js:** Built-in support, no config needed.

**Vite:**
```ts
// vite.config.ts
export default {
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
};
```

**Webpack:**
```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.module\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
};
```

---

## 📚 Additional Resources

- [README.md](./README.md) - Component catalog and quick start
- [EXAMPLES.md](./EXAMPLES.md) - Real-world usage patterns
- [CHANGELOG.md](./CHANGELOG.md) - Full release history
- [Base UI Documentation](https://base-ui.com/react/components)
- [CSS Modules Guide](https://github.com/css-modules/css-modules)
- [OKLCH Color Space](https://oklch.com/)

---

## 🤝 Need Help?

- 🐛 [Report a bug](https://github.com/arolariu/arolariu.ro/issues)
- 💬 [Ask a question](https://github.com/arolariu/arolariu.ro/discussions)
- 📧 [Email support](mailto:admin@arolariu.ro)

---

**Happy migrating! 🎉**
