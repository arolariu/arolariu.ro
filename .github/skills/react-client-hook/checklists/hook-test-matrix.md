# Hook Test Matrix

Select only categories affected by the contract.

| Category | Prove |
| --- | --- |
| Initial contract | Defaults, derived values, and commands are correct before an update |
| Command/update | Calling a returned command changes only the promised state |
| Rerender | Changed inputs preserve, reset, or rederive state exactly as documented |
| Derivation | Boundary inputs such as empty collections and clamped ranges produce valid output without synchronization effects |
| Callback identity | Identity stays stable only when consumers rely on it; the callback still reads current data |
| Timer/frame | Work is delayed/coalesced as promised and pending work is canceled or flushed on cleanup |
| Subscription/resource | Registration occurs once per intended dependency set and the exact resource is released |
| Request success/failure | Loading and terminal outcomes are distinguishable |
| Supersession/race | The declared winner commits; stale completions cannot overwrite it |
| Cancellation/unmount | Owned cancellation is quiet and no post-unmount state/side effect occurs |
| Isolation | Two hook instances do not leak refs, timers, or state to each other |

Use `renderHook`, `act`, `rerender`, and `unmount` from Testing Library.
Substitute only true external boundaries. Restore fake timers, globals, spies,
object URLs, animation-frame shims, and subscriptions after each test.
