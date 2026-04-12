# Contributing to AROLARIU.RO

First off, thank you for considering contributing to `arolariu.ro`! It's people like you that make open source great.

## Getting Started

**New to the project?** Start with the [Development Guide](DEVELOPMENT.md) — it covers setup, tooling, and getting your dev environment running in minutes.

**Choose your workspace profile** for a tailored VS Code experience:
- 🌐 **Frontend** — `.vscode/frontend.code-workspace` (Next.js, components, CV site)
- 🔧 **Backend** — `.vscode/backend.code-workspace` (.NET API, Python exp service)
- 🚀 **Fullstack** — `.vscode/fullstack.code-workspace` (everything + compound debug)

## Where do I go from here?

If you've noticed a bug or have a feature request, [make one](https://github.com/arolariu/arolariu.ro/issues/new/choose)! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

If you have a general question, feel free to reach out or start a discussion.

## Fork & create a branch

If this is something you think you can fix, then fork `arolariu.ro` and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```bash
git checkout -b 325-add-japanese-translations
```

**Branch naming conventions:**
- `feat/description` — new features
- `fix/description` — bug fixes
- `refactor/description` — code refactoring
- `docs/description` — documentation changes

## Get the test suite running

Make sure you're familiar with the project structure and how to run tests:

```bash
npm run test             # all tests
npm run test:website     # frontend unit tests (Vitest)
npm run test:api         # backend tests (xUnit)
npm run test:e2e         # end-to-end tests (Playwright + Newman)
```

Details for each sub-project can be found in their respective `README.md` files (if available) or by inspecting their `package.json` or `.csproj` files.

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first :smile_cat:

## Before Submitting a PR

Run these checks locally — they're the same ones CI will run:

```bash
npm run format           # auto-fix formatting (Prettier)
npm run lint             # check for lint errors (ESLint)
npm run test:unit        # run unit tests
npm run doctor           # check workspace health
```

### Per-Role Checklist

**Frontend changes:**
- [ ] TypeScript strict mode — no `any` types
- [ ] Components use `Readonly<Props>` and explicit return types
- [ ] All user-facing strings go through `next-intl` (no hardcoded text)
- [ ] Loading, error, and empty states handled
- [ ] Accessibility: semantic HTML, ARIA attributes, keyboard navigation
- [ ] Tests written with Vitest + Testing Library

**Backend changes:**
- [ ] Follow The Standard layer hierarchy (Brokers → Foundation → Orchestration → Processing → Endpoints)
- [ ] Max 2-3 dependencies per service (Florance Pattern)
- [ ] XML documentation on all public APIs
- [ ] `.ConfigureAwait(false)` in library code
- [ ] Tests written with xUnit
- [ ] No business logic in Brokers

**All changes:**
- [ ] Conventional commit message (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- [ ] No secrets or credentials in code
- [ ] Documentation updated if behavior changes

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with `arolariu.ro`'s master branch:

```bash
git remote add upstream git@github.com:arolariu/arolariu.ro.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of master, and push it!

```bash
git checkout 325-add-japanese-translations
git rebase main
git push --force-with-lease origin 325-add-japanese-translations
```

Finally, go to GitHub and make a Pull Request.

## Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

To learn more about rebasing in Git, there are a lot of good resources but here's the suggested workflow:

```bash
git checkout 325-add-japanese-translations
git pull --rebase upstream main
git push --force-with-lease origin 325-add-japanese-translations
```

## Code Style

This project enforces strict code quality standards:
- **TypeScript**: Strictest mode with zero `any` tolerance
- **C#**: XML docs required, `TreatWarningsAsErrors` enabled
- **Formatting**: Prettier (TS/JS), `.editorconfig` (C#)
- **Linting**: ESLint with 20+ plugins

Run `npm run format && npm run lint` before committing. CI will reject PRs that don't pass.

## Further Reading

- **[DEVELOPMENT.md](DEVELOPMENT.md)** — Setup, tooling, debugging, troubleshooting
- **[docs/rfc/](docs/rfc/)** — Architecture decisions and design patterns
- **[AGENTS.md](AGENTS.md)** — AI agent guidance for automated contributions

Thank you for contributing!
