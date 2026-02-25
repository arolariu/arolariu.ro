---
description: "Git tags matching 'components-v*' trigger the official-components-publish.yml workflow: build, test, npm publish, and GitHub release creation"
type: convention
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Tag-based publishing workflow triggers on components-v prefix

The component library follows a tag-driven release process rather than branch-based publishing. Pushing a git tag matching the `components-v*` pattern (e.g., `components-v1.2.0`) triggers the `official-components-publish.yml` GitHub Action, which executes a four-step pipeline: build the library with RSLib, run the test suite, publish the package to the npm registry under the `@arolariu/components` scope, and create a corresponding GitHub Release.

The `workflow_dispatch` trigger is also enabled, allowing manual releases from the GitHub Actions UI without creating a tag. This serves as a fallback for hotfix publishes or re-runs after transient CI failures.

The tag prefix `components-v` namespaces component releases away from other potential release tags in the monorepo (the API, the website, infrastructure). This means the monorepo can have independent release cadences for different packages -- a component library patch does not require a website deployment, and vice versa. The version in `package.json` must be updated manually before tagging; there is no automatic version bumping.

---

Related Insights:
- [[rslib-bundles-components-as-unbundled-esm-for-per-file-tree-shaking]] -- foundation: RSLib build is step 1 of the publish pipeline
- [[storybook-stories-use-satisfies-meta-with-autodocs-for-documentation]] -- extends: Storybook deploy happens in CI alongside publishes

Domains:
- [[component-library]]
