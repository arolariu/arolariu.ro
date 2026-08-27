# Access-Control Decisions

Use before proposing or implementing auth behavior.

## Enforcement ownership

| Boundary | Owns | Does not prove |
| --- | --- | --- |
| `src/proxy.ts` Clerk matcher | Coarse request authentication for matched routes | Resource ownership or safety of a Server Action |
| Server page/layout | Redirect/render/not-found decision for that request | Authorization of later browser RPC calls |
| Route Handler | Signature/session/input/resource checks for that HTTP endpoint | Safety of another handler/action |
| Server Action | Independent authentication, authorization, input validation, and resource check for its RPC | Safety inferred from the calling component |
| Downstream API | Domain/resource enforcement and defense in depth | Permission to omit website boundary checks |
| Client Component | Presentation after server authorization | Data or mutation protection |

## Policy questions

Before changing code, answer:

1. Which actor categories exist?
2. Is the resource private, public-by-sentinel, shared, owner-only, role-only,
   soft-deleted, or missing?
3. Is this a read, metadata disclosure, or mutation?
4. Which server boundary derives identity?
5. Should inaccessible resources appear forbidden, not found, or redirect?
6. Does the response leak existence, owner, sharing, or personal data?
7. Does every action/handler repeat the required resource check?

## Identity and ownership

- Derive Clerk/session identity on the server.
- Normalize domain identifiers with existing helpers.
- Never authorize from a client-provided `userIdentifier`, role, email, owner,
  or sharing list.
- For public/shared access, verify the persisted resource policy rather than a
  client flag.
- Authentication answers who; authorization answers whether that principal
  may perform this operation on this resource.

## Failure behavior

Preserve the live policy for redirect, 401, 403, 404, or typed action failure.
Changing one to another can reveal resource existence and is a behavior
change. Negative paths must avoid protected downstream reads/mutations where
the policy can reject earlier.

## Telemetry

Record route/action name, coarse authenticated/authorized outcome, and safe
operation/resource-class attributes. Do not record session tokens, JWTs,
webhook secrets, raw claims, email addresses, or sensitive resource payloads.
