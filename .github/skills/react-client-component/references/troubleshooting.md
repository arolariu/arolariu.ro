# Component Troubleshooting

Load only after the named symptom occurs.

| Symptom | Inspect first | Correction |
| --- | --- | --- |
| “Invalid hook call” or hook used in an async/server component | Component directive, duplicate React imports, caller boundary | Move hooks to the smallest client component; do not turn the whole page client. Confirm imports resolve through the owning workspace. |
| Hydration mismatch | Server output versus first client render, locale/theme/storage/browser reads | Make initial render deterministic and defer browser-only synchronization to an effect or hydration signal. Do not add blanket suppression. |
| “Maximum update depth” / effect loop | Effect dependencies and values set by the effect | Remove state that can be derived during render; stabilize only structurally necessary values; keep external synchronization one-way. |
| Handler reads old props/state | Callback dependencies, timer/subscription lifetime, functional updates | Add the real dependency, use a functional state update, or route reusable lifecycle logic to `react-client-hook`. Do not omit dependencies. |
| Overlay opens but focus escapes/does not return | Shared Dialog/Popover implementation and tests, trigger identity, conditional unmount | Reuse the shared primitive, keep a stable trigger, and test Tab/Escape/close return. Avoid manual focus traps. |
| Pointer works but keyboard does not | Rendered element and composite-widget key handler | Restore native control semantics or implement the complete live widget pattern, including prevention only for handled keys. |
| CSS Module import/class is undefined | Owner's file extension, relative import, exact exported class, build alias | Match a sibling `.module.scss` for website or `.module.css` for the library; derive class access and `cn()` usage from that owner. |
| Style works in one theme/viewport only | Neighboring module tokens, breakpoint/motion mixins, long localized copy | Replace hardcoded visual assumptions with current variables/mixins and verify reflow/theme/reduced motion. |
| Test leaks timers, listeners, portals, or mocks | Effect cleanup, fake timers, `afterEach`, Testing Library unmount | Return cleanup, restore real timers/mocks, close portals/observers, and await user-visible disappearance. |
| `act(...)` warning or flaky async assertion | Unawaited `userEvent`, promise, timer advancement, or state update | Await the interaction/result; use `waitFor` for observable async completion and fake timers only when time is the behavior. |
| Shared component import is undefined | `packages/components/src/index.ts`, package export path, build output | For explicitly requested library work, add the public component/type export and run library validation. Do not modify the barrel for website-local code. |
| Ref is null or points to the wrong node | Consumer need, matching shared primitive's `forwardRef`, composed `render` target | Forward the exact public DOM ref only when the contract requires it and add a focused ref test. |

If the correction requires a dependency, public shared-component API change,
new global state boundary, or materially different interaction semantics, stop
and ask.
