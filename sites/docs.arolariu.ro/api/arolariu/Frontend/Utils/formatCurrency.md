---
uid: arolariu.Frontend.Utils.formatCurrency
title: formatCurrency
---

# formatCurrency

Formats a numeric amount as a localized currency string using the ECMAScript `Intl.NumberFormat` API.
Falls back to USD when no currency argument is supplied.

## Signature

```ts
function formatCurrency(amount: number, currency?: string | Currency): string;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `amount` | `number` | Yes | Numeric value to render. |
| `currency` | `string \| Currency` | No | ISO 4217 code (e.g. `"USD"`, `"EUR"`) or `Currency` object with a `code` property. If omitted defaults to `"USD"`. |

## Returns

| Type | Description |
| ---- | ----------- |
| `string` | Formatted currency representation (locale fixed to `en-US`). |

## Behavior Notes

- Delegates to `new Intl.NumberFormat("en-US", { style: "currency", currency })`.
- When a `Currency` object is passed, its `.code` field drives formatting.
- No rounding beyond `Intl` defaults; fractional digits follow the currency standard.
- Does not attempt locale inference; always uses `en-US` for stable, predictable symbols.

## Examples

```ts
formatCurrency(123.45, "USD"); // "$123.45"
formatCurrency(100, "EUR");    // "€100.00"
formatCurrency(50, "GBP");     // "£50.00"
formatCurrency(75);            // "$75.00" (default USD)
```

Using a `Currency` domain object:

```ts
const ron: Currency = { code: "RON", name: "Romanian Leu" };
formatCurrency(199.99, ron); // "RON 199.99" (symbol / pattern per en-US locale)
```

## Edge Cases

| Input | Output / Behavior |
| ----- | ----------------- |
| `NaN` / non-finite | `Intl.NumberFormat` will render `"NaN"` / `"∞"` style strings; validate upstream if undesired. |
| Very large numbers | Standard grouping applied; consider scientific formatting upstream if needed. |
| Unsupported code | Throws `RangeError`; wrap call in try/catch for user input codes. |

## Performance Considerations

- Each invocation creates a new `Intl.NumberFormat` instance; for hot paths, cache per currency.
- Acceptable for typical UI usage (render lists, totals).

## Suggested Enhancement

Introduce optional locale parameter or global configuration to avoid hard-coded `"en-US"`.

## Related

- <xref:arolariu.Frontend.Utils.formatDate>
- <xref:arolariu.Frontend.Utils.generateGuid>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
