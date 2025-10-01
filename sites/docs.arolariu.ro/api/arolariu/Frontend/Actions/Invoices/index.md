---
uid: arolariu.Frontend.Actions.Invoices
title: Invoice Actions
---

# arolariu.Frontend.Actions.Invoices

Server action set focused on invoice domain interactions with the backend API.

| Action | UID | Purpose |
| ------ | --- | ------- |
| `fetchInvoices` | `arolariu.Frontend.Actions.Invoices.fetchInvoices` | Retrieve all invoices for an authenticated user session. |

## Design Principles

- Each action performs exactly one network interaction.
- Explicit parameters (no hidden global auth mutation).
- Errors bubble upward (no UI coupling).

## Planned Additions

| Action (Proposed) | Description |
| ----------------- | ----------- |
| `fetchInvoice` | Retrieve a single invoice by ID. |
| `uploadInvoice` | Upload a new invoice document / metadata. |
| `updateInvoice` | Patch mutable invoice fields. |
| `analyzeInvoice` | Trigger server-side analysis / enrichment. |

## Template for New Invoice Action

```md
# actionName

Short purpose statement.

## Signature
```ts
async function actionName(params: /*...*/): Promise<ResultType>;
```
## Parameters
| Name | Type | Description |
| ---- | ---- | ----------- |
| param | type | What it does. |

## Returns
Describe resolved value.

## Behavior Notes
- Log style
- Error mapping

## Example
```ts
await actionName(/*...*/);
```

## Related
- <xref:arolariu.Frontend.Actions.Invoices.fetchInvoices>
```

## Related

- Parent actions overview: <xref:arolariu.Frontend.Actions>
- Fetch all invoices: <xref:arolariu.Frontend.Actions.Invoices.fetchInvoices>
- Global state store: <xref:arolariu.Frontend.Hooks.useZustandStore>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial invoices actions index. | Alexandru-Razvan Olariu |
