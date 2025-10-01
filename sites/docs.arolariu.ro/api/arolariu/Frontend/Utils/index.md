---
uid: arolariu.Frontend.Utils
title: Frontend Utilities
---

# arolariu.Frontend.Utils

Pure / side-effect conscious TypeScript helpers split across client, server, and generic contexts.
They provide formatting, environment inspection, cryptographic token creation (HMAC SHA256), GUID generation, base64 / Blob transformations, and browser capability checks.

| Function | UID | Layer | Purpose |
| -------- | --- | ----- | ------- |
| `generateGuid` | `arolariu.Frontend.Utils.generateGuid` | Generic | RFC 4122 style UUIDv4 string (non-crypto fallback supported). |
| `formatCurrency` | `arolariu.Frontend.Utils.formatCurrency` | Generic | Intl-based number-to-currency formatter. |
| `formatDate` | `arolariu.Frontend.Utils.formatDate` | Generic | Formats string / Date to `MMM DD, YYYY`. |
| `extractBase64FromBlob` | `arolariu.Frontend.Utils.extractBase64FromBlob` | Client | Reads a `Blob` (File) as a Data URL. |
| `isBrowserStorageAvailable` | `arolariu.Frontend.Utils.isBrowserStorageAvailable` | Client | Safely detects Web Storage availability. |
| `dumpBrowserInformation` | `arolariu.Frontend.Utils.dumpBrowserInformation` | Client | JSON snapshot of navigation + screen metrics. |
| `getMimeTypeFromBase64` | `arolariu.Frontend.Utils.getMimeTypeFromBase64` | Server | Extracts MIME from Data URL prefix. |
| `convertBase64ToBlob` | `arolariu.Frontend.Utils.convertBase64ToBlob` | Server | Converts base64 Data URL to `Blob`. |
| `createJwtToken` | `arolariu.Frontend.Utils.createJwtToken` | Server | Manual HMAC SHA256 JWT assembly (no expiration logic). |

## Layer Semantics

- Generic: Works in both browser & Node (no DOM APIs).
- Client: Relies on browser globals (`window`, `navigator`, `FileReader`).
- Server: Uses Node APIs (`crypto`, environment-only features).

## Security & Safety Notes

| Area | Consideration | Recommendation |
| ---- | ------------- | -------------- |
| `createJwtToken` | No claims validation / expiration / audience checks | Prefer a vetted JWT lib for production auth tokens. |
| `generateGuid` | Fallback to `Math.random()` if `crypto.getRandomValues` absent | In cryptographic contexts enforce strong RNG presence. |
| Base64 Functions | Potential large memory footprint with big files | Stream or chunk large binary data if size exceeds limits. |
| Storage Detection | Quota errors vary by browser privacy mode | Re-test availability before critical persistence. |

## Import Examples

```ts
import {
  generateGuid,
  formatCurrency,
  formatDate,
} from "@/lib/utils.generic";

import {
  extractBase64FromBlob,
  isBrowserStorageAvailable,
  dumpBrowserInformation,
} from "@/lib/utils.client";

import {
  createJwtToken,
  convertBase64ToBlob,
  getMimeTypeFromBase64,
} from "@/lib/utils.server";
```

## Function Pages

Individual documentation:
- <xref:arolariu.Frontend.Utils.generateGuid>
- <xref:arolariu.Frontend.Utils.formatCurrency>
- <xref:arolariu.Frontend.Utils.formatDate>
- <xref:arolariu.Frontend.Utils.extractBase64FromBlob>
- <xref:arolariu.Frontend.Utils.isBrowserStorageAvailable>
- <xref:arolariu.Frontend.Utils.dumpBrowserInformation>
- <xref:arolariu.Frontend.Utils.getMimeTypeFromBase64>
- <xref:arolariu.Frontend.Utils.convertBase64ToBlob>
- <xref:arolariu.Frontend.Utils.createJwtToken>

## Example Workflow

```ts
const id = generateGuid();
const priced = formatCurrency(123.45, "USD");
const dateLabel = formatDate("2025-01-01");
```

## Planned Enhancements

- Add timezone-aware date utilities.
- Extend currency formatter with locale parameter override.
- Provide streaming alternative for large base64 conversions.

## Related

- Hooks overview: <xref:arolariu.Frontend.Hooks>
- Actions overview: <xref:arolariu.Frontend.Actions> (coming soon)

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial utilities overview page. | Alexandru-Razvan Olariu |
