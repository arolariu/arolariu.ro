---
uid: arolariu.Frontend.Utils.convertBase64ToBlob
title: convertBase64ToBlob
---

# convertBase64ToBlob

Converts a Base64 **Data URL** string into a `Blob` instance on the server (Node.js / edge runtime).
Relies on an accompanying helper (<xref:arolariu.Frontend.Utils.getMimeTypeFromBase64>) to extract the MIME type.

## Signature

```ts
function convertBase64ToBlob(base64String: string): Promise<Blob>;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `base64String` | `string` | Yes | A Data URL string beginning with `data:<mime>;base64,` followed by Base64 payload. |

## Returns

| Type | Description |
| ---- | ----------- |
| `Promise<Blob>` | Resolves to a `Blob` whose `type` is the extracted MIME value. |

## Processing Steps

1. Extract MIME via `getMimeTypeFromBase64`.
2. Strip the `data:<mime>;base64,` prefix with a regex.
3. Decode the Base64 portion using global `atob`.
4. Map decoded characters to numeric byte values.
5. Create a `Uint8Array` and wrap it in a `Blob` with `{ type: mimeType }`.

## Example

```ts
const pdfDataUrl = "data:application/pdf;base64,JVBERi0x....";
const pdfBlob = await convertBase64ToBlob(pdfDataUrl);
console.log(pdfBlob.type); // "application/pdf"
```

## Pairing With Upload APIs

```ts
async function uploadBase64(dataUrl: string) {
  const blob = await convertBase64ToBlob(dataUrl);
  await fetch("/api/upload", {
    method: "POST",
    body: blob,
    headers: { "Content-Type": blob.type },
  });
}
```

## Edge Cases

| Scenario | Handling |
| -------- | -------- |
| Invalid / missing prefix | MIME resolves to `null`; current implementation still proceeds (cast) — consider validating upstream. |
| Large payload | Entire data held in memory; unsuitable for very large files (use streaming). |
| Non-Base64 input | `atob` throws; wrap call in try/catch when user input is untrusted. |

## Performance Considerations

- O(n) over decoded byte length; memory overhead ~ binary size + Base64 string (Base64 is ~33% larger).
- For multi-MB assets, prefer direct binary uploads rather than Base64 intermediates.

## Security Considerations

| Aspect | Note |
| ------ | ---- |
| MIME trust | Header can be spoofed; do server-side content validation for critical workflows. |
| Resource exhaustion | Reject unexpectedly large strings to prevent memory pressure. |

## Related

- <xref:arolariu.Frontend.Utils.getMimeTypeFromBase64>
- <xref:arolariu.Frontend.Utils.extractBase64FromBlob>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
