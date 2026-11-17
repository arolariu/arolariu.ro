# CV — Alexandru‑Razvan Olariu (Svelte 5)

Production-ready Svelte 5 codebase powering the personal CV of Alexandru‑Razvan Olariu, focused on simplicity, speed, and clean content
presentation.

- Live site: https://cv.arolariu.ro
- Monorepo path: sites/cv.arolariu.ro
- Platform: Azure Static Web Apps (via GitHub Actions)

## Tech stack

- SvelteKit 2 + Svelte 5 (svelte-adapter-azure-swa)
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

After `npm install`, `npm run setup` prepares the rest of a fresh checkout (generated artifacts and the other toolchains).

Build and preview:

```bash
npm run build:cv
cd sites/cv.arolariu.ro
npm run preview
```

## Project structure

- src/… — application code (routes, components, styles)
- static/ — static assets (favicons, images, etc.)
- tests/ — Playwright accessibility suite
- build/ — production artifacts (generated on build)
- svelte.config.js, vite.config.ts, vitest.config.ts, playwright.config.ts, swa-cli.config.json — tooling configuration
- Formatting uses the repository-root .prettierrc (Svelte-aware via prettier-plugin-svelte)

Note: Structure follows common Svelte/SvelteKit conventions.

## Deployment

Automated via GitHub Actions: .github/workflows/official-cv-trigger.yml

- Triggers on pushes to main that change `sites/cv.arolariu.ro/**`
- Runs unit tests (npm run test:unit), then builds with npm (npm run prepare, npm run build)
- Deploys to Azure Static Web Apps using:
  - app_location: ./sites/cv.arolariu.ro/
  - api_location: ./sites/cv.arolariu.ro/build/server
  - output_location: build/static

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

- npm run preview — preview production build locally
- npm run test:e2e:a11y — Playwright accessibility suite against npm run preview on http://localhost:4173 (build first)

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
