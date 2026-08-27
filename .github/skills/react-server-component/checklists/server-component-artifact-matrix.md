# Server Component Artifact Matrix

Use this matrix for a new route or a change spanning at least two artifact
categories. Include only artifacts required by behavior.

| Behavior signal | Required or inspect | Usually unnecessary |
| --- | --- | --- |
| Any route | `page.tsx`, parent `layout.tsx`, route typing, nearest route test | An island by default |
| Hooks, handlers, browser APIs, client context/state | Smallest `island.tsx` or `_components/<name>.tsx` boundary; invoke `react-client-component` | Marking `page.tsx` client |
| Multiple route-owned UI pieces | `_components/` with colocated styles/tests where behavior warrants | Moving domain UI to `sites/arolariu.ro/src/components/` or the library |
| Request-time or initial domain data | Server page/component plus private `server-only` helper, existing domain type, parser/result mapping, test | Browser-callable Server Action by default |
| Client-initiated authenticated mutation | Existing/new Server Action plus `react-server-action` validation/security tests | Raw browser call to a protected backend |
| Whole-segment wait | `loading.tsx` and shape-matched styles/story/test as established nearby | A duplicate fallback at every subtree |
| Independently streamable subtree | Local `Suspense` fallback in the server page | Segment loading file if navigation never waits on the whole segment |
| Recoverable segment exception | Client `error.tsx`, localized copy, safe reporting, reset test | Swallowing failures into an empty state |
| Known absent dynamic resource | `notFound()` branch, `not-found.tsx`, return link and test | Treating all failures as 404 |
| Localized visible/accessibility copy | Invoke `react-internationalization` for dictionaries, selector schema, ICU parity, and generated declarations | Hardcoded fallback strings |
| Route-specific SEO | `generateMetadata`, `createMetadata`, locale and typed message selector; metadata test when helper behavior changes | Rebuilding base Open Graph/Twitter defaults |
| Search/filter/sort is shareable | URL parser/writer hook and URL behavior tests | New Zustand state |
| Global approved client state | Existing store/selectors/hydration handling and store tests; invoke `react-client-store` | A new store without approval |
| Guest/auth behavior | Preserve the live server owner; invoke `react-auth` before changing matcher, redirect, visibility, ownership, or authorization | Client-only authorization |
| Responsive/theme/motion behavior | Colocated module, live tokens/mixins, long-locale and reduced-motion checks | Inline style objects |
| Approved new public route | Existing navigation owner when linked, route metadata/messages, review and update of the static `sites/arolariu.ro/src/app/sitemap.xml` with the public route, navigation/E2E coverage | Unrelated `next.config.ts`, `robots.txt`, manifest, or other configuration changes |

Also inspect:

- `sites/arolariu.ro/src/app/layout.tsx` for the existing `main`, provider, and
  Suspense ownership;
- `sites/arolariu.ro/vitest.setup.ts` before adding test mocks;
- `sites/arolariu.ro/src/metadata.ts` before adding metadata fields;
- all consumers before changing an action/type contract.
