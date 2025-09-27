---
uid: arolariu.Frontend.Hooks.useWindowSize
title: useWindowSize
---

# useWindowSize

Client-only hook that tracks the current viewport width & height and exposes convenience booleans for breakpoint logic (`isMobile`, `isDesktop`).

## Signature

```ts
function useWindowSize(): Readonly<{
  windowSize: {
    width: number | null;
    height: number | null;
  };
  isMobile: boolean;
  isDesktop: boolean;
}>;
```

## Returned Object

| Field | Type | Description |
| ----- | ---- | ----------- |
| `windowSize.width` | `number \| null` | Current `window.innerWidth`, or `null` before first effect run (SSR / initial mount). |
| `windowSize.height` | `number \| null` | Current `window.innerHeight`, or `null` before first effect run. |
| `isMobile` | `boolean` | `true` when `width < 768`. |
| `isDesktop` | `boolean` | `true` when `width >= 768`. |

## Behavior Notes

- Uses a single `resize` event listener; removed on unmount.
- Initializes values immediately by invoking the handler once after mounting.
- Breakpoint threshold (`768px`) is inlined; modify at source for broader reuse (or wrap this hook).
- Safe for SSR hydration: initial `null` values avoid width mismatches until client calculation.

## Example

```tsx
function LayoutSwitcher() {
  const { windowSize, isMobile } = useWindowSize();

  if (windowSize.width === null) {
    return <p>Measuring viewport…</p>;
  }

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

## Edge Cases

| Scenario | Handling |
| -------- | -------- |
| SSR / no `window` | State initializes to `{ width: null, height: null }`. |
| Rapid resizes | All updates processed (no debounce); typically acceptable—wrap in throttle if needed. |
| Very narrow iframes | Still treated as “mobile” by simple breakpoint logic. |

## Performance Considerations

- Lightweight: only stores 2 numbers + 2 derived booleans.
- For highly resize-intensive contexts (dragging resizers) you *may* debounce externally.

## Related

- <xref:arolariu.Frontend.Hooks.usePaginationWithSearch>
- <xref:arolariu.Frontend.Hooks.useZustandStore>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
