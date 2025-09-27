---
uid: arolariu.Frontend.Actions
title: Frontend Server Actions
---

# arolariu.Frontend.Actions

Server (“use server”) functions acting as a thin integration layer between the Next.js frontend and backend REST endpoints.
They encapsulate authentication headers, logging, and error normalization, returning typed domain models.

| Action Group | Example Function | Purpose |
| ------------ | ---------------- | ------- |
| Invoices | `fetchInvoices` | Retrieve invoice collections for an authenticated user. |

> [!NOTE]
> Actions run on the server runtime (Node / Edge) and may access secrets or environment variables not available to client code.

## Conventions

- Filenames use verb-object form (e.g., `fetchInvoices.ts`).
- Errors are logged with contextual data and re-thrown to allow upstream handling (UI toast, retry, etc.).
- Authentication uses Bearer JWT tokens passed explicitly into the action (caller supplies valid token).

## Current Coverage

- Invoices domain (index + `fetchInvoices` action documented).
- Additional actions (analyze, upload, update, single fetch) can follow the same template.

## Adding a New Action (Checklist)

1. Implement server file under `lib/actions/<domain>/`.
2. Accept explicit auth / context parameters (avoid hidden globals).
3. Validate `response.ok`; throw descriptive Error on failure.
4. Add documentation page mirroring `fetchInvoices` structure.
5. Update this overview table and group index.
6. Add entry to Frontend `toc.yml`.

## Related

- Hooks: <xref:arolariu.Frontend.Hooks>
- Utilities: <xref:arolariu.Frontend.Utils>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial actions overview page. | Alexandru-Razvan Olariu |
