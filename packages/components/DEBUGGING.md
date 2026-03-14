# 🔍 Debugging Guide for @arolariu/components

This guide provides practical information for debugging and troubleshooting the `@arolariu/components` package in consumer applications.

## 📋 Table of Contents

- [Source Maps](#source-maps)
- [TypeScript Support](#typescript-support)
- [Browser DevTools Setup](#browser-devtools-setup)
- [IDE Configuration](#ide-configuration)
- [Common Issues](#common-issues)
- [Performance Debugging](#performance-debugging)
- [Component Introspection](#component-introspection)
- [Build Analysis](#build-analysis)

## 🗺️ Source Maps

All distribution files include source maps for a strong debugging experience.

### JavaScript Source Maps

```text
dist/
├── button.js
├── button.js.map      ✅ ESM source map
└── ...
```

### Benefits

- **Accurate stack traces** pointing to original TypeScript source
- **Breakpoint debugging** in original source files
- **CSS debugging** with original CSS Module source locations
- **Better error messages** with precise line numbers

## 📝 TypeScript Support

### Declaration Files

Every component includes comprehensive TypeScript declarations.

```text
dist/types/
├── button.d.ts           ✅ Type definitions
├── card.d.ts             ✅ Component props
├── form.d.ts             ✅ Form utilities
└── ...
```

### Source Access

Original TypeScript source is included for reference.

```text
src/
├── components/ui/
│   ├── button.tsx        ✅ Original source
│   ├── button.module.css ✅ Component styles
│   ├── card.tsx          ✅ Implementation details
│   └── ...
├── hooks/
│   ├── useIsMobile.ts    ✅ Custom hooks
│   └── ...
└── lib/
    ├── utilities.ts      ✅ cn() helper
    └── ...
```

## 🌐 Browser DevTools Setup

### Chrome DevTools

1. Open DevTools (`F12`)
2. Go to **Settings** (⚙️)
3. Navigate to **Preferences** → **Sources**
4. Enable **Enable JavaScript source maps**
5. Enable **Enable CSS source maps**

### Firefox DevTools

1. Open DevTools (`F12`)
2. Go to **Settings** (⚙️)
3. Navigate to **Advanced Settings**
4. Check **Enable Source Maps**

### Safari DevTools

1. Open Web Inspector (`⌘⌥I`)
2. Go to **Web Inspector** → **Preferences**
3. Navigate to **Sources**
4. Enable **Enable source maps**

### CSS Modules in DevTools

When inspecting components:

- Expect **scoped class names** such as `button_button__abc12`
- Use the **Styles** panel source links to jump back to the original `.module.css` file
- Inspect **Base UI data attributes** like `[data-open]`, `[data-disabled]`, and `[data-checked]` to understand state-driven styling

## 🛠️ IDE Configuration

### VS Code Setup

#### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug React App",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "*": "${webRoot}/*",
        "webpack:///src/*": "${webRoot}/*",
        "webpack:///./*": "${webRoot}/*",
        "webpack:///./~/*": "${webRoot}/node_modules/*",
        "node_modules/@arolariu/components/src/*": "${webRoot}/node_modules/@arolariu/components/src/*"
      },
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

#### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "clinyong.vscode-css-modules",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "wix.vscode-import-cost"
  ]
}
```

### JetBrains IDEs (WebStorm, IntelliJ)

1. Go to **Settings** → **Build, Execution, Deployment** → **Debugger**
2. Enable **Use JavaScript source maps**
3. Configure **Source Maps** section:
   - Check **Process TypeScript files**
   - Set source map search locations

## 🐛 Common Issues

### Issue: Components Not Rendering

**Symptoms**

- Components appear as empty elements
- No styling applied
- TypeScript errors about missing props

**Debugging Steps**

```tsx
// 1. Check component import
import { Button } from "@arolariu/components/button";

// 2. Verify required package styles are loaded once
import "@arolariu/components/styles";

// 3. Inspect with React DevTools
// Look for the component in the React tree
```

**Solution**

```tsx
import "@arolariu/components/styles";
import { Button } from "@arolariu/components/button";

export function MyComponent() {
  return (
    <Button onClick={() => console.log("Clicked!")}>
      My Button
    </Button>
  );
}
```

### Issue: Styling Conflicts

**Symptoms**

- Components look different than expected
- Consumer styles override component styles unintentionally
- CSS Module classes are hard to locate in DevTools

**Debugging Steps**

1. Open browser DevTools
2. Inspect the rendered element
3. Check generated class names and the CSS cascade in the **Styles** panel
4. Look for scoped module classes and Base UI state attributes
5. Verify token values such as `--ac-primary` and `--ac-radius-md`

**Solutions**

```css
/* Scope theme changes intentionally */
.themeScope {
  --ac-primary: oklch(0.65 0.2 255);
  --ac-radius-md: 0.75rem;
}

/* Target Base UI state attributes from your own module */
.menuTrigger :global([data-open]) {
  outline: 2px solid var(--ac-ring);
}
```

### Issue: `FieldRootContext is missing`

**Symptoms**

- Runtime error mentioning `FieldRootContext`
- Label primitives fail when nested in the wrong Base UI field structure

**Cause**

Base UI field-aware labels expect the matching field context. In this package, the standalone `Label` component is independent and should be used when you do not need Base UI field context.

**Solution**

```tsx
import { Input } from "@arolariu/components/input";
import { Label } from "@arolariu/components/label";

export function StandaloneField() {
  return (
    <>
      <Label htmlFor="email">Email</Label>
      <Input id="email" />
    </>
  );
}
```

Use the package `Form*` or `Field*` primitives when you need grouped field semantics.

### Issue: `nativeButton` Warning

**Symptoms**

- Console warning when rendering a non-`button` element through a trigger or button primitive
- Events or semantics behave unexpectedly when using links or custom elements

**Cause**

Base UI button-like primitives assume a native `<button>` unless told otherwise.

**Solution**

When rendering a non-button element, ensure `nativeButton={false}` is set on the underlying primitive. The package already handles this for some compatibility shims such as `Button asChild`.

```tsx
import { BaseButton } from "@base-ui/react/button";

export function DocsLink() {
  return (
    <BaseButton
      nativeButton={false}
      render={<a href="/docs" />}
    >
      Documentation
    </BaseButton>
  );
}
```

If you build your own wrapper around Base UI directly, set `nativeButton={false}` whenever the rendered element is not a real `<button>`.

### Issue: `asChild` Compatibility

**Symptoms**

- Legacy Radix-style examples still work, but new composition patterns feel inconsistent
- Some wrappers behave differently than old Radix implementations

**Cause**

`asChild` is maintained as a compatibility shim, but Base UI uses `render` as the native composition API.

**Solution**

Prefer `render` for new code:

```tsx
import { Dialog, DialogContent, DialogTrigger } from "@arolariu/components/dialog";

export function Example() {
  return (
    <Dialog>
      <DialogTrigger render={<button type="button" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent>Dialog content</DialogContent>
    </Dialog>
  );
}
```

Use `asChild` only when maintaining older consumers.

### Issue: TypeScript Errors

**Symptoms**

- Red squiggly lines in the IDE
- Type checking failures
- Missing prop definitions

**Debugging Steps**

```tsx
import { Button } from "@arolariu/components/button";

// 1. Hover over the component in your IDE to inspect the prop type
type ButtonProps = React.ComponentProps<typeof Button>;

// 2. Build a typed props object
const buttonProps: ButtonProps = {
  variant: "default",
  size: "sm",
};
```

## ⚡ Performance Debugging

### Bundle Analysis

#### Webpack Bundle Analyzer

```bash
npm install --save-dev webpack-bundle-analyzer
npx webpack-bundle-analyzer build/static/js/*.js
```

#### Import Cost Analysis

Install the **Import Cost** VS Code extension to see real-time import sizes:

```tsx
import { Button } from "@arolariu/components/button";
import { Dialog } from "@arolariu/components/dialog";
import { ChartContainer } from "@arolariu/components/chart";
```

### Tree Shaking Verification

```tsx
// ✅ Good: tree-shakeable imports
import { Button } from "@arolariu/components/button";
import { Card } from "@arolariu/components/card";

// ❌ Avoid: imports the entire library surface
import { Button, Card } from "@arolariu/components";
```

### Performance Monitoring

```tsx
import { Profiler } from "react";
import { Button } from "@arolariu/components/button";

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} ${phase} took ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler
      id="Button"
      onRender={onRenderCallback}
    >
      <Button>Click me</Button>
    </Profiler>
  );
}
```

## 🔍 Component Introspection

### Component Metadata

```tsx
import { Button } from "@arolariu/components/button";

console.log(Button.displayName); // "Button"
console.log(Button.$$typeof); // Symbol(react.forward_ref)
```

### State Attribute Inspection

```tsx
import { Checkbox } from "@arolariu/components/checkbox";

export function Example() {
  return <Checkbox checked />;
}

// Inspect the DOM for attributes such as:
// [data-checked]
// [data-disabled]
// [data-focus-visible]
```

### Props Validation

```tsx
import { Button } from "@arolariu/components/button";
import type { ButtonProps } from "@arolariu/components/button";

const buttonProps: ButtonProps = {
  variant: "default",
  size: "md",
  disabled: false,
};

<Button {...buttonProps}>My Button</Button>;
```

## 📊 Build Analysis

### Development Build Analysis

```bash
# Build with your app's analyzer settings
npm run build
```

### Production Optimization Check

```tsx
import { Button } from "@arolariu/components/button";

// Verify only Button-related code is pulled into the bundle
// with your framework's analyzer or browser network tooling.
```

### Source Map Validation

```bash
# Check if source maps are present
ls node_modules/@arolariu/components/dist/**/*.map

# Validate source map content
cat node_modules/@arolariu/components/dist/components/ui/button.js.map
```

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. **Check the source code**: Browse `node_modules/@arolariu/components/src/`
2. **Inspect the built files**: Look at `node_modules/@arolariu/components/dist/`
3. **Use browser DevTools**: Leverage source maps and inspect CSS Module class mappings
4. **Create an issue**: [GitHub Issues](https://github.com/arolariu/arolariu.ro/issues)

## 📚 Additional Resources

- [Base UI Documentation](https://base-ui.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Chrome DevTools Source Maps](https://developer.chrome.com/docs/devtools/javascript/source-maps/)
- [TypeScript Debugging](https://code.visualstudio.com/docs/typescript/typescript-debugging)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
