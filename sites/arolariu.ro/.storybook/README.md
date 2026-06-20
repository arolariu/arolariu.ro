# Website Storybook Infrastructure

This Storybook belongs to `sites/arolariu.ro`. It is separate from the shared component library Storybook in `packages/components`.

## Layers

### Core layer: `.storybook`

The core layer owns app-wide Storybook behavior:

- `main.ts`: framework, addons, static dirs, Vite composition, build/test settings.
- `preview.tsx`: global CSS, parameters, globals, decorators, browser mocks.
- `decorators.tsx`: next-intl, theme, font, and theme preset decorators.
- `mocks/`: app-wide mocks such as Clerk and `next/image`.
- `viteAliases.ts`: core-only Storybook Vite aliases.
- `domainAliases.ts`: composition point for domain-owned Storybook aliases.
- `vitest.setup.ts`: project annotations for the portable Storybook Vitest project.

The core layer must stay domain-agnostic. Do not add individual invoice action or hook paths directly to `main.ts`.

### Invoice layer: `src/app/domains/invoices/_storybook`

The invoice layer owns invoice-specific story support:

- `fixtures/`: canonical invoice, merchant, scan, recipe, and upload fixtures.
- `providers/`: small provider wrappers for invoice contexts.
- `stores/`: Zustand reset and seed helpers.
- `mocks/`: invoice server-action and hook mocks.
- `test-utils/`: story setup helpers (`setupInvoiceListStory`, `setupViewInvoiceStory`, `setupEditInvoiceStory`, `setupScanUploadStory`).
- `domainAliases.ts`: invoice-owned aliases and resolver plugins (build-time only — never imported by the browser barrel).
- `styles/`: Storybook-only CSS Modules for invoice harnesses.

> The invoice barrel (`_storybook/index.ts`) is imported by the browser preview, so it must stay browser-safe. Keep Node-only modules such as `domainAliases.ts` out of the barrel.

## Adding invoice stories

1. Co-locate the `.stories.tsx` file with the component.
2. Import invoice story helpers from `@/app/domains/invoices/_storybook`.
3. Use `beforeEach` to reset and seed Zustand state.
4. Use the smallest provider wrapper that satisfies the component.
5. Add `play` functions for meaningful interactions.
6. Keep stories strict-a11y compatible.

## Mocking strategy

- Use module/provider mocks for server actions and internal hooks.
- Use Clerk and `next/image` mocks from the core layer.
- Use MSW only for direct HTTP calls from components or hooks.
- Do not use broad skips to hide failing stories.

## Verification

Do not run ESLint, `npm run lint`, or `npm run test:website` for Storybook infrastructure work.

Use targeted commands:

```powershell
# Production-style build that type-checks and bundles every story.
npm run test:storybook

# Strict Vitest browser project: renders every story, runs play functions, and
# enforces accessibility (a11y `test: "error"`).
npm run test:storybook:vitest

# Run a single story file (fast iteration).
npx vitest run --config vitest.storybook.config.ts "src/app/domains/invoices/_dialogs/DeleteInvoiceDialog.stories.tsx"
```

The Vitest browser project uses Playwright/Chromium with an explicit IPv4 host and
port (`127.0.0.1:6011`) to avoid Windows-reserved/excluded port ranges.

Use Playwright MCP, Playwright CLI, or focused Playwright scripts for browser behavior checks.
