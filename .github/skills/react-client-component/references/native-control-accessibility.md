# Native Control Accessibility

Open only for a native interactive control, icon-only name, disabled state, or
loading announcement.

## Native controls and names

- Use `button` for actions and `a`/Next `Link` for navigation. Do not simulate
  either with a clickable `div`.
- Associate visible labels with controls. Use a localized `aria-label` only
  when no visible name exists.
- Icon-only controls need an action-specific accessible name; decorative icons
  are hidden from assistive technology.
- Preserve `type="button"` inside forms unless submission is intended. The
  shared button and tests document this in
  `packages/components/src/components/ui/button.tsx` and
  `packages/components/src/components/ui/button.test.tsx`.

## Disabled and loading states

- Native controls use `disabled` when interaction must be blocked. A composed
  non-native target needs `aria-disabled`, tab behavior, and prevention of
  pointer and keyboard activation; inspect the shared Button behavior and its
  documented enabled-target limitation.
- Loading state must remain named. Use `aria-busy` on the affected region and a
  concise `status` announcement when progress is not otherwise exposed.
- Avoid disabling a control without explaining progress or preserving layout.
- Loading completion must not announce every incidental render.
