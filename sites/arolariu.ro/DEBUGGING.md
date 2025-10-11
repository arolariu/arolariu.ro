# Next.js Development & Debugging Guide

This guide explains how to debug the arolariu.ro Next.js application with full source maps and optimal debugging experience.

## 🎯 Quick Start

### Running Development Server

```bash
# Standard development mode with full debugging support
npm run dev

# Classic webpack mode (without Turbopack)
npm run dev:classic

# Explicit debug mode (same as dev but more explicit)
npm run dev:debug
```

All dev commands automatically:
- ✅ Enable Node.js inspector on port 9229
- ✅ Generate full source maps (client & server)
- ✅ Disable minification and optimization
- ✅ Enable Turbopack tracing (for `dev` command)
- ✅ Preserve all code for debugging

## 🔧 Configuration Overview

### Environment-Based Settings

The `next.config.ts` automatically detects development mode via:

```typescript
const isDebugBuild = process.env["NODE_ENV"] === "development";
```

### Development Mode Features

When running `npm run dev`, the following are **automatically enabled**:

#### ✅ Source Maps
- `serverSourceMaps: true` - Server-side source maps
- `turbopackSourceMaps: true` - Turbopack source maps
- `enablePrerenderSourceMaps: true` - Prerendered page source maps

#### ✅ No Minification
- `turbopackMinify: false` - Turbopack keeps code readable
- `serverMinification: false` - Server code stays unminified
- `optimizeServerReact: false` - React code stays unoptimized

#### ✅ No Tree Shaking
- `turbopackTreeShaking: false` - All imports preserved for debugging

#### ✅ Full Console Logs
- `removeConsole: false` - All console statements preserved

#### ✅ Debug Logging
- `logging.fetches.fullUrl: true` - Full URL logging for fetch requests

## 🐛 Debugging Methods

### Method 1: VS Code Integrated Debugging (Recommended)

#### Server-Side Debugging
1. Press `Ctrl+Shift+D` (Windows/Linux) or `⇧+⌘+D` (macOS)
2. Select **"Next.js: Debug Server-Side"** from dropdown
3. Press `F5` to start
4. Set breakpoints in your server components or API routes
5. Debugger will pause at breakpoints automatically

#### Client-Side Debugging
1. Press `Ctrl+Shift+D`
2. Select **"Next.js: Debug Client-Side"**
3. Press `F5`
4. Browser (Edge) opens with debugger attached
5. Set breakpoints in client components

#### Full-Stack Debugging
1. Select **"Next.js: Debug Full Stack"**
2. Press `F5`
3. Debug both server AND client simultaneously
4. Automatic browser launch when server is ready

### Method 2: Chrome DevTools

#### Server-Side Code
1. Run `npm run dev`
2. You'll see: `Debugger listening on ws://127.0.0.1:9229/...`
3. Open Chrome and navigate to `chrome://inspect`
4. Click **"Configure..."** and ensure `localhost:9229` is listed
5. Under **"Remote Target"**, find your Next.js app
6. Click **"inspect"** to open DevTools
7. Go to **Sources** tab

**Finding files:**
- Press `Ctrl+P` (Windows/Linux) or `⌘+P` (macOS)
- Source files have paths like: `webpack://{app-name}/./src/...`
- Search for your filename (e.g., `page.tsx`)

#### Client-Side Code
1. Run `npm run dev`
2. Open `https://localhost:3000` in Chrome
3. Press `F12` or `Ctrl+Shift+J` to open DevTools
4. Go to **Sources** tab
5. Press `Ctrl+P` / `⌘+P` to search files
6. Files appear as: `webpack://_N_E/./src/...`

### Method 3: Firefox DevTools

#### Server-Side Code
1. Run `npm run dev`
2. Open Firefox and go to `about:debugging`
3. Click **"This Firefox"** in left sidebar
4. Under **"Remote Targets"**, find your Next.js app
5. Click **"Inspect"** → **"Debugger"** tab

#### Client-Side Code
1. Open `https://localhost:3000` in Firefox
2. Press `F12` or `Ctrl+Shift+I`
3. Go to **Debugger** tab
4. Press `Ctrl+P` / `⌘+P` to search files

## 📋 Source Map Details

### How Source Maps Work in Development

```
Your TypeScript/JSX Code (src/app/page.tsx)
    ↓
Turbopack/Webpack Compilation
    ↓
JavaScript + Source Map (.map file)
    ↓
Debugger Maps Back to Original Code
```

### Verifying Source Maps Are Working

1. **In Browser DevTools:**
   - Open Sources tab
   - Look for files under `webpack://_N_E/./src/`
   - If you see your original `.tsx` files → ✅ Source maps working
   - If you only see minified `.js` files → ❌ Source maps not working

2. **In VS Code:**
   - Set a breakpoint in a `.tsx` file
   - Start debugging with `F5`
   - If breakpoint hits and shows your code → ✅ Working
   - If breakpoint is grayed out or skipped → ❌ Not working

3. **Check Build Output:**
   ```bash
   npm run dev
   ```
   Look for console output:
   - `>>> isDebugBuild ✅` means debug mode is active
   - Server logs show source-mapped stack traces

## 🔍 Debugging Common Scenarios

### Server Components
```typescript
// src/app/page.tsx
export default async function Page() {
  const data = await fetchData(); // ← Set breakpoint here
  return <div>{data}</div>;
}
```
- Use VS Code "Debug Server-Side" or Chrome DevTools (server inspector)
- Breakpoint will hit during SSR/RSC rendering

### Client Components
```typescript
"use client";

export function MyComponent() {
  const handleClick = () => {
    console.log("clicked"); // ← Set breakpoint here
  };
  return <button onClick={handleClick}>Click</button>;
}
```
- Use VS Code "Debug Client-Side" or browser DevTools
- Breakpoint hits on user interaction

### Server Actions
```typescript
"use server";

export async function myAction(formData: FormData) {
  const value = formData.get("field"); // ← Set breakpoint here
  // Process data
}
```
- Use server-side debugging methods
- Breakpoint hits when action is called from client

### API Routes
```typescript
// src/app/api/hello/route.ts
export async function GET(request: Request) {
  const data = await processRequest(); // ← Set breakpoint here
  return Response.json(data);
}
```
- Use server-side debugging
- Breakpoint hits when API endpoint is called

## 🛠️ Troubleshooting

### Issue: Breakpoints Not Hitting

**Solution:**
1. Verify `isDebugBuild` is `true`:
   ```bash
   npm run dev
   # Check console output for ">>> isDebugBuild ✅"
   ```

2. Check `NODE_ENV`:
   ```bash
   # Should be "development"
   echo $env:NODE_ENV  # PowerShell
   ```

3. Restart VS Code debugger

### Issue: Code is Minified in Debugger

**Solution:**
- Ensure you're running `npm run dev` (not `npm run build`)
- Check `next.config.ts` has:
  - `turbopackMinify: false` in development
  - `serverMinification: false` in development

### Issue: Source Maps Not Loading

**Solution:**
1. Clear Next.js cache:
   ```bash
   npm run clean
   ```

2. Delete `.next` folder:
   ```bash
   Remove-Item -Recurse -Force .next
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

### Issue: "Source Map Not Found" Warnings

**Cause:** External dependencies may not have source maps

**Solution:**
- This is normal for `node_modules` packages
- Your own code should still have source maps
- Use `skipFiles: ["<node_internals>/**", "node_modules/**"]` in launch config

### Issue: Debugger Attaching Slowly

**Solution:**
1. Reduce debug scope by using `skipFiles` in `.vscode/launch.json`
2. Close unused browser tabs consuming debug ports
3. Ensure only one instance of dev server is running

## 📊 Performance Impact

Development mode optimizations are **intentionally disabled** for debugging:

| Feature | Production | Development | Reason |
|---------|-----------|-------------|---------|
| Minification | ✅ On | ❌ Off | Readable code |
| Tree Shaking | ✅ On | ❌ Off | Preserve imports |
| Source Maps | ❌ Off | ✅ On | Map to source |
| React Optimization | ✅ On | ❌ Off | Preserve hooks |
| Server Minification | ✅ On | ❌ Off | Readable server logs |

**Startup time in dev:** ~3-5 seconds longer due to source map generation

**Hot Reload:** Unaffected, Turbopack HMR remains fast

## 🎓 Best Practices

### 1. Use Breakpoints Over Console Logs
```typescript
// ❌ Less effective
console.log(data);

// ✅ Better - use breakpoints
const result = processData(data); // Set breakpoint here, inspect variables
```

### 2. Leverage Conditional Breakpoints
- Right-click breakpoint → Edit Breakpoint
- Add condition: `count > 10`
- Breakpoint only hits when condition is true

### 3. Use Logpoints
- Right-click line number → Add Logpoint
- Enter message: `User ID: {userId}`
- Non-blocking logging without `console.log`

### 4. Debug React Components with React DevTools
- Install [React Developer Tools](https://react.dev/learn/react-developer-tools)
- Inspect component props, state, and hooks
- Profile component re-renders

### 5. Network Debugging
- Use browser DevTools Network tab
- Filter by domain: `arolariu.ro`
- Inspect API calls, headers, timing

## 🔗 Related Documentation

- [Next.js Official Debugging Guide](https://nextjs.org/docs/app/guides/debugging)
- [VS Code Node.js Debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)

## 📝 Environment Variables

Debugging-related environment variables:

```bash
# Enable Node.js inspector (auto-set by npm run dev)
NODE_OPTIONS='--inspect'

# Enable Turbopack tracing (performance analysis)
NEXT_TURBOPACK_TRACING=1

# Force development mode
NODE_ENV=development
```

## 🚀 Quick Reference

### Start Debugging (VS Code)
```
Ctrl+Shift+D → Select config → F5
```

### Set Breakpoint
```
Click line number gutter (red dot appears)
```

### Step Through Code
```
F10 - Step Over
F11 - Step Into
Shift+F11 - Step Out
F5 - Continue
```

### Inspect Variables
```
Hover over variable → Tooltip shows value
OR
View "Variables" panel in Debug sidebar
```

### Debug Console
```
Ctrl+Shift+Y (evaluate expressions while paused)
```

---

## 🆘 Need Help?

If you encounter issues not covered here:

1. Check [GitHub Issues](https://github.com/arolariu/arolariu.ro/issues)
2. Review [Next.js Debugging Docs](https://nextjs.org/docs/app/guides/debugging)
3. Open a new issue with:
   - Steps to reproduce
   - Output of `npm run dev`
   - Screenshots of debugger state
   - VS Code version & extensions list
