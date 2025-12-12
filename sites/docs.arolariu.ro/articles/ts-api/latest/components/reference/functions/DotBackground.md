[**@arolariu/components**](../README.md)

***

[@arolariu/components](../README.md) / DotBackground

# Function: DotBackground()

> **DotBackground**(`__namedParameters`): `Element`

Defined in: [packages/components/src/components/ui/dot-background.tsx:56](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/dot-background.tsx#L56)

DotBackground Component
A React component that creates an animated or static dot pattern background using SVG.
The pattern automatically adjusts to fill its container and can optionally display glowing dots.

## Parameters

### \_\_namedParameters

`DotBackgroundProps`

## Returns

`Element`

## See

DotBackgroundProps for the props interface.

## Example

```ts
// Basic usage
<DotBackground />

// With glowing effect and custom spacing
<DotBackground
  width={20}
  height={20}
  glow={true}
  className="opacity-50"
/>
```
