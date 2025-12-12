[**@arolariu/components**](../README.md)

***

[@arolariu/components](../README.md) / useWindowSize

# Function: useWindowSize()

> **useWindowSize**(): `HookReturnType`

Defined in: [packages/components/src/hooks/useWindowSize.tsx:35](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/hooks/useWindowSize.tsx#L35)

Client hook to get the window size and whether the window is mobile or desktop.

## Returns

`HookReturnType`

An object containing the window size and whether the window is mobile or desktop.

## Example

```tsx
function MyComponent() {
  const { windowSize, isMobile, isDesktop } = useWindowSize();

  return (
    <div>
      <p>Window Size: {windowSize.width} x {windowSize.height}</p>
      <p>{isMobile ? 'Mobile View' : 'Desktop View'}</p>
    </div>
  );
}
```
