---
description: Domain map for @arolariu/components shared UI library with Radix UI and shadcn
type: moc
created: 2026-02-25
---

# component library

Shared UI component library at packages/components/. 70+ Radix UI/shadcn components consumed by the Next.js frontend. Built with RSLib, styled via Tailwind CSS with class-variance-authority variants, published to npm under the @arolariu/components scope.

## Core Insights

### Architecture Decisions
- [[radix-ui-primitives-provide-accessibility-foundation-for-all-interactive-components]] -- Radix chosen over MUI, Chakra, Headless UI for unstyled a11y primitives
- [[rslib-bundles-components-as-unbundled-esm-for-per-file-tree-shaking]] -- RSLib with bundle:false produces per-file ESM for optimal tree-shaking
- [[sideeffects-false-enables-aggressive-tree-shaking-across-70-plus-components]] -- sideEffects:false lets bundlers drop unused modules safely

### Conventions
- [[components-follow-four-step-structure-of-variants-props-forwardref-and-export]] -- canonical four-step file structure: cva, props, forwardRef, export
- [[class-variance-authority-defines-component-variants-as-typed-tailwind-configurations]] -- cva() is the standard variant definition mechanism with auto-typed props
- [[direct-component-imports-preferred-over-barrel-imports-for-bundle-size]] -- @arolariu/components/button over @arolariu/components for smaller bundles
- [[storybook-stories-use-satisfies-meta-with-autodocs-for-documentation]] -- satisfies Meta, UI/Name title, autodocs tag, variant argTypes
- [[tag-based-publishing-workflow-triggers-on-components-v-prefix]] -- components-v* tags trigger build-test-publish-release pipeline

### Patterns
- [[cn-utility-merges-tailwind-classes-with-conflict-resolution]] -- clsx + tailwind-merge for safe class overrides in every component
- [[compound-component-pattern-composes-complex-ui-from-named-sub-parts]] -- Card, Dialog, Sidebar decompose into composable named sub-components
- [[aschild-prop-enables-polymorphic-rendering-via-radix-slot]] -- Radix Slot enables rendering as different elements without wrapper divs

### Constraints
- [[base-styles-import-required-once-at-app-entry-point]] -- CSS custom properties must be loaded via styles export at app root

### Cross-Domain Dependencies
- [[component-library-provides-client-side-primitives-consumed-by-island-pattern]] -- components are client-side, consumed in island.tsx not page.tsx

## Key Source Documents

- RFC 1006: Component Library Architecture
- packages/components/src/index.ts -- barrel export file
- packages/components/rslib.config.ts -- build configuration
- packages/components/package.json -- exports map and package metadata
- .github/workflows/official-components-publish.yml -- CI/CD publishing

## Tensions

(none yet)

## Open Questions

- How should new component categories (e.g., animated backgrounds) be organized in Storybook?
- What is the versioning strategy for breaking changes in the component API?
- How do design tokens flow from Tailwind config into the CSS custom properties that components consume?
