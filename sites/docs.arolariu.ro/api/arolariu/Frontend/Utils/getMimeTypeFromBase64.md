---
uid: arolariu.Frontend.Utils.getMimeTypeFromBase64
title: getMimeTypeFromBase64
---

# getMimeTypeFromBase64

Extracts the MIME type prefix from a Base64 Data URL string (e.g. `data:image/png;base64,AAAA...`) using a named capture group regex.

## Signature

```ts
function getMimeTypeFromBase64(base64String: string): string | null;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `base64String` | `string` | Yes | Data URL string expected to start with `data:<mime>;base64,`. |

## Returns

| Type | Description |
| ---- | ----------- |
| `string \| null` | The extracted MIME type (e.g. `"image/png"`) or `null` if the pattern does not match. |

## Recognition Pattern

Regex used (simplified):
```
^data:(?<mime>[^;]+);base64,
```
- Anchored at start.
- Captures all non-`;` characters following `data:`.
- Ensures `;base64,` sequence is present.

## Examples

```ts
getMimeTypeFromBase64("data:image/png;base64,iVBOR...")        // "image/png"
getMimeTypeFromBase64("data:application/pdf;base64,JVBERi0x") // "application/pdf"
getMimeTypeFromBase64("not-a-data-url")                       // null
```

## Edge Cases

| Input | Result |
| ----- | ------ |
| Missing `data:` prefix | `null` |
| Missing `;base64,` delimiter | `null` |
| Empty MIME section (`data:;base64,`) | `null` |
| Upper / mixed case scheme (e.g. `DATA:`) | `null` (pattern is case-sensitive) |

## Performance

- Single regex test; negligible overhead.
- Safe for repeated invocation in parsing pipelines.

## Security Considerations

Do not trust the returned MIME blindly for security decisions:
- Attackers can spoof MIME in the Data URL header.
- Always validate or sniff actual binary content when critical (e.g., file uploads).

## Related

- <xref:arolariu.Frontend.Utils.convertBase64ToBlob>
- <xref:arolariu.Frontend.Utils.extractBase64FromBlob>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
