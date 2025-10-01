---
uid: arolariu.Frontend.Utils.extractBase64FromBlob
title: extractBase64FromBlob
---

# extractBase64FromBlob

Reads a `Blob` / `File` object and resolves a Base64 **Data URL** string (e.g. `data:image/png;base64,iVBORw0...`).
Wraps the `FileReader` API in a Promise and auto-removes the event listener after a single invocation.

## Signature

```ts
function extractBase64FromBlob(blob: Blob): Promise<string>;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `blob` | `Blob` | Yes | Binary object (e.g. from file input, drag & drop, canvas export). |

## Returns

| Type | Description |
| ---- | ----------- |
| `Promise<string>` | Resolves to a Data URL string containing MIME metadata + Base64 payload. |

## Behavior Notes

- Uses `FileReader.readAsDataURL`.
- Listener registered with `{ once: true }` ensuring automatic cleanup.
- Reject path not implemented (cannot fail under normal conditions unless the `Blob` becomes inaccessible); design assumes success and resolves.

## Example

```ts
async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  const dataUrl = await extractBase64FromBlob(file);
  console.log("Preview:", dataUrl.slice(0, 64) + "…");
  // <img src={dataUrl} alt="preview" />
}
```

## Extracting Raw Base64 Payload

To remove the leading `data:mime/type;base64,` header:

```ts
const dataUrl = await extractBase64FromBlob(file);
const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
```

## Edge Cases

| Scenario | Outcome |
| -------- | ------- |
| Zero-byte blob | Resolves to header + empty payload. |
| Large file | Entire file buffered in memory; can impact performance. |
| Non-image MIME (e.g. PDF) | Still returns Data URL; consuming code must validate type. |

## Performance Considerations

- Reads entire blob into memory; unsuitable for very large (> tens of MB) files in constrained devices.
- For streaming / chunked uploads consider the Fetch API with `FormData` instead of converting to Base64.

## Security Considerations

| Aspect | Note |
| ------ | ---- |
| User-supplied data | Validate MIME type before embedding in DOM to avoid spoofing (e.g., treat only expected types as displayable). |
| Memory usage | Large blobs can inflate tab memory usage when duplicated as Base64 (~33% size overhead). |

## Related

- <xref:arolariu.Frontend.Utils.convertBase64ToBlob>
- <xref:arolariu.Frontend.Utils.getMimeTypeFromBase64>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
