# Page Troubleshooting

Open this file only after a concrete page failure. Start with the matching
signature; do not apply every remedy.

| Failure signature | Inspect first | Targeted correction |
| --- | --- | --- |
| Typed selector rejects a new key or generated message declarations are stale | `sites/arolariu.ro/messages/en.json`, `sites/arolariu.ro/messages/ro.json`, `sites/arolariu.ro/messages/fr.json`, `sites/arolariu.ro/messages/en.d.json.ts`, and the repository i18n generator | Restore structural parity in source dictionaries, then regenerate the derived declaration. Never edit the declaration by hand. |
| Runtime missing-message error | Exact selector path in the component and each locale dictionary | Correct the source key/shape in every locale; do not catch the error or substitute hardcoded JSX copy. |
| Hydration mismatch mentions text, attributes, or child order | Server component, first client render, `sites/arolariu.ro/src/app/layout.tsx`, `sites/arolariu.ro/src/app/providers.tsx` | Make the initial values deterministic; move storage/browser reads into an effect or hydration-aware island. Do not add broad suppression. |
| Client component imports `server-only`, `next/headers`, server instrumentation, or a server-only helper | Import chain beginning at the nearest `"use client"` file | Move the operation to the Server Component/action and pass a serializable result. |
| `generateMetadata` fails or produces base/incorrect copy | Neighboring page generator, live message selector, `sites/arolariu.ro/src/metadata.ts`, `sites/arolariu.ro/src/metadata.test.ts` | Use `getLocale`, the typed route selector, and `createMetadata`; confirm the selector convention before changing message shape. |
| `error.tsx` is rejected as a Server Component or `reset` does nothing | Segment `error.tsx` and `sites/arolariu.ro/src/app/error.test.tsx` | Add the required client boundary, preserve `{error, reset}`, and test the recovery control. |
| `PageProps` route typing or `params`/`searchParams` build error | Exact route folder and a current dynamic sibling | Derive the literal route type and await semantics from the sibling; do not use a broad cast. |
| A loading boundary causes duplicate landmarks or layout jump | Parent layout landmark, `loading.tsx`, final page geometry | Use a non-landmark wrapper and shape-matched skeletons. |
| Vitest throws for navigation, translations, Clerk, IndexedDB, or server-only imports | `sites/arolariu.ro/vitest.setup.ts`, `sites/arolariu.ro/vitest.config.ts`, and a colocated sibling test | Reuse the existing global shim/stub. Add a per-test double only for a true external boundary; do not mock repository components/actions just to simplify rendering. |
| A server action succeeds but the page receives malformed values | Action `response.json()` boundary and domain transport parser | Keep payload `unknown`, parse it, and map parser failure to the typed action result before rendering. |
| Browser build reports a server module in the client graph | First client file and all transitive imports | Narrow the island, use type-only imports where appropriate, and relocate server ownership. |
| Metadata/message behavior differs only in one locale | Locale cookie/request config and the three corresponding message branches | Compare structure and interpolation arguments; verify the root `lang` value and current locale passed to `createMetadata`. |

If the failure reveals an authentication/public-route change, dependency need,
message-schema migration, or `sites/arolariu.ro/next.config.ts` change, stop and
ask rather than troubleshooting around the boundary.
