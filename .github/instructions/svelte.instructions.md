---
version: "1.0.0"
lastUpdated: "2026-03-12"
name: 'SvelteKit Standards'
description: 'SvelteKit development guidelines for cv.arolariu.ro'
applyTo: 'sites/cv.arolariu.ro/**/*.svelte, sites/cv.arolariu.ro/**/*.ts'
---

# SvelteKit Development Guidelines (cv.arolariu.ro)

## Instruction Contract

### Scope
Applies to SvelteKit code in `sites/cv.arolariu.ro/`.

### Mandatory Rules
- This is a **standalone site** — do NOT import from `@arolariu/components` or other monorepo packages.
- Use SvelteKit 2 conventions with TypeScript.
- Deploy via Azure Static Web Apps adapter.

### Prohibited Actions
- Do not add cross-dependencies to other monorepo packages.
- Do not use React patterns — this is Svelte, not React.
- Do not modify the Azure Static Web Apps adapter configuration without explicit user approval.

### Required Verification Commands
```bash
npm run build:cv
```

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| **Framework** | SvelteKit 2.x |
| **Adapter** | Azure Static Web Apps |
| **TypeScript** | Strict mode |
| **Deployment** | https://cv.arolariu.ro |
| **Dependencies** | Standalone (no cross-deps) |

---

## Architecture

This is a personal CV/portfolio site with minimal complexity:

```
sites/cv.arolariu.ro/
├── src/
│   ├── routes/          # SvelteKit file-based routing
│   │   ├── +page.svelte # Home page
│   │   └── +layout.svelte
│   ├── lib/             # Shared utilities
│   └── app.html         # HTML template
├── static/              # Static assets
├── svelte.config.js     # SvelteKit config with Azure SWA adapter
└── package.json
```

## Key Principles

1. **Standalone** — This site has zero dependencies on the monorepo's component library or shared packages
2. **Simple** — CV/portfolio content, minimal interactivity
3. **Static-first** — Pre-rendered where possible via SvelteKit adapter
4. **Azure SWA** — Deployed to Azure Static Web Apps, not App Service
