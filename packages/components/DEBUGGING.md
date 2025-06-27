# 🔍 Debugging Guide for @arolariu/components

This guide provides comprehensive information on debugging and troubleshooting the `@arolariu/components` package in your projects.

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

All distribution files include source maps for optimal debugging experience:

### JavaScript Source Maps

```
dist/
├── esm/
│   ├── button.js
│   ├── button.js.map      ✅ ESM source map
│   └── ...
├── cjs/
│   ├── button.cjs
│   ├── button.cjs.map     ✅ CommonJS source map
│   └── ...
```

### Benefits

- **Accurate stack traces** pointing to original TypeScript source
- **Breakpoint debugging** in original source files
- **CSS debugging** with original Tailwind source locations
- **Better error messages** with precise line numbers

## 📝 TypeScript Support

### Declaration Files

Every component includes comprehensive TypeScript declarations:

```
dist/types/
├── button.d.ts           ✅ Type definitions
├── card.d.ts             ✅ Component props
├── form.d.ts             ✅ Form utilities
└── ...
```

### Source Access

Original TypeScript source is included for reference:

```
src/
├── components/ui/
│   ├── button.tsx        ✅ Original source
│   ├── card.tsx          ✅ Implementation details
│   └── ...
├── hooks/
│   ├── use-mobile.ts     ✅ Custom hooks
│   └── ...
└── lib/
    ├── utils.ts          ✅ Utility functions
    └── ...
```

## 🌐 Browser DevTools Setup

### Chrome DevTools

1. Open DevTools (F12)
2. Go to **Settings** (⚙️)
3. Navigate to **Preferences** → **Sources**
4. Enable **"Enable JavaScript source maps"**
5. Enable **"Enable CSS source maps"**

### Firefox DevTools

1. Open DevTools (F12)
2. Go to **Settings** (⚙️)
3. Navigate to **Advanced Settings**
4. Check **"Enable Source Maps"**

### Safari DevTools

1. Open Web Inspector (⌘⌥I)
2. Go to **Web Inspector** → **Preferences**
3. Navigate to **Sources**
4. Enable **"Enable source maps"**

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
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "wix.vscode-import-cost"
  ]
}
```

### JetBrains IDEs (WebStorm, IntelliJ)

1. Go to **Settings** → **Build, Execution, Deployment** → **Debugger**
2. Enable **"Use JavaScript source maps"**
3. Configure **Source Maps** section:
   - Check **"Process TypeScript files"**
   - Set source map search locations

## 🐛 Common Issues

### Issue: Components Not Rendering

**Symptoms:**

- Components appear as empty divs
- No styling applied
- TypeScript errors about missing props

**Debugging Steps:**

```tsx
// 1. Check component import
import { Button } from "@arolariu/components/button";

// 2. Verify component props
<Button variant="default" size="md">
  Click me
</Button>;

// 3. Inspect with React DevTools
// Look for component in React tree
```

**Solution:**

```tsx
// ✅ Correct import and usage
import { Button } from "@arolariu/components/button";

export function MyComponent() {
  return (
    <Button variant="default" onClick={() => console.log("Clicked!")}>
      My Button
    </Button>
  );
}
```

### Issue: Styling Conflicts

**Symptoms:**

- Components look different than expected
- CSS classes being overridden
- Tailwind styles not applying

**Debugging Steps:**

1. Open browser DevTools
2. Inspect component element
3. Check CSS cascade in **Styles** panel
4. Look for conflicting CSS rules

**Solutions:**

```css
/* Option 1: Use CSS specificity */
.my-custom-button {
  @apply bg-blue-500 hover:bg-blue-600 !important;
}

/* Option 2: Use CSS layers */
@layer components {
  .my-button-override {
    background-color: theme("colors.blue.500");
  }
}
```

### Issue: TypeScript Errors

**Symptoms:**

- Red squiggly lines in IDE
- Type checking failures
- Missing prop definitions

**Debugging Steps:**

```tsx
// 1. Hover over component in IDE to see type info
import { Button } from "@arolariu/components/button";

// 2. Check available props
const buttonProps: React.ComponentProps<typeof Button> = {
  variant: "default",
  size: "md",
  // ... other props
};

// 3. Use TypeScript utility types
type ButtonVariant = React.ComponentProps<typeof Button>["variant"];
```

## ⚡ Performance Debugging

### Bundle Analysis

#### Webpack Bundle Analyzer

```bash
# Install analyzer
npm install --save-dev webpack-bundle-analyzer

# Analyze your bundle
npx webpack-bundle-analyzer build/static/js/*.js
```

#### Import Cost Analysis

Install the "Import Cost" VS Code extension to see real-time import sizes:

```tsx
import { Button } from "@arolariu/components/button"; // ~3.2KB
import { Dialog } from "@arolariu/components/dialog"; // ~6.1KB
import { Chart } from "@arolariu/components/chart"; // ~12.4KB
```

### Tree Shaking Verification

```tsx
// ✅ Good: Tree-shakeable imports
import { Button } from "@arolariu/components/button";
import { Card } from "@arolariu/components/card";

// ❌ Avoid: Imports entire library
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
    <Profiler id="Button" onRender={onRenderCallback}>
      <Button>Click me</Button>
    </Profiler>
  );
}
```

## 🔍 Component Introspection

### Component Metadata

```tsx
import { Button } from "@arolariu/components/button";

// Check component display name
console.log(Button.displayName); // "Button"

// Access default props (if any)
console.log(Button.defaultProps);

// Check if component is forwardRef
console.log(Button.$$typeof); // Symbol(react.forward_ref)
```

### Variant Inspection

```tsx
import { buttonVariants } from "@arolariu/components/button";

// Inspect available variants
console.log("Button variants:", {
  variant: Object.keys(buttonVariants.variants.variant),
  size: Object.keys(buttonVariants.variants.size),
});

// Get computed classes for specific variant
const classes = buttonVariants({
  variant: "destructive",
  size: "lg",
});
console.log("Button classes:", classes);
```

### Props Validation

```tsx
import { Button } from "@arolariu/components/button";
import type { ButtonProps } from "@arolariu/components/button";

// Create type-safe props object
const buttonProps: ButtonProps = {
  variant: "default",
  size: "md",
  disabled: false,
  // TypeScript will validate these props
};

// Use props with component
<Button {...buttonProps}>My Button</Button>;
```

## 📊 Build Analysis

### Development Build Analysis

```bash
# Build with analysis
npm run build -- --analyze

# Or use webpack-bundle-analyzer directly
npx webpack-bundle-analyzer build/static/js/*.js
```

### Production Optimization Check

```tsx
// Check if components are properly optimized
import { Button } from "@arolariu/components/button";

// This should only include Button-related code
// Use browser DevTools Network tab to verify
```

### Source Map Validation

```bash
# Check if source maps are present
ls node_modules/@arolariu/components/dist/**/*.map

# Validate source map content
cat node_modules/@arolariu/components/dist/esm/button.js.map
```

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. **Check the source code**: Browse `node_modules/@arolariu/components/src/`
2. **Inspect the built files**: Look at `node_modules/@arolariu/components/dist/`
3. **Use browser DevTools**: Leverage source maps for debugging
4. **Create an issue**: [GitHub Issues](https://github.com/arolariu/arolariu.ro/issues)

## 📚 Additional Resources

- [React DevTools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html)
- [Chrome DevTools Source Maps](https://developer.chrome.com/docs/devtools/javascript/source-maps/)
- [TypeScript Debugging](https://code.visualstudio.com/docs/typescript/typescript-debugging)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
