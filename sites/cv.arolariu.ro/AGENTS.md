# CV Site Agent Guide (cv.arolariu.ro)

> SvelteKit 2 — Standalone personal portfolio

## Architecture

- **Standalone** — zero dependencies on monorepo packages
- **Static-first** — pre-rendered via SvelteKit adapter
- **Azure Static Web Apps** deployment

## Commands

```bash
npm run build:cv    # Build
npm run dev:cv      # Dev server → http://localhost:4173
```

## Rules

- Do NOT import from `@arolariu/components` or other monorepo packages
- Use SvelteKit 2 conventions (not React patterns)
- Minimal complexity — CV/portfolio content only
- TypeScript strict mode
