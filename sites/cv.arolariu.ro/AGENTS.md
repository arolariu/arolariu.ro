# CV Local Guide

The CV is a standalone, static-first SvelteKit site deployed to Azure Static
Web Apps.

## Boundaries

- Do not import `@arolariu/components` or another monorepo package.
- Keep portfolio content and interactions intentionally small.
- Preserve prerendering and static deployment.

## Local Verification

```powershell
npm run build:cv
```

## Development

```powershell
npm run dev:cv
```
