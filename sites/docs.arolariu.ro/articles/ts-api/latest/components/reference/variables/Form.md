[**@arolariu/components**](../README.md)

***

[@arolariu/components](../README.md) / Form

# Variable: Form()

> `const` **Form**: \<`TFieldValues`, `TContext`, `TTransformedValues`\>(`props`) => `Element` = `FormProvider`

Defined in: [packages/components/src/components/ui/form.tsx:11](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/form.tsx#L11)

A provider component that propagates the `useForm` methods to all children components via [React Context](https://react.dev/reference/react/useContext) API. To be used with useFormContext.

## Type Parameters

### TFieldValues

`TFieldValues` *extends* `FieldValues`

### TContext

`TContext` = `any`

### TTransformedValues

`TTransformedValues` = `TFieldValues`

## Parameters

### props

`FormProviderProps`\<`TFieldValues`, `TContext`, `TTransformedValues`\>

all useForm methods

## Returns

`Element`

## Remarks

[API](https://react-hook-form.com/docs/useformcontext) • [Demo](https://codesandbox.io/s/react-hook-form-v7-form-context-ytudi)

## Example

```tsx
function App() {
  const methods = useForm();
  const onSubmit = data => console.log(data);

  return (
    <FormProvider {...methods} >
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <NestedInput />
        <input type="submit" />
      </form>
    </FormProvider>
  );
}

 function NestedInput() {
  const { register } = useFormContext(); // retrieve all hook methods
  return <input {...register("test")} />;
}
```
