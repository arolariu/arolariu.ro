---
uid: arolariu.Frontend.Actions.Invoices.fetchInvoices
title: fetchInvoices
---

# fetchInvoices

Server action that retrieves all invoices for the authenticated user from the backend REST API.

## Signature

```ts
async function fetchInvoices(authToken: string): Promise<Invoice[]>;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `authToken` | `string` | Yes | Bearer JWT for the current user/session. |

## Returns

| Type | Description |
| ---- | ----------- |
| `Promise<Invoice[]>` | Resolves to an array of `Invoice` domain objects when the request succeeds. |

## Implementation Overview

Source (simplified):

```ts
const response = await fetch(`${API_URL}/rest/v1/invoices/`, {
  headers: {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  },
});

if (response.ok) {
  return response.json() as Promise<Invoice[]>;
} else {
  throw new Error(`Failed to fetch invoices. Status: ${response.status}`);
}
```

## Behavior Notes

- Logs an informational line prior to calling the backend (includes the auth token length only if you adapt for security; current implementation logs the token itself—consider redaction).
- Throws on any non-2xx status with a message including the HTTP status code.
- Propagates network / parsing errors (caught, logged, re-thrown).

## Example Usage

```ts
import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";

async function loadUserInvoices(token: string) {
  try {
    const invoices = await fetchInvoices(token);
    console.log("Loaded", invoices.length, "invoices");
    return invoices;
  } catch (error) {
    // Surface to UI layer (toast, error boundary, etc.)
    throw error;
  }
}
```

With Zustand integration:

```ts
const { setInvoices } = useZustandStore();
fetchInvoices(authToken).then(setInvoices).catch(console.error);
```

## Error Handling Pattern

| Failure Mode | Thrown Error Message | Recommended UI Handling |
| ------------ | -------------------- | ----------------------- |
| Unauthorized (401) | `Failed to fetch invoices. Status: 401` | Prompt re-auth / refresh token. |
| Forbidden (403) | `Failed to fetch invoices. Status: 403` | Show permission warning. |
| Network failure | (Original error message) | Retry with backoff; offline indicator. |
| 5xx backend | `Failed to fetch invoices. Status: 500` | Retry or show maintenance notice. |

## Security Considerations

| Aspect | Note | Recommendation |
| ------ | ---- | ------------- |
| Token Logging | Current implementation logs raw `authToken`. | Sanitize or omit sensitive tokens in production logs. |
| Transport | Relies on HTTPS (enforced externally). | Ensure backend URL uses TLS; avoid mixed content. |
| Scope | No scoping / filtering params. | Add query params (pagination, filtering) if dataset grows. |

## Potential Enhancements

- Add pagination parameters (page, pageSize).
- Integrate abort controllers for cancellation.
- Introduce structured error types vs generic `Error`.
- Token redaction in logging (`authToken.slice(0,4)+"…"`).

## Related

- <xref:arolariu.Frontend.Actions>
- <xref:arolariu.Frontend.Hooks.useZustandStore>
- Utility for JWT creation: <xref:arolariu.Frontend.Utils.createJwtToken>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
