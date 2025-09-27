---
uid: arolariu.Frontend.Utils.dumpBrowserInformation
title: dumpBrowserInformation
---

# dumpBrowserInformation

Collects high-level runtime & device context (navigation + screen metrics) and returns a serialized JSON string snapshot.

## Signature

```ts
function dumpBrowserInformation(): Readonly<string>;
```

## Returned JSON Shape

```ts
type BrowserInformation = {
  navigationInformation: {
    userAgent: string;
    language: string;
    languages: readonly string[];
    cookieEnabled: boolean;
    doNotTrack: string | null;
    hardwareConcurrency: number;
    maxTouchPoints: number;
  };
  screenInformation: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
};
```

## Behavior Notes

- Delegates to two helper functions:
  - `retrieveNavigatorInformation()`
  - `retrieveScreenInformation()`
- Wraps the combined object with `JSON.stringify` and returns the resulting string (already immutable via `as const` in implementation).
- Only safe in browser environments (depends on `navigator` and `screen` globals).

## Example

```ts
const raw = dumpBrowserInformation();
const info = JSON.parse(raw);
console.log("UA:", info.navigationInformation.userAgent);
```

## Use Cases

| Scenario | Rationale |
| -------- | --------- |
| Debug support tickets | Capture environment details in a single pasteable blob. |
| Analytics enrichment | Append non-PII device metadata to diagnostic events. |
| Conditional UI rendering | Decide on feature flags based on hardware capabilities. |

## Edge Cases

| Situation | Outcome |
| --------- | ------- |
| Running in SSR / Node | Throws (no `navigator`); guard with `typeof window !== "undefined"`. |
| Unavailable hardware fields | Values reflect browser defaults (e.g., `hardwareConcurrency = 0` in rare cases). |
| Privacy / anti-fingerprinting environments | Some fields may be spoofed or reduced (e.g., userAgent freezing). |

## Performance

- Extremely light: simple property reads + one JSON serialization.
- Suitable for on-demand invocation (e.g., user trigger) rather than every render.

## Privacy Considerations

While no direct PII is gathered, aggregated fields can contribute to fingerprinting:
- Avoid sending on every page view by default.
- Consider hashing or truncating userAgent if used in analytics.

## Related

- <xref:arolariu.Frontend.Utils.isBrowserStorageAvailable>
- <xref:arolariu.Frontend.Utils.extractBase64FromBlob>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
