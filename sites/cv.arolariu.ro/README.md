# CV — Alexandru‑Razvan Olariu (Svelte 5)

Production-ready Svelte 5 codebase powering the personal CV of Alexandru‑Razvan Olariu, focused on simplicity, speed, and clean content presentation.

- Live site: https://cv.arolariu.ro
- Monorepo path: sites/cv.arolariu.ro
- Platform: Azure Static Web Apps (via GitHub Actions)

## Tech stack

- Svelte 5 + (SvelteKit conventions)
- Node.js + Yarn (Corepack-enabled)
- Prettier + prettier-plugin-svelte

## Features

- Responsive, fast, and accessible CV
- Clean typographic layout optimized for reading and printing
- Simple local development and CI/CD deployment workflow

## Getting started

Prerequisites:

- Node.js ≥ 18
- Corepack (ships with modern Node.js)

Install and run:

```bash
corepack enable
yarn install --immutable
yarn dev
```

Build and preview:

```bash
yarn build
yarn preview
```

## Project structure

- src/… — application code (routes, components, styles)
- static/ — static assets (favicons, images, etc.)
- build/ — production artifacts (generated on build)
- .prettierrc — formatting rules (Svelte-aware)
- .yarnrc.yml — Yarn configuration

Note: Structure follows common Svelte/SvelteKit conventions.

## Deployment

Automated via GitHub Actions: .github/workflows/cv-official-trigger.yml

- Triggers on pushes to main
- Builds with Yarn
- Deploys to Azure Static Web Apps using:
  - app_location: ./
  - api_location: ./build/server
  - output_location: ./build/static

Required secret:

- AZURE_STATIC_WEB_APPS_CV_TOKEN — API token for the target SWA

Manual trigger: available via workflow_dispatch in GitHub Actions.

## Scripts (common)

- yarn dev — start local dev server
- yarn build — production build
- yarn preview — preview production build locally
- yarn format — format with Prettier (if configured in package.json)

## Contributing

This repository contains multiple applications; please keep changes scoped to sites/cv.arolariu.ro when editing the CV. Follow the existing formatting and commit conventions.

## Author

- Alexandru‑Razvan Olariu — https://arolariu.ro
- CV: https://cv.arolariu.ro
- Contact details are available on the website.
