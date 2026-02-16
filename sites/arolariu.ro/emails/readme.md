# Email Templates

When developing e-mail templates, use pixels (px) instead of rem/em units because most e-mail clients do not support rem/em consistently.

## Email utility wrapper

For email-only utility classes, use the `Tailwind` wrapper from `@react-email/components` inside the JSX/TSX template.

```tsx
import { Tailwind, Text } from '@react-email/components';

<Tailwind>
  <Text className="bg-red-500 text-white p-4">
    This is an email utility class
  </Text>
</Tailwind>
```

## Logo sizes

The small logo should be 96x96 pixels, with transparency.
The large logo should be 384x384 pixels, with transparency.
