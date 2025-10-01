---
uid: arolariu.Frontend.Utils.isBrowserStorageAvailable
title: isBrowserStorageAvailable
---

# isBrowserStorageAvailable

Feature-detects availability of the Web Storage API (`localStorage` or `sessionStorage`) in a safe, MDN-recommended manner.
Handles quota & privacy mode exceptions gracefully.

## Signature

```ts
function isBrowserStorageAvailable(type: "localStorage" | "sessionStorage"): boolean;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `type` | `"localStorage" \| "sessionStorage"` | Yes | Storage bucket to test. |

## Returns

| Type | Description |
| ---- | ----------- |
| `boolean` | `true` if storage is writable, otherwise `false` (including quota-restricted cases). |

## Detection Strategy

1. Access `window[type]`.
2. Attempt to set & remove a test key.
3. Catch thrown exceptions:
   - Returns `true` only if exception indicates quota exceeded *and* storage length > 0 (indicating existing usable data but quota full).
   - Otherwise returns `false`.

## Typical Usage

```ts
if (isBrowserStorageAvailable("localStorage")) {
  localStorage.setItem("theme", "dark");
} else {
  // Fallback: in-memory map or cookie
}
```

## Edge Cases

| Scenario | Result |
| -------- | ------ |
| Safari Private Mode (quota writes throw) | May return `true` if existing items & quota exceeded semantics apply, else `false`. |
| Disabled storage (corporate policy / extension) | `false` |
| Ephemeral browsing container | Usually `true` (but data cleared on exit). |

## Performance

- Single read/write/remove cycle; negligible overhead.
- Safe to call on demand (e.g., during initialization).

## Security / Privacy Considerations

- Presence of storage does not imply persistence longevity (privacy modes may still purge).
- Do not treat positive result as permission to store sensitive PII; still encrypt / minimize data.

## Suggested Enhancements

- Add memoization to avoid repeated detection in high-frequency code paths.
- Provide a wrapper returning a fallback key/value interface (null object pattern) when unavailable.

## Related

- <xref:arolariu.Frontend.Utils.dumpBrowserInformation>
- <xref:arolariu.Frontend.Utils.extractBase64FromBlob>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
