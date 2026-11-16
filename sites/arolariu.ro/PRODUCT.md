# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four audiences, confirmed by the site owner. Most visits are short and start on the home page, so every route has to explain itself quickly.

- **Recruiters and hiring managers** evaluate the author's engineering and product craft. They skim the home, About, and The Author pages
  and decide fast.
- **Fellow engineers** read The Platform page, the architecture card, and the open-source repository. They judge patterns, tests, and
  honesty, and they notice details.
- **Invoice-domain users** are signed-in people who turn paper and photographed receipts into structured, searchable, analyzable invoices
  and want clear insight into their spending.
- **Friends, family, and community** visit casually, often on a phone, and should feel welcome rather than tested.

## Product Purpose

arolariu.ro is a personal full-stack platform that is at once a portfolio, a technology showcase, and a home for working product "domains".
Today the one domain is **Invoices**: scan or upload a receipt, review the extracted invoice, organize it, and analyze spending. The site
describes itself as "a playground for modern technologies, a showcase of best practices".

Success means three things together:

- visitors leave with a clear, positive impression of the author's craft;
- invoice users get from receipt to insight without friction;
- people feel **energized and happy** using the site. This is the owner's stated goal for the visual identity and the UX mechanics.

## Positioning

The portfolio _is_ the product. The same open-source codebase that presents the author is a production-deployed, tested system (website,
API, infrastructure, shared component library) with a real domain application behind it. A portfolio template cannot truthfully claim a
working invoice-intelligence product; a receipt app cannot truthfully claim an inspectable, open-source engineering showcase. Both claims
are true here, and visitors can verify them.

## Operating Context

- Two live environments: production at `https://arolariu.ro` and staging at `https://dev.arolariu.ro`. Branch-to-environment mapping is
  owned by root `AGENTS.md`. The staging site is the visual reference for the documentation in this folder.
- Sibling sites are linked from the footer: `cv`, `api`, and `docs` subdomains.
- Pages sit behind a first-visit EULA and cookie-preferences gate (the global 404 page is outside it). Authentication uses Clerk. Invoice
  workflows need a signed-in account; guests can browse public surfaces and publicly shared invoices.
- The interface ships in English, Romanian, and French, in light and dark mode, and with a theme-preset system.
- The site must work on desktop and on phones; the header, navigation, and invoice hub have dedicated mobile layouts.

## Capabilities and Constraints

Confirmed capabilities:

- Marketing and credibility surfaces: Home, About, The Author, The Platform, Acknowledgements, Terms of Service, Privacy Policy.
- Invoice domain: hub, scan upload, scan library, create invoice, invoice list with statistics, invoice detail, invoice edit, sharing, and
  export (PDF, CSV and JSON for a single invoice; JSON only for the invoice list). Bulk import is a placeholder that processes no files.
- My Profile for signed-in users, a command palette (Commander) behind a feature flag, a theme toggle, and locale and font preferences.
- An engineering worker playground that renders only under a local `next dev` server; every deployed build, staging included, answers 404.
  It is not linked from the navigation.

Constraints that future work must preserve:

- Server Components by default; interactivity lives in small client islands. Access decisions are made on the server, never only in client
  UI.
- User-facing text is translated in all three locales, with a few documented exceptions in UX-FLOWS.md.
- Shared UI comes from `@arolariu/components`; site styling uses SCSS and CSS Modules.
- The repository, versions, commands, and risk boundaries are owned by root `AGENTS.md`; this document does not restate them.

Terminology: a **domain** is a product area under `/domains`; a **scan** is an uploaded receipt image; an **invoice** is the structured
record derived from one or more scans; **Commander** is the command palette.

Open product facts, recorded rather than decided: homepage technology cards currently disagree with the About page and the architecture card
on framework versions (see the known gaps in `UX-FLOWS.md`).

## Brand Commitments

- The name is written lowercase as **arolariu.ro**; the author is **Alexandru-Razvan Olariu**.
- The platform is open source and says so. Claims about the stack must stay accurate to the code.
- Existing copy sets a plain-spoken, confident voice ("To build software that makes a difference."; "Practical tools. Clean insights. Built
  for everyday spending."). This voice is inferred from shipped copy, not separately specified.
- The visual identity, "The Jewel Atelier", is recorded in `DESIGN.md`. It is the continuation of the earlier "Crystalline Court" look, not
  a redesign.

## Evidence on Hand

- Live environments at both URLs above and a public GitHub repository linked from the site.
- Sixteen reference screenshots of the staging site in `docs/screenshots/` (build `1fce0ee1b`, captured with reduced motion).
- Automated tests: colocated Vitest suites, Playwright journeys, and accessibility and ARIA snapshot specs (see `UX-FLOWS.md`).
- Self-reported About-page figures (lines of code, technology count, test coverage, years active) come from message copy and are not
  independently verified here.

Absences that future work must not fabricate: customer testimonials, usage or retention numbers, pricing, and committed screenshots of
authenticated screens.

## Product Principles

1. **The site is the proof.** Prefer shipping real, working behavior to describing it. Every screen doubles as evidence of craft.
2. **Delight where visitors decide; calm where they work.** Atmosphere and motion belong on first-impression surfaces. Invoice workflows
   stay scannable and predictable so people finish their task and leave happy.
3. **Honest and inspectable.** Copy about the stack, numbers, and status must match the code. A visible claim that drifts is a defect.
4. **Nobody is left outside the door.** Guests get a real taste of the product, protected routes should send people to sign-in with a way
   back rather than a dead end (most do; the exceptions are listed in `UX-FLOWS.md`), and preferences (language, theme, font, motion) are
   respected everywhere.
5. **One identity across every surface.** The portfolio, the invoice tool, and the sign-in screen should feel like the same studio.

## Accessibility & Inclusion

- Dyslexia-friendly typography is a first-class option (Atkinson Hyperlegible, persisted per browser).
- `prefers-reduced-motion`, `prefers-contrast: more`, and forced-colors are honored by the global styles.
- Three languages (English, Romanian, French) share one message structure; light, dark, and system themes are supported.
- The command palette lets you jump to the homepage and change theme, language, and font from the keyboard.
- Automated accessibility coverage exists for the site. The shared component library documents its WCAG 2.2 A/AA approach in
  `packages/components/ACCESSIBILITY.md`; no formal site-wide conformance claim is recorded, and emulated tests do not establish one.
