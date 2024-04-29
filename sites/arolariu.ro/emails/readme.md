# Email Templates

When developing e-mail templates using TailwindCSS, we need to manually use pixels (px) instead of the TailwindCSS default units (rem, em, etc). This is because most e-mail clients do not support the use of rem, em, etc.

## TailwindCSS

To use TailwindCSS in the e-mail templates, we need to use the `Tailwind` HTML tag in the JSX/TSX file. This will allow us to use the TailwindCSS classes in the e-mail template.

```tsx
import { Tailwind, Text } from '@react-email/components';

<Tailwind>
  <Text className="bg-red-500 text-white p-4">
    This is a TailwindCSS class
  </Text>
</Tailwind>
```

## Logo sizes

The small logo should be 96x96 pixels, with transparency.
The large logo should be 384x384 pixels, with transparency.
