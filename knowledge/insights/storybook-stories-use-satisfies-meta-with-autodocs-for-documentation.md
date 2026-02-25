---
description: "Stories declare meta with 'satisfies Meta<typeof Component>' for type checking, 'UI/Name' title convention, and 'autodocs' tag for automatic API doc generation"
type: convention
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Storybook stories use satisfies Meta with autodocs for documentation

Every component in the library has a corresponding story file in `stories/` that follows a strict structure. The meta object uses TypeScript's `satisfies Meta<typeof Component>` (not a type annotation) to get type checking while preserving the inferred literal types that Storybook needs for its type system. The `title` field follows a `"UI/ComponentName"` convention that organizes stories into a UI category in Storybook's sidebar navigation.

The `tags: ["autodocs"]` entry is mandatory for all stories. It triggers Storybook's automatic API documentation generation, which reads the component's TypeScript props interface and produces a reference table of all accepted props with their types, defaults, and descriptions. This eliminates the need for hand-maintained prop documentation.

The `argTypes` object maps variant props to Storybook controls -- typically `control: "select"` with options matching the cva variant keys. This lets Storybook's interactive controls panel mirror the exact variants defined in the component's cva configuration, creating a live variant playground. Individual stories are typed as `StoryObj<typeof meta>` and define their `args` to showcase specific variant combinations, ensuring that each story is a typed, reproducible component state.

Storybook is deployed to https://storybook.arolariu.ro via CI on main branch push, serving as the living documentation for the entire component catalogue.

---

Related Insights:
- [[class-variance-authority-defines-component-variants-as-typed-tailwind-configurations]] -- foundation: argTypes mirror the cva variant options
- [[tag-based-publishing-workflow-triggers-on-components-v-prefix]] -- extends: Storybook deploys alongside the npm package in CI

Domains:
- [[component-library]]
