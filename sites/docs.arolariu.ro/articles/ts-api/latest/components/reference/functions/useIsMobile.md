[**@arolariu/components**](../README.md)

***

[@arolariu/components](../README.md) / useIsMobile

# Function: useIsMobile()

> **useIsMobile**(): `boolean`

Defined in: [packages/components/src/hooks/useIsMobile.tsx:26](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/hooks/useIsMobile.tsx#L26)

A custom React hook that detects whether the current device is a mobile device
based on the screen width.
This hook uses a media query to check if the viewport width is less than the defined
mobile breakpoint (768px). It updates the state when the window size changes.

## Returns

`boolean`

Returns true if the viewport width is less than the mobile breakpoint,
false otherwise.

## Example

```tsx
function MyComponent() {
  const isMobile = useIsMobile();

  return (
    <div>
      {isMobile ? 'Mobile View' : 'Desktop View'}
    </div>
  );
}
```
