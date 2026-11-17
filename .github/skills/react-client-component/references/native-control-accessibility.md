# Native Control Accessibility

Open only for a native interactive control, icon-only name, disabled state, or loading announcement.

## Native controls and names

- Use `button` for actions and `a`/Next `Link` for navigation. Do not simulate either with a clickable `div`.
- Associate visible labels with controls. Use a localized `aria-label` only when no visible name exists.
- Icon-only controls need an action-specific accessible name; decorative icons are hidden from assistive technology.
- Preserve `type="button"` inside forms unless submission is intended. The shared button delegates this default to Base UI
  (`packages/components/src/components/ui/button.tsx`); `packages/components/src/components/ui/button.test.tsx` proves that it does not
  submit a form by default and preserves an explicit `type="submit"`.

## Disabled and loading states

- Native controls use `disabled` when interaction must be blocked. A composed non-native target needs `aria-disabled`, tab behavior, and
  prevention of pointer and keyboard activation; inspect the shared Button's Base UI-owned disabled behavior, which
  `packages/components/src/components/ui/button.test.tsx` covers for native and `nativeButton={false}` targets (`focusableWhenDisabled` →
  `aria-disabled` with blocked activation, and removal of disabled targets from the tab order).
- Loading state must remain named. Use `aria-busy` on the affected region and a concise `status` announcement when progress is not otherwise
  exposed.
- Avoid disabling a control without explaining progress or preserving layout.
- Loading completion must not announce every incidental render.
