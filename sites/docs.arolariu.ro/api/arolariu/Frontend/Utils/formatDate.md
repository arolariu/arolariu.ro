---
uid: arolariu.Frontend.Utils.formatDate
title: formatDate
---

# formatDate

Formats an input date (string or `Date`) into `"MMM DD, YYYY"` using the host runtime locale formatting rules constrained to `en-US` options (`short` month, 2-digit day, 4-digit year).
Returns an empty string when no argument is provided or the value cannot be parsed.

## Signature

```ts
function formatDate(dateString?: string | Date): string;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `dateString` | `string \| Date` | No | ISO-like string or existing `Date` instance. Omitted / invalid inputs return `""`. |

## Returns

| Type | Description |
| ---- | ----------- |
| `string` | Formatted label (e.g. `"Mar 15, 2023"`) or `""` when input absent / invalid. |

## Behavior Notes

- If a string is supplied the function constructs a new `Date` and calls `toLocaleDateString("en-US", { month:"short", day:"2-digit", year:"numeric" })`.
- If a `Date` is supplied it uses it directly (same locale options).
- If argument is `undefined` or not a valid `Date`, returns `""`.
- No timezone coercion beyond native `Date` object interpretation (UTC vs local depends on input string form).

## Examples

```ts
formatDate("2023-03-15");          // "Mar 15, 2023"
formatDate("2023-01-01T00:00:00Z");// "Jan 01, 2023"
formatDate(new Date("2025-09-28"));// "Sep 28, 2025"
formatDate();                      // ""
```

## Edge Cases

| Input | Result |
| ----- | ------ |
| Empty string `""` | `""` (invalid date) |
| Malformed string `"foo"` | `""` |
| Date object with invalid time (`new Date(NaN)`) | `""` |
| Leap day `"2024-02-29"` | `"Feb 29, 2024"` (valid) |

## Internationalization Considerations

Currently hard-coded to `en-US`. If future requirements include i18n:
- Add optional `locale` parameter.
- Provide formatting strategy via dependency injection or wrapper utility.

## Performance

- Very low overhead: single `Date` allocation (when string) and one locale formatting call.
- Safe for list rendering of moderate size; for very large batches consider caching if identical inputs repeat.

## Related

- <xref:arolariu.Frontend.Utils.formatCurrency>
- <xref:arolariu.Frontend.Utils.generateGuid>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
