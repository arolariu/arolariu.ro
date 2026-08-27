# CV Svelte Reference Catalog

Owner: `.github/instructions/svelte.instructions.md`. This catalog holds
extensive, repository-specific Svelte/SvelteKit examples, anti-patterns, edge
cases, and rationale for `sites/cv.arolariu.ro`. It does not define a
workflow and it does not restate the site's local commands — see
`sites/cv.arolariu.ro/AGENTS.md`. It does not duplicate `code-refactor`,
`code-documentation`, `code-unit-test`, or `code-fix-bug` skill workflow procedures; this
catalog explains the standalone architecture and runes/rendering/testing
conventions those workflows execute inside.

## Standalone boundary: no monorepo imports, no React patterns

The CV is deployed independently to Azure Static Web Apps via
`svelte-adapter-azure-swa` and never imports `@arolariu/components` or any
other `sites/*`/`packages/*` package:

```js
// sites/cv.arolariu.ro/svelte.config.js
import {vitePreprocess} from "@sveltejs/vite-plugin-svelte";
import azure from "svelte-adapter-azure-swa";

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: azure(),
    alias: {"@/*": "src/*"},
  },
};
```

Prefer the `@/*` alias (`@/hooks/useTheme.svelte`, `@/lib/utils`) for imports
that cross source-tree areas. Nearby or colocated modules may use relative
imports, as `presentation/Header.svelte` currently does. SvelteKit also
provides `$lib` for `src/lib`; the custom `@/*` alias spans the whole `src`
tree. Neither alias permits cross-package reuse. If a task seems to need a
component or utility that already exists in
`packages/components` or `sites/arolariu.ro`, that is a signal to reimplement
the small piece locally, not to add a cross-package dependency; ask before
adding any new external dependency.

### Anti-pattern: reaching into another site/package

```ts
// ❌ Anti-pattern: breaks standalone deployment and adds a cross-package coupling.
import {Button} from "@arolariu/components";
```

```svelte
<!-- ✅ Correction: small, local, CV-specific markup + styling instead. -->
<button class={styles.button} onclick={toggle}>Toggle theme</button>
```

## Runes: class-based state, not component-local `let` for shared state

Shared, cross-component reactive state is modeled as a plain class using
runes outside `.svelte` files, in a `*.svelte.ts` module, then exposed
through a small hook function — not through a Svelte store or context API:

```ts
// sites/cv.arolariu.ro/src/hooks/useTheme.svelte.ts
class ThemeState {
  private __theme__ = $state<Theme>("dark");

  constructor() {
    if (browser) {
      const stored = localStorage.getItem("theme") as Theme;
      this.__theme__ = stored ?? "dark";
      this.applyTheme(this.__theme__);
    }
  }

  get current(): Theme {
    return this.__theme__;
  }

  set(value: Theme) {
    this.__theme__ = value;
    if (browser) {
      localStorage.setItem("theme", value);
      this.applyTheme(value);
    }
  }
}

const themeState = new ThemeState();

export function useTheme() {
  return {
    get current(): Theme {
      return themeState.current;
    },
    toggle: () => themeState.toggle(),
    set: (value: Theme) => themeState.set(value),
  };
}
```

The module-level `themeState` singleton means every component calling
`useTheme()` shares one reactive source; the hook function only re-exposes
getters/methods so consumers cannot reassign the private field directly.
Guard every browser-only side effect (`localStorage`, `document`) behind
`browser` from `$app/environment` — this file is evaluated during
prerendering, where `window`/`document` do not exist.

Component-local, non-shared state stays a plain `$state` inside the
`.svelte` file's `<script>` block (`CommandPalette.svelte`'s `isOpen`,
`searchQuery`, `selectedIndex`) — do not promote state to a `*.svelte.ts`
class until more than one component needs it.

### `$derived` vs `$derived.by`

Use `$derived(expr)` for a single expression and `$derived.by(() => {...})`
when the computation needs a function body (loops, early returns,
intermediate variables):

```svelte
<!-- sites/cv.arolariu.ro/src/components/CommandPalette.svelte -->
<script lang="ts">
  const isDark = $derived(theme.current === "dark");

  const groupedCommands = $derived.by(() => {
    const groups = {
      navigation: [] as CommandAction[],
      action: [] as CommandAction[],
      contact: [] as CommandAction[],
    };
    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });
    return groups;
  });
</script>
```

### Anti-pattern: reactive state as a bare exported `let`

```ts
// ❌ Anti-pattern: no runes reactivity, consumers can mutate it directly,
// and it won't trigger re-renders when read from a component.
export let theme: "light" | "dark" = "dark";
```

```ts
// ✅ Correction — a runes class with a controlled setter, as ThemeState does.
```

## Static rendering: `+layout.ts` page options are the whole story

Every route inherits its rendering mode from one root
`src/routes/+layout.ts` — there is no per-route override anywhere in the
site:

```ts
// sites/cv.arolariu.ro/src/routes/+layout.ts
export const prerender = true;
export const ssr = true;
export const csr = true;
export const trailingSlash = "never";
```

`prerender = true` means every route must be resolvable at build time from
data already available in `src/data/*.ts` — do not add a route that depends
on a runtime-only external fetch without first confirming prerendering still
succeeds with the CV build command owned by root `AGENTS.md`. `csr = true` is
why client-only interactivity
(Command Palette, theme toggle, scroll progress) works after hydration even
though the HTML is fully pre-baked. If a new route genuinely cannot be
prerendered, that is a page-option change and needs explicit approval before
introducing `export const prerender = false` anywhere.

## State and effects: `onMount` for DOM listeners, `$effect` for derived resets

`CommandPalette.svelte` is a documented **layout singleton** — mounted
exactly once from `+layout.svelte` — specifically because it attaches a
document-level `keydown` listener in `onMount` and returns the cleanup
function:

```svelte
<script lang="ts">
  // CommandPalette is a layout singleton: it's mounted exactly once
  // from +layout.svelte and attaches a document-level keydown listener
  // in onMount (for the Cmd/Ctrl+K shortcut + arrow navigation). Do
  // NOT mount this component inside a route page or anywhere else —
  // each mount would attach another listener, leaking memory and
  // double-firing the global shortcut.
  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  });
</script>
```

Any new component that binds a global (`document`/`window`) listener needs
the same comment-documented singleton contract, or it must scope the
listener to the component's own DOM node instead.

`$effect` in this codebase is reserved for reacting to a derived value
changing, not for one-time setup — `onMount` still owns setup/teardown:

```svelte
<!-- sites/cv.arolariu.ro/src/components/CommandPalette.svelte -->
<script lang="ts">
  // Reset selected index when filtered results change
  $effect(() => {
    // Reference the derived value so the effect re-runs when it updates.
    flatCommands;
    selectedIndex = 0;
  });
</script>
```

### Edge case: an `$effect` with no reactive read never re-runs

An `$effect` body only re-runs when a rune it *reads* during its last run
changes. `flatCommands;` on its own line above is not a no-op — it is the
required reactive read that makes the effect re-fire when the derived list
changes. Deleting that line (because it "looks unused") silently breaks the
reset behavior; keep the explicit reference or the comment that explains it.

### Anti-pattern: `onMount` for a value derived from other reactive state

```svelte
<script lang="ts">
  // ❌ Anti-pattern: runs once at mount, never reacts to searchQuery changing.
  onMount(() => {
    selectedIndex = 0;
  });
</script>
```

```svelte
<script lang="ts">
  // ✅ Correction: read the derived value so the effect re-runs with it.
  $effect(() => {
    flatCommands;
    selectedIndex = 0;
  });
</script>
```

## Accessibility: native elements over ARIA reimplementation

`CommandPalette.svelte` uses a native `<dialog>` element specifically so the
browser supplies focus-trap, `Escape`-to-close, backdrop semantics, and
`inert` background handling for free:

```svelte
<!-- Command Palette Modal (native <dialog> handles focus-trap, ESC, backdrop, inert) -->
<dialog
  bind:this={dialogRef}
  class={styles.modal}
  aria-label="Command palette"
  onclose={() => { isOpen = false; searchQuery = ""; selectedIndex = 0; }}
  onclick={(e) => { if (e.target === dialogRef) close(); }}>
```

Every icon-only control has an explicit `aria-label`
(`ThemeToggle.svelte`'s `aria-label="Toggle theme"`), and keyboard
navigation is handled explicitly for custom widgets (arrow-key
`selectedIndex` cycling, `Enter` to activate) rather than relying on default
`<button>` behavior alone, because the command list itself is not a native
list element.

`tests/accessibility.spec.ts` runs axe-core WCAG 2.1 AA checks across every
route (`/`, `/human/`, `/json/`, `/pdf/`), plus explicit heading-hierarchy,
landmark, link-name, color-contrast, and keyboard-focus assertions — treat
that file as the authoritative list of accessibility properties a new route
or component must not regress, and extend `CV_PAGES` when adding a route.

### Anti-pattern: a custom modal built from a positioned `<div>`

```svelte
<!-- ❌ Anti-pattern: no focus trap, no Escape handling, no inert background,
     and the browser gives you none of it for free. -->
<div class={styles.modal} role="dialog">
  ...
</div>
```

```svelte
<!-- ✅ Correction: a native <dialog>, as CommandPalette.svelte uses. -->
```

## Styling: co-located CSS Modules, shared tokens via `_tokens.scss`

Every component owns a sibling `ComponentName.module.scss` imported as
`styles` and applied via `class={styles.x}` —
`ThemeToggle.svelte`/`ThemeToggle.module.scss`,
`CommandPalette.svelte`/`CommandPalette.module.scss`. Global design tokens,
breakpoints, and shared effects live once in `src/styles/_tokens.scss`,
`_breakpoints.scss`, and `_effects.scss`, imported by `global.scss` — do not
redefine a color/spacing token inside a component module; import the shared
partial instead. Class-name composition across conditional states uses the
repository's small `cx` helper from `@/lib/utils`, not string
concatenation or a template literal:

```svelte
<!-- sites/cv.arolariu.ro/src/components/CommandPalette.svelte -->
<button
  class={cx(styles.commandItem, isSelected ? styles.commandItemSelected : styles.commandItemIdle)}>
```

## Tests: Vitest + Testing Library for units, Playwright for behavior/a11y

Unit tests are colocated `Component.test.ts` files using
`@testing-library/svelte` and query by accessible role/name, not by
implementation detail:

```ts
// sites/cv.arolariu.ro/src/components/ThemeToggle.test.ts
describe("ThemeToggle", () => {
  beforeEach(() => {
    // Pin theme to "dark" so the click-to-toggle assertion is deterministic.
    useTheme().set("dark");
  });

  it("clicking the button toggles the theme from dark to light", async () => {
    expect(useTheme().current).toBe("dark");
    const {getByRole} = render(ThemeToggle);
    await fireEvent.click(getByRole("button", {name: /toggle theme/i}));
    expect(useTheme().current).toBe("light");
  });
});
```

Because `useTheme()` is a module-level singleton, every test that depends on
its value explicitly resets it in `beforeEach` rather than assuming a fresh
module per test — copy this pattern for any new singleton-backed component
test instead of relying on module isolation.

`vitest.config.ts` deliberately excludes `**/*.svelte` component files from
coverage under `src/routes/**`, `src/lib/views/**`, `src/presentation/**`,
and `src/components/**`, routing UI verification to Playwright instead:

```ts
// sites/cv.arolariu.ro/vitest.config.ts
coverage: {
  exclude: [
    // UI Components (will be tested via E2E)
    "**/src/routes/**/*.svelte",
    "**/src/lib/views/**/*.svelte",
    "**/src/presentation/**/*.svelte",
    "**/src/components/**/*.svelte",
    ...
```

New `.svelte` component logic still gets a colocated `.test.ts` for its
exported/composable behavior (see `ThemeToggle.test.ts`,
`CommandPalette.test.ts`), but full render/interaction/a11y assurance for a
new route belongs in `tests/*.spec.ts` via Playwright, following
`accessibility.spec.ts`'s pattern of iterating a `CV_PAGES` list.

### Edge case: SvelteKit module mocks required before import-time code runs

`vitest.setup.ts` installs a `localStorage` mock at **module scope**, not
inside `beforeEach`, with an explicit comment explaining why:

```ts
// sites/cv.arolariu.ro/vitest.setup.ts
// localStorage must be installed at MODULE scope, not inside `beforeEach`.
// Vitest runs setup files before importing the test file, but `beforeEach`
// hooks only fire after that import has completed. Modules that touch
// localStorage during evaluation — e.g. src/hooks/useTheme.svelte.ts, which
// instantiates its ThemeState singleton at import time — would otherwise throw
// "Cannot read properties of undefined (reading 'getItem')" ...
```

Any new module with import-time side effects that touch a browser API needs
its mock installed the same way — at setup-file module scope — or the whole
test file fails to collect, not just the affected test.

`vitest.config.ts` also aliases `$app/environment`, `$app/navigation`,
`$app/state`, and `$app/stores` to files under `src/__mocks__/$app/` so
SvelteKit's virtual modules resolve in the Vitest/Node environment; add a new
mock there (matching the real module's exported shape) before importing an
unmocked `$app/*` module in a unit test.

## Live source pointers

- `sites/cv.arolariu.ro/svelte.config.js` — Azure SWA adapter, `@/*` alias.
- `sites/cv.arolariu.ro/src/routes/+layout.ts` — site-wide prerender/ssr/csr
  page options.
- `sites/cv.arolariu.ro/src/hooks/useTheme.svelte.ts` — runes-class shared
  state pattern.
- `sites/cv.arolariu.ro/src/components/CommandPalette.svelte` — layout
  singleton, `$derived.by`, `$effect`, native `<dialog>`, keyboard
  navigation.
- `sites/cv.arolariu.ro/src/components/ThemeToggle.svelte` /
  `ThemeToggle.test.ts` — accessible icon-only control and its test.
- `sites/cv.arolariu.ro/src/styles/_tokens.scss`, `_breakpoints.scss`,
  `_effects.scss`, `global.scss` — shared design tokens.
- `sites/cv.arolariu.ro/tests/accessibility.spec.ts` — WCAG 2.1 AA
  Playwright coverage and the `CV_PAGES` route list.
- `sites/cv.arolariu.ro/vitest.config.ts`, `vitest.setup.ts` — coverage
  exclusions and `$app/*`/browser-API mocks.
