# CV — Alexandru‑Razvan Olariu (Svelte 5)

Production-ready Svelte 5 codebase powering the personal CV of Alexandru‑Razvan Olariu, focused on simplicity, speed, and clean content
presentation.

- Live site: https://cv.arolariu.ro
- Monorepo path: sites/cv.arolariu.ro
- Platform: Azure Static Web Apps (via GitHub Actions)

## Tech stack

- SvelteKit 2 + Svelte 5 with the official `@sveltejs/adapter-static`
- Directly authored SWA-managed Azure Function for the public JSON API
- Node.js + npm workspaces (installed from the repository root)
- Prettier + prettier-plugin-svelte
- Vitest (unit tests) + Playwright (accessibility tests)

## Features

- Responsive, fast, and accessible CV
- Clean typographic layout optimized for reading and printing
- Simple local development and CI/CD deployment workflow

## Getting started

Prerequisites:

- The Node.js and npm versions listed in the [root `AGENTS.md` Versions table](../../AGENTS.md#versions)

Install and run from the repository root:

```bash
npm install
npm run dev:cv
```

After `npm install`, `npm run setup` prepares the rest of a fresh checkout (generated artifacts and the other toolchains). CV type checks
and unit-test commands restore the independent API dependencies through `prepare:api` before using the SDK.

Build and preview:

```bash
npm run build:cv
npm run prepare:api --workspace=sites/cv.arolariu.ro
npm run build --prefix sites/cv.arolariu.ro/api
cd sites/cv.arolariu.ro
npm run preview
```

The dev server serves `/rest/json` through a thin Vite middleware calling the same handler as the Function. Vite preview and the static
container serve frontend content only; they do not host the managed API. Unit tests cover the handler and real SDK transport; Azure rewrites
and Functions-host startup still require an authorized deployment to verify.

## Project structure

- src/… — application code (routes, components, styles)
- static/ — static assets (favicons, images, etc.)
- api/ — independently locked managed Function runtime and transport
- scripts/ — development-only JSON middleware
- tests/ — Playwright accessibility suite
- build/ — production artifacts (generated on build)
- svelte.config.js, vite.config.ts, vitest.config.ts, playwright.config.ts, swa-cli.config.json — tooling configuration
- Formatting uses the repository-root .prettierrc (Svelte-aware via prettier-plugin-svelte)

Note: Structure follows common Svelte/SvelteKit conventions.

## Deployment

Automated via GitHub Actions: .github/workflows/official-cv-trigger.yml

- Triggers on changes under `sites/cv.arolariu.ro/` on main, or via manual dispatch
- Restores the independent API owner, checks frontend/API types and unit tests, then builds static pages and packages the Function
- Uploads `build/static` and the complete `build/server` directly, with `skip_app_build` and `skip_api_build`; Oryx does not rebuild either
- Uses the existing Free SWA and token, with serialized deployment jobs; no staging, slots, additional resource, or Azure login

The API's `package.json` and adjacent lock own its production SDK closure separately from the root workspace lock. CI restores that lock and
runs its `build` script. The small `api/build.mjs` configuration bundles the CV Function for Node 22 and copies host/runtime files and
production dependencies into `build/server`. Register ordinary Functions here; adding SvelteKit `+server.ts` routes does not deploy an API.
The static adapter remains strict.

`static/staticwebapp.config.json` owns `/rest/json` compatibility rewrites and selects the supported `node:22` managed runtime. Runtime
selection follows [SWA's managed-runtime matrix](https://learn.microsoft.com/en-us/azure/static-web-apps/languages-runtimes#api); newer
standalone Azure Functions runtimes do not imply SWA managed-runtime support. CI/build versions and the Node 22-compatible bundle remain
unchanged.

Static deep links are prerendered; unknown URLs retain HTTP 404 with a small static error page. The API handler retains its JSON errors,
queries, CORS/cache headers and ETags. Raw resume ETags can change between cold instances because existing data includes a module-load
timestamp.

Required secret:

- AZURE_STATIC_WEB_APPS_CV_TOKEN — API token for the target SWA

Manual trigger: available via workflow_dispatch in GitHub Actions.

## Scripts (common)

From the repository root:

- npm run dev:cv — start local dev server
- npm run build:cv — production build
- npm run test:cv — Vitest unit tests
- npm run format:cv — format with Prettier

Inside sites/cv.arolariu.ro:

- npm run test:unit — complete Vitest run; PDF state, experience data, and service worker tests run in Node, while UI tests use Happy DOM
- npm run preview — preview production build locally
- npm run test:e2e:a11y — Playwright accessibility suite against npm run preview on http://localhost:4173 (build first)

The `Command palette keeps page controls inert until Escape restores focus` Playwright case checks native dialog behavior that the Happy DOM
interaction tests cannot establish.

## E2E Testing (Newman)

CV live checks are implemented with a dedicated Postman/Newman collection.

- Collection: `postman-collection.json`
- Environment profiles:
  - `postman-environment.local.json`
  - `postman-environment.production.json`

Coverage includes:

- Public routes: `/`, `/human`, `/json`, `/pdf`
- JSON API contract: `/rest/json`, `format=minimal`, `format=resume`
- Section contract: `/rest/json?section={{sectionName}}` and unknown-section 404
- Caching behavior: `ETag` capture + `If-None-Match` follow-up validation

Run from repository root:

```bash
npm run test:e2e:cv
```

For local checks, start the development server on the local profile's port in one terminal. Do not use the static-only preview server for
the JSON API checks:

```powershell
npm run dev --workspace=sites\cv.arolariu.ro -- --host localhost --port 4173 --strictPort
```

In another terminal at the repository root:

```powershell
$env:E2E_TEST_ENVIRONMENT = "local"
npm run test:e2e:cv
```

Optional controls:

- `E2E_TEST_ENVIRONMENT=local|production` (default: `production`)
- `NEWMAN_STRICT_MODE=true|false` (default: `false`)
- `NEWMAN_REPORT_DIR=<path>` (default: `e2e-logs`)

## Contributing

This repository contains multiple applications; please keep changes scoped to sites/cv.arolariu.ro when editing the CV. Follow the existing
formatting and commit conventions.

## Author

- Alexandru‑Razvan Olariu — https://arolariu.ro
- CV: https://cv.arolariu.ro
- Contact details are available on the website.
