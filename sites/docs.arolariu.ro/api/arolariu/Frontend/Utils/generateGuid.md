---
uid: arolariu.Frontend.Utils.generateGuid
title: generateGuid
---

# generateGuid

Generates an RFC 4122 style version 4 UUID string (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx).
Prefers cryptographically strong randomness (`crypto.getRandomValues`) when available; otherwise falls back to `Math.random()` (not suitable for security).

## Signature

```ts
function generateGuid(arraybuffer?: ArrayBuffer): Readonly<string>;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `arraybuffer` | `ArrayBuffer` | No | Optional 16‑byte buffer to use directly (mutated in-place for version / variant bits). If omitted a new 16-byte buffer is created & filled with random values. |

## Returns

| Type | Description |
| ---- | ----------- |
| `string` | UUIDv4-like identifier (lowercase hex with hyphens). |

## Behavior Details

1. When an `ArrayBuffer` is supplied:
   - Interprets it as a `Uint8Array`.
   - Sets version nibble (`byte[6] = 0b0100xxxx`) and variant bits (`byte[8] = 10xxxxxx`).
   - Serializes bytes to hex and inserts hyphens.

2. When no buffer is supplied:
   - Allocates 16 bytes.
   - Fills using `crypto.getRandomValues` if present; otherwise uses `Math.random()` fallback.
   - Applies the same version / variant adjustments.
   - Serializes to canonical form.

## Example

```ts
const id = generateGuid();
// b23090df-9e68-4c12-ae2a-5368db13b6c1

// Supplying a predefined buffer (e.g., for reproducible tests)
const buf = new ArrayBuffer(16);
const deterministic = generateGuid(buf);
```

## Performance & Memory

- Constant allocation size (16 bytes + string building).
- Suitable for generating IDs in lists, optimistic UI keys, etc.
- Avoid use in cryptographic / security tokens when fallback path (`Math.random`) possible.

## Security Considerations

| Aspect | Note |
| ------ | ---- |
| Entropy | High only when `crypto.getRandomValues` available. |
| Predictability | Fallback may be guessable; do not use for secure session identifiers. |
| Collisions | Extremely unlikely under strong RNG; probability increases under weak RNG but still adequate for casual identifiers. |

## Related

- <xref:arolariu.Frontend.Utils.formatCurrency>
- <xref:arolariu.Frontend.Utils.createJwtToken>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
