---
uid: arolariu.Frontend.Utils.createJwtToken
title: createJwtToken
---

# createJwtToken

Constructs a JSON Web Token (JWT) string using HMAC SHA256 (`HS256`) without external libraries.
Performs manual Base64URL encoding of header & payload, then signs with a shared secret.

> [!WARNING]
> This helper omits several production-grade JWT features (expiration validation, claims standardization, signature timing attack mitigation). Use a vetted library (e.g. `jose`, `jsonwebtoken`) for security‑critical tokens.

## Signature

```ts
function createJwtToken(
  header: Readonly<{ alg: string; typ: string }>,
  payload: Readonly<{ [key: string]: any }>,
  secret: Readonly<string>
): Readonly<string>;
```

## Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `header` | `{ alg: string; typ: string }` | Yes | JWT header (should include `alg: "HS256"`, `typ: "JWT"`). |
| `payload` | `{ [key: string]: any }` | Yes | Claims object (custom + registered fields like `sub`, `exp`, etc.). |
| `secret` | `string` | Yes | Shared HMAC secret used for signing. Keep confidential. |

## Returns

| Type | Description |
| ---- | ----------- |
| `string` | JWT string formatted as `<base64url(header)>.<base64url(payload)>.<signature>`. |

## Implementation Notes

- Uses Node `crypto.createHmac("sha256", secret)` to sign the concatenated Base64URL-encoded header & payload.
- Base64URL transform replaces `+` → `-`, `/` → `_`, strips `=` padding (RFC 7515).
- Does not inject or validate standard registered claims (`exp`, `iat`, `nbf`); caller must supply them.
- Returns an immutable string (TypeScript `as const` in implementation).

## Example

```ts
const token = createJwtToken(
  { alg: "HS256", typ: "JWT" },
  {
    sub: "user-123",
    role: "admin",
    iat: Math.floor(Date.now() / 1000),
    // Caller should also add exp, e.g. iat + 3600
  },
  process.env.API_JWT_SECRET!
);

console.log(token);
```

## Adding Expiration / Standard Claims

```ts
const now = Math.floor(Date.now() / 1000);
const token = createJwtToken(
  { alg: "HS256", typ: "JWT" },
  { sub: "user-123", iat: now, exp: now + 3600 },
  secret
);
```

## Verification (Illustrative Only)

To verify (simplified):

```ts
function verify(token: string, secret: string) {
  const [h, p, sig] = token.split(".");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${h}.${p}`)
    .digest("base64")
    .replace(/=+/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
```

> Use constant‑time comparison (`timingSafeEqual`) to reduce timing channel risk.

## Security Considerations

| Concern | Detail | Mitigation |
| ------- | ------ | ---------- |
| Missing expiration | Tokens may remain valid indefinitely. | Always include `exp` & enforce server-side check. |
| Algorithm confusion | Caller might pass unsupported `alg`. | Hard-code or validate `alg === "HS256"`. |
| Weak secret | Short secrets reduce brute-force cost. | Use ≥ 32 random bytes (e.g., base64 string). |
| Claim spoofing | No validation of reserved names. | Sanitize / validate expected claims server-side. |
| Replay | No jti / nonce handling. | Add `jti` and maintain blacklist/whitelist if required. |

## When NOT to Use

- Multi-audience microservice ecosystems (prefer standard libraries with JOSE support).
- Asymmetric signing requirements (`RS256`, `ES256`).
- Regulatory / compliance contexts needing audited crypto primitives.

## Related

- <xref:arolariu.Frontend.Utils.generateGuid> (for `jti` claim seeds)
- <xref:arolariu.Frontend.Utils.getMimeTypeFromBase64> (other server utilities)

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
