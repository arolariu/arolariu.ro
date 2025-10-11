# Guest Session Management

## Overview

The arolariu.ro platform implements a robust guest session management system that provides unique identifiers for unauthenticated users without forcing account creation.

## Purpose

- **Session Tracking**: Enable proper tracking and analytics for guest users
- **Security**: Prevent issues associated with shared identifiers
- **User Experience**: Allow guests to use the platform without mandatory authentication
- **Data Integrity**: Maintain separate data partitions for different guest sessions

## Implementation

### Guest Identifier Generation

Each guest user receives a unique UUIDv4 identifier that is:

- **Cryptographically Random**: Generated using `crypto.getRandomValues()` when available
- **RFC 4122 Compliant**: Follows UUIDv4 standard format
- **Unique Per Session**: Each new guest session gets a distinct identifier
- **Persistent**: Stored in a secure HTTP-only cookie for 30 days

### Cookie Storage

Guest identifiers are stored in a cookie named `guest_session_id` with the following security settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| `httpOnly` | `true` | Prevents JavaScript access (XSS protection) |
| `secure` | `true` (production) | Ensures transmission only over HTTPS |
| `sameSite` | `lax` | Provides CSRF protection while allowing navigation |
| `maxAge` | `2592000` seconds | 30-day persistence |
| `path` | `/` | Available across entire site |

### JWT Integration

Guest identifiers are included in JWT tokens with the following claims:

```json
{
  "iss": "https://auth.arolariu.ro",
  "aud": "https://api.arolariu.ro",
  "sub": "guest",
  "role": "guest",
  "userIdentifier": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## User Flow

### First Visit (New Guest)

1. User visits the site without authentication
2. System checks for `guest_session_id` cookie
3. No cookie found → Generate new UUIDv4 identifier
4. Store identifier in secure HTTP-only cookie
5. Create JWT token with guest identifier
6. Return user information with unique guest identifier

### Subsequent Visits (Returning Guest)

1. User returns to the site
2. System checks for `guest_session_id` cookie
3. Cookie found → Reuse existing identifier
4. Create JWT token with existing guest identifier
5. Return user information with persistent guest identifier

### Error Handling

If an error occurs during authentication or token generation:

1. System falls back to guest mode
2. Checks for existing `guest_session_id` cookie
3. Generates new identifier only if cookie doesn't exist
4. Ensures every user always has a valid identifier

## Backend Integration

The backend API automatically handles guest identifiers through JWT claims:

- **Extraction**: `userIdentifier` claim is parsed from JWT
- **Storage**: Guest data is associated with the unique identifier
- **Validation**: Backend validates GUIDs but accepts any non-empty UUID
- **Authorization**: Guest role limits available operations

## Security Considerations

### Protection Mechanisms

- **XSS Protection**: HTTP-only cookies prevent client-side script access
- **CSRF Protection**: SameSite=lax prevents cross-site request forgery
- **Transport Security**: Secure flag ensures HTTPS-only transmission in production
- **No Client Exposure**: Identifier not accessible via JavaScript `document.cookie`

### Privacy Considerations

- Guest identifiers do not contain personally identifiable information
- Identifiers are randomly generated and not linked to IP addresses or device fingerprints
- 30-day expiration provides reasonable session persistence without indefinite tracking
- Users can clear cookies to obtain a new identifier at any time

## Migration from Hardcoded UUID

**Previous Implementation:**
- All guest users shared the identifier `00000000-0000-0000-0000-000000000000`
- No session tracking possible
- Security concerns with shared identifiers
- No data partitioning for guests

**Current Implementation:**
- Each guest receives a unique UUIDv4 identifier
- Full session tracking and analytics capabilities
- Proper data isolation between guest sessions
- Maintains compatibility with backend expecting GUID format

## Testing

Comprehensive test coverage ensures:

- ✅ Unique identifiers generated for each guest session
- ✅ Identifiers conform to UUIDv4 format
- ✅ Cookie security settings properly configured
- ✅ Identifier persistence across requests
- ✅ No hardcoded zero UUID usage
- ✅ Error handling maintains unique identifiers

## Related Files

- `/sites/arolariu.ro/src/app/api/user/route.ts` - Main implementation
- `/sites/arolariu.ro/src/lib/actions/cookies/cookies.action.ts` - Cookie utilities
- `/sites/arolariu.ro/src/lib/utils.generic.ts` - UUID generation
- `/sites/arolariu.ro/src/app/api/user/route.test.ts` - Test suite

## References

- [RFC 4122: A Universally Unique IDentifier (UUID) URN Namespace](https://www.rfc-editor.org/rfc/rfc4122)
- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
