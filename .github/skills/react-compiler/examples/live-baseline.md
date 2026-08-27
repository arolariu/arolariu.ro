# Live React Compiler Baseline

Inspect these files directly before every audit because configuration can
change independently of this skill.

## Dependency

- `package.json`
- `package-lock.json`

The root manifest currently declares `eslint-plugin-react-compiler`. Presence
in the manifest is availability only.

## ESLint

- `eslint.config.ts`

The website config currently registers React, React DOM, React Hooks, React X,
React Web API, and related plugins. It does not import or register
`eslint-plugin-react-compiler`, so that package currently contributes no
explicit plugin diagnostics through this config.

## Next.js transform

- `sites/arolariu.ro/next.config.ts`

There is no top-level `reactCompiler` option. The existing `compiler` object
contains SWC `removeConsole` and `reactRemoveProperties` settings; it must not
be counted as React Compiler adoption.

## Source probes

Start a readiness sample with:

- `sites/arolariu.ro/src/hooks/usePagination.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/`
- a high-interaction route island and its colocated tests.

These exercise derivation, refs, effects, stable callbacks, cleanup, and
client boundaries. Findings from a sample do not prove whole-website
compatibility.

## Documentation authority

Check the current official React Compiler and Next.js `reactCompiler` pages
linked from `SKILL.md` before giving configuration instructions. If their
requirements differ from installed packages or live config, report the drift
and stop before mutation.
