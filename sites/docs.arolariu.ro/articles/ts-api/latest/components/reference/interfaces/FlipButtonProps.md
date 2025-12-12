[**@arolariu/components**](../README.md)

***

[@arolariu/components](../README.md) / FlipButtonProps

# Interface: FlipButtonProps

Defined in: [packages/components/src/components/ui/flip-button.tsx:10](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/flip-button.tsx#L10)

## Extends

- `HTMLMotionProps`\<`"button"`\>

## Properties

### frontText

> **frontText**: `string`

Defined in: [packages/components/src/components/ui/flip-button.tsx:11](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/flip-button.tsx#L11)

***

### backText

> **backText**: `string`

Defined in: [packages/components/src/components/ui/flip-button.tsx:12](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/flip-button.tsx#L12)

***

### transition?

> `optional` **transition**: `Transition`

Defined in: [packages/components/src/components/ui/flip-button.tsx:13](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/flip-button.tsx#L13)

Default transition. If no `transition` is defined in `animate`, it will use the transition defined here.
```jsx
const spring = {
  type: "spring",
  damping: 10,
  stiffness: 100
}

<motion.div transition={spring} animate={{ scale: 1.2 }} />
```

#### Overrides

`HTMLMotionProps.transition`

***

### frontClassName?

> `optional` **frontClassName**: `string`

Defined in: [packages/components/src/components/ui/flip-button.tsx:14](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/flip-button.tsx#L14)

***

### backClassName?

> `optional` **backClassName**: `string`

Defined in: [packages/components/src/components/ui/flip-button.tsx:15](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/flip-button.tsx#L15)

***

### from?

> `optional` **from**: [`FlipDirection`](../type-aliases/FlipDirection.md)

Defined in: [packages/components/src/components/ui/flip-button.tsx:16](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/flip-button.tsx#L16)

***

### form?

> `optional` **form**: `string`

#### Inherited from

`HTMLMotionProps.form`

***

### slot?

> `optional` **slot**: `string`

#### Inherited from

`HTMLMotionProps.slot`

***

### title?

> `optional` **title**: `string`

#### Inherited from

`HTMLMotionProps.title`

***

### ref?

> `optional` **ref**: `Ref`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.ref`

***

### key?

> `optional` **key**: `Key`

#### Inherited from

`HTMLMotionProps.key`

***

### defaultChecked?

> `optional` **defaultChecked**: `boolean`

#### Inherited from

`HTMLMotionProps.defaultChecked`

***

### defaultValue?

> `optional` **defaultValue**: `string` \| `number` \| readonly `string`[]

#### Inherited from

`HTMLMotionProps.defaultValue`

***

### suppressContentEditableWarning?

> `optional` **suppressContentEditableWarning**: `boolean`

#### Inherited from

`HTMLMotionProps.suppressContentEditableWarning`

***

### suppressHydrationWarning?

> `optional` **suppressHydrationWarning**: `boolean`

#### Inherited from

`HTMLMotionProps.suppressHydrationWarning`

***

### accessKey?

> `optional` **accessKey**: `string`

#### Inherited from

`HTMLMotionProps.accessKey`

***

### autoCapitalize?

> `optional` **autoCapitalize**: `"off"` \| `"none"` \| `"on"` \| `"sentences"` \| `"words"` \| `"characters"` \| `string` & `object`

#### Inherited from

`HTMLMotionProps.autoCapitalize`

***

### autoFocus?

> `optional` **autoFocus**: `boolean`

#### Inherited from

`HTMLMotionProps.autoFocus`

***

### className?

> `optional` **className**: `string`

#### Inherited from

`HTMLMotionProps.className`

***

### contentEditable?

> `optional` **contentEditable**: `Booleanish` \| `"inherit"` \| `"plaintext-only"`

#### Inherited from

`HTMLMotionProps.contentEditable`

***

### contextMenu?

> `optional` **contextMenu**: `string`

#### Inherited from

`HTMLMotionProps.contextMenu`

***

### dir?

> `optional` **dir**: `string`

#### Inherited from

`HTMLMotionProps.dir`

***

### draggable?

> `optional` **draggable**: `Booleanish`

#### Inherited from

`HTMLMotionProps.draggable`

***

### enterKeyHint?

> `optional` **enterKeyHint**: `"search"` \| `"enter"` \| `"done"` \| `"go"` \| `"next"` \| `"previous"` \| `"send"`

#### Inherited from

`HTMLMotionProps.enterKeyHint`

***

### hidden?

> `optional` **hidden**: `boolean`

#### Inherited from

`HTMLMotionProps.hidden`

***

### id?

> `optional` **id**: `string`

#### Inherited from

`HTMLMotionProps.id`

***

### lang?

> `optional` **lang**: `string`

#### Inherited from

`HTMLMotionProps.lang`

***

### nonce?

> `optional` **nonce**: `string`

#### Inherited from

`HTMLMotionProps.nonce`

***

### spellCheck?

> `optional` **spellCheck**: `Booleanish`

#### Inherited from

`HTMLMotionProps.spellCheck`

***

### tabIndex?

> `optional` **tabIndex**: `number`

#### Inherited from

`HTMLMotionProps.tabIndex`

***

### translate?

> `optional` **translate**: `"yes"` \| `"no"`

#### Inherited from

`HTMLMotionProps.translate`

***

### radioGroup?

> `optional` **radioGroup**: `string`

#### Inherited from

`HTMLMotionProps.radioGroup`

***

### role?

> `optional` **role**: `AriaRole`

#### Inherited from

`HTMLMotionProps.role`

***

### about?

> `optional` **about**: `string`

#### Inherited from

`HTMLMotionProps.about`

***

### content?

> `optional` **content**: `string`

#### Inherited from

`HTMLMotionProps.content`

***

### datatype?

> `optional` **datatype**: `string`

#### Inherited from

`HTMLMotionProps.datatype`

***

### inlist?

> `optional` **inlist**: `any`

#### Inherited from

`HTMLMotionProps.inlist`

***

### prefix?

> `optional` **prefix**: `string`

#### Inherited from

`HTMLMotionProps.prefix`

***

### property?

> `optional` **property**: `string`

#### Inherited from

`HTMLMotionProps.property`

***

### rel?

> `optional` **rel**: `string`

#### Inherited from

`HTMLMotionProps.rel`

***

### resource?

> `optional` **resource**: `string`

#### Inherited from

`HTMLMotionProps.resource`

***

### rev?

> `optional` **rev**: `string`

#### Inherited from

`HTMLMotionProps.rev`

***

### typeof?

> `optional` **typeof**: `string`

#### Inherited from

`HTMLMotionProps.typeof`

***

### vocab?

> `optional` **vocab**: `string`

#### Inherited from

`HTMLMotionProps.vocab`

***

### autoCorrect?

> `optional` **autoCorrect**: `string`

#### Inherited from

`HTMLMotionProps.autoCorrect`

***

### autoSave?

> `optional` **autoSave**: `string`

#### Inherited from

`HTMLMotionProps.autoSave`

***

### color?

> `optional` **color**: `string`

#### Inherited from

`HTMLMotionProps.color`

***

### itemProp?

> `optional` **itemProp**: `string`

#### Inherited from

`HTMLMotionProps.itemProp`

***

### itemScope?

> `optional` **itemScope**: `boolean`

#### Inherited from

`HTMLMotionProps.itemScope`

***

### itemType?

> `optional` **itemType**: `string`

#### Inherited from

`HTMLMotionProps.itemType`

***

### itemID?

> `optional` **itemID**: `string`

#### Inherited from

`HTMLMotionProps.itemID`

***

### itemRef?

> `optional` **itemRef**: `string`

#### Inherited from

`HTMLMotionProps.itemRef`

***

### results?

> `optional` **results**: `number`

#### Inherited from

`HTMLMotionProps.results`

***

### security?

> `optional` **security**: `string`

#### Inherited from

`HTMLMotionProps.security`

***

### unselectable?

> `optional` **unselectable**: `"off"` \| `"on"`

#### Inherited from

`HTMLMotionProps.unselectable`

***

### popover?

> `optional` **popover**: `""` \| `"auto"` \| `"manual"` \| `"hint"`

#### Inherited from

`HTMLMotionProps.popover`

***

### popoverTargetAction?

> `optional` **popoverTargetAction**: `"toggle"` \| `"show"` \| `"hide"`

#### Inherited from

`HTMLMotionProps.popoverTargetAction`

***

### popoverTarget?

> `optional` **popoverTarget**: `string`

#### Inherited from

`HTMLMotionProps.popoverTarget`

***

### inert?

> `optional` **inert**: `boolean`

#### Inherited from

`HTMLMotionProps.inert`

***

### inputMode?

> `optional` **inputMode**: `"search"` \| `"text"` \| `"none"` \| `"tel"` \| `"url"` \| `"email"` \| `"numeric"` \| `"decimal"`

#### Inherited from

`HTMLMotionProps.inputMode`

***

### is?

> `optional` **is**: `string`

#### Inherited from

`HTMLMotionProps.is`

***

### exportparts?

> `optional` **exportparts**: `string`

#### Inherited from

`HTMLMotionProps.exportparts`

***

### part?

> `optional` **part**: `string`

#### Inherited from

`HTMLMotionProps.part`

***

### aria-activedescendant?

> `optional` **aria-activedescendant**: `string`

#### Inherited from

`HTMLMotionProps.aria-activedescendant`

***

### aria-atomic?

> `optional` **aria-atomic**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-atomic`

***

### aria-autocomplete?

> `optional` **aria-autocomplete**: `"none"` \| `"list"` \| `"inline"` \| `"both"`

#### Inherited from

`HTMLMotionProps.aria-autocomplete`

***

### aria-braillelabel?

> `optional` **aria-braillelabel**: `string`

#### Inherited from

`HTMLMotionProps.aria-braillelabel`

***

### aria-brailleroledescription?

> `optional` **aria-brailleroledescription**: `string`

#### Inherited from

`HTMLMotionProps.aria-brailleroledescription`

***

### aria-busy?

> `optional` **aria-busy**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-busy`

***

### aria-checked?

> `optional` **aria-checked**: `boolean` \| `"true"` \| `"false"` \| `"mixed"`

#### Inherited from

`HTMLMotionProps.aria-checked`

***

### aria-colcount?

> `optional` **aria-colcount**: `number`

#### Inherited from

`HTMLMotionProps.aria-colcount`

***

### aria-colindex?

> `optional` **aria-colindex**: `number`

#### Inherited from

`HTMLMotionProps.aria-colindex`

***

### aria-colindextext?

> `optional` **aria-colindextext**: `string`

#### Inherited from

`HTMLMotionProps.aria-colindextext`

***

### aria-colspan?

> `optional` **aria-colspan**: `number`

#### Inherited from

`HTMLMotionProps.aria-colspan`

***

### aria-controls?

> `optional` **aria-controls**: `string`

#### Inherited from

`HTMLMotionProps.aria-controls`

***

### aria-current?

> `optional` **aria-current**: `boolean` \| `"time"` \| `"true"` \| `"false"` \| `"page"` \| `"step"` \| `"location"` \| `"date"`

#### Inherited from

`HTMLMotionProps.aria-current`

***

### aria-describedby?

> `optional` **aria-describedby**: `string`

#### Inherited from

`HTMLMotionProps.aria-describedby`

***

### aria-description?

> `optional` **aria-description**: `string`

#### Inherited from

`HTMLMotionProps.aria-description`

***

### aria-details?

> `optional` **aria-details**: `string`

#### Inherited from

`HTMLMotionProps.aria-details`

***

### aria-disabled?

> `optional` **aria-disabled**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-disabled`

***

### aria-dropeffect?

> `optional` **aria-dropeffect**: `"link"` \| `"none"` \| `"copy"` \| `"execute"` \| `"move"` \| `"popup"`

#### Inherited from

`HTMLMotionProps.aria-dropeffect`

***

### aria-errormessage?

> `optional` **aria-errormessage**: `string`

#### Inherited from

`HTMLMotionProps.aria-errormessage`

***

### aria-expanded?

> `optional` **aria-expanded**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-expanded`

***

### aria-flowto?

> `optional` **aria-flowto**: `string`

#### Inherited from

`HTMLMotionProps.aria-flowto`

***

### aria-grabbed?

> `optional` **aria-grabbed**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-grabbed`

***

### aria-haspopup?

> `optional` **aria-haspopup**: `boolean` \| `"dialog"` \| `"menu"` \| `"true"` \| `"false"` \| `"grid"` \| `"listbox"` \| `"tree"`

#### Inherited from

`HTMLMotionProps.aria-haspopup`

***

### aria-hidden?

> `optional` **aria-hidden**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-hidden`

***

### aria-invalid?

> `optional` **aria-invalid**: `boolean` \| `"true"` \| `"false"` \| `"grammar"` \| `"spelling"`

#### Inherited from

`HTMLMotionProps.aria-invalid`

***

### aria-keyshortcuts?

> `optional` **aria-keyshortcuts**: `string`

#### Inherited from

`HTMLMotionProps.aria-keyshortcuts`

***

### aria-label?

> `optional` **aria-label**: `string`

#### Inherited from

`HTMLMotionProps.aria-label`

***

### aria-labelledby?

> `optional` **aria-labelledby**: `string`

#### Inherited from

`HTMLMotionProps.aria-labelledby`

***

### aria-level?

> `optional` **aria-level**: `number`

#### Inherited from

`HTMLMotionProps.aria-level`

***

### aria-live?

> `optional` **aria-live**: `"off"` \| `"assertive"` \| `"polite"`

#### Inherited from

`HTMLMotionProps.aria-live`

***

### aria-modal?

> `optional` **aria-modal**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-modal`

***

### aria-multiline?

> `optional` **aria-multiline**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-multiline`

***

### aria-multiselectable?

> `optional` **aria-multiselectable**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-multiselectable`

***

### aria-orientation?

> `optional` **aria-orientation**: `"horizontal"` \| `"vertical"`

#### Inherited from

`HTMLMotionProps.aria-orientation`

***

### aria-owns?

> `optional` **aria-owns**: `string`

#### Inherited from

`HTMLMotionProps.aria-owns`

***

### aria-placeholder?

> `optional` **aria-placeholder**: `string`

#### Inherited from

`HTMLMotionProps.aria-placeholder`

***

### aria-posinset?

> `optional` **aria-posinset**: `number`

#### Inherited from

`HTMLMotionProps.aria-posinset`

***

### aria-pressed?

> `optional` **aria-pressed**: `boolean` \| `"true"` \| `"false"` \| `"mixed"`

#### Inherited from

`HTMLMotionProps.aria-pressed`

***

### aria-readonly?

> `optional` **aria-readonly**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-readonly`

***

### aria-relevant?

> `optional` **aria-relevant**: `"text"` \| `"additions"` \| `"additions removals"` \| `"additions text"` \| `"all"` \| `"removals"` \| `"removals additions"` \| `"removals text"` \| `"text additions"` \| `"text removals"`

#### Inherited from

`HTMLMotionProps.aria-relevant`

***

### aria-required?

> `optional` **aria-required**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-required`

***

### aria-roledescription?

> `optional` **aria-roledescription**: `string`

#### Inherited from

`HTMLMotionProps.aria-roledescription`

***

### aria-rowcount?

> `optional` **aria-rowcount**: `number`

#### Inherited from

`HTMLMotionProps.aria-rowcount`

***

### aria-rowindex?

> `optional` **aria-rowindex**: `number`

#### Inherited from

`HTMLMotionProps.aria-rowindex`

***

### aria-rowindextext?

> `optional` **aria-rowindextext**: `string`

#### Inherited from

`HTMLMotionProps.aria-rowindextext`

***

### aria-rowspan?

> `optional` **aria-rowspan**: `number`

#### Inherited from

`HTMLMotionProps.aria-rowspan`

***

### aria-selected?

> `optional` **aria-selected**: `Booleanish`

#### Inherited from

`HTMLMotionProps.aria-selected`

***

### aria-setsize?

> `optional` **aria-setsize**: `number`

#### Inherited from

`HTMLMotionProps.aria-setsize`

***

### aria-sort?

> `optional` **aria-sort**: `"none"` \| `"ascending"` \| `"descending"` \| `"other"`

#### Inherited from

`HTMLMotionProps.aria-sort`

***

### aria-valuemax?

> `optional` **aria-valuemax**: `number`

#### Inherited from

`HTMLMotionProps.aria-valuemax`

***

### aria-valuemin?

> `optional` **aria-valuemin**: `number`

#### Inherited from

`HTMLMotionProps.aria-valuemin`

***

### aria-valuenow?

> `optional` **aria-valuenow**: `number`

#### Inherited from

`HTMLMotionProps.aria-valuenow`

***

### aria-valuetext?

> `optional` **aria-valuetext**: `string`

#### Inherited from

`HTMLMotionProps.aria-valuetext`

***

### dangerouslySetInnerHTML?

> `optional` **dangerouslySetInnerHTML**: `object`

#### Inherited from

`HTMLMotionProps.dangerouslySetInnerHTML`

***

### onCopy?

> `optional` **onCopy**: `ClipboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCopy`

***

### onCopyCapture?

> `optional` **onCopyCapture**: `ClipboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCopyCapture`

***

### onCut?

> `optional` **onCut**: `ClipboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCut`

***

### onCutCapture?

> `optional` **onCutCapture**: `ClipboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCutCapture`

***

### onPaste?

> `optional` **onPaste**: `ClipboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPaste`

***

### onPasteCapture?

> `optional` **onPasteCapture**: `ClipboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPasteCapture`

***

### onCompositionEnd?

> `optional` **onCompositionEnd**: `CompositionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionEnd`

***

### onCompositionEndCapture?

> `optional` **onCompositionEndCapture**: `CompositionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionEndCapture`

***

### onCompositionStart?

> `optional` **onCompositionStart**: `CompositionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionStart`

***

### onCompositionStartCapture?

> `optional` **onCompositionStartCapture**: `CompositionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionStartCapture`

***

### onCompositionUpdate?

> `optional` **onCompositionUpdate**: `CompositionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionUpdate`

***

### onCompositionUpdateCapture?

> `optional` **onCompositionUpdateCapture**: `CompositionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionUpdateCapture`

***

### onFocus?

> `optional` **onFocus**: `FocusEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onFocus`

***

### onFocusCapture?

> `optional` **onFocusCapture**: `FocusEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onFocusCapture`

***

### onBlur?

> `optional` **onBlur**: `FocusEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onBlur`

***

### onBlurCapture?

> `optional` **onBlurCapture**: `FocusEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onBlurCapture`

***

### onChange?

> `optional` **onChange**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onChange`

***

### onChangeCapture?

> `optional` **onChangeCapture**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onChangeCapture`

***

### onBeforeInput?

> `optional` **onBeforeInput**: `InputEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeInput`

***

### onBeforeInputCapture?

> `optional` **onBeforeInputCapture**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeInputCapture`

***

### onInput?

> `optional` **onInput**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onInput`

***

### onInputCapture?

> `optional` **onInputCapture**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onInputCapture`

***

### onReset?

> `optional` **onReset**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onReset`

***

### onResetCapture?

> `optional` **onResetCapture**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onResetCapture`

***

### onSubmit?

> `optional` **onSubmit**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSubmit`

***

### onSubmitCapture?

> `optional` **onSubmitCapture**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSubmitCapture`

***

### onInvalid?

> `optional` **onInvalid**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onInvalid`

***

### onInvalidCapture?

> `optional` **onInvalidCapture**: `FormEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onInvalidCapture`

***

### onLoad?

> `optional` **onLoad**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLoad`

***

### onLoadCapture?

> `optional` **onLoadCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLoadCapture`

***

### onError?

> `optional` **onError**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onError`

***

### onErrorCapture?

> `optional` **onErrorCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onErrorCapture`

***

### onKeyDown?

> `optional` **onKeyDown**: `KeyboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onKeyDown`

***

### onKeyDownCapture?

> `optional` **onKeyDownCapture**: `KeyboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onKeyDownCapture`

***

### onKeyPress?

> `optional` **onKeyPress**: `KeyboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onKeyPress`

***

### onKeyPressCapture?

> `optional` **onKeyPressCapture**: `KeyboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onKeyPressCapture`

***

### onKeyUp?

> `optional` **onKeyUp**: `KeyboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onKeyUp`

***

### onKeyUpCapture?

> `optional` **onKeyUpCapture**: `KeyboardEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onKeyUpCapture`

***

### onAbort?

> `optional` **onAbort**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAbort`

***

### onAbortCapture?

> `optional` **onAbortCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAbortCapture`

***

### onCanPlay?

> `optional` **onCanPlay**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlay`

***

### onCanPlayCapture?

> `optional` **onCanPlayCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayCapture`

***

### onCanPlayThrough?

> `optional` **onCanPlayThrough**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayThrough`

***

### onCanPlayThroughCapture?

> `optional` **onCanPlayThroughCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayThroughCapture`

***

### onDurationChange?

> `optional` **onDurationChange**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDurationChange`

***

### onDurationChangeCapture?

> `optional` **onDurationChangeCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDurationChangeCapture`

***

### onEmptied?

> `optional` **onEmptied**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onEmptied`

***

### onEmptiedCapture?

> `optional` **onEmptiedCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onEmptiedCapture`

***

### onEncrypted?

> `optional` **onEncrypted**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onEncrypted`

***

### onEncryptedCapture?

> `optional` **onEncryptedCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onEncryptedCapture`

***

### onEnded?

> `optional` **onEnded**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onEnded`

***

### onEndedCapture?

> `optional` **onEndedCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onEndedCapture`

***

### onLoadedData?

> `optional` **onLoadedData**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedData`

***

### onLoadedDataCapture?

> `optional` **onLoadedDataCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedDataCapture`

***

### onLoadedMetadata?

> `optional` **onLoadedMetadata**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedMetadata`

***

### onLoadedMetadataCapture?

> `optional` **onLoadedMetadataCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedMetadataCapture`

***

### onLoadStart?

> `optional` **onLoadStart**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLoadStart`

***

### onLoadStartCapture?

> `optional` **onLoadStartCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLoadStartCapture`

***

### onPause?

> `optional` **onPause**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPause`

***

### onPauseCapture?

> `optional` **onPauseCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPauseCapture`

***

### onPlay?

> `optional` **onPlay**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPlay`

***

### onPlayCapture?

> `optional` **onPlayCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPlayCapture`

***

### onPlaying?

> `optional` **onPlaying**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPlaying`

***

### onPlayingCapture?

> `optional` **onPlayingCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPlayingCapture`

***

### onProgress?

> `optional` **onProgress**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onProgress`

***

### onProgressCapture?

> `optional` **onProgressCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onProgressCapture`

***

### onRateChange?

> `optional` **onRateChange**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onRateChange`

***

### onRateChangeCapture?

> `optional` **onRateChangeCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onRateChangeCapture`

***

### onSeeked?

> `optional` **onSeeked**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSeeked`

***

### onSeekedCapture?

> `optional` **onSeekedCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSeekedCapture`

***

### onSeeking?

> `optional` **onSeeking**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSeeking`

***

### onSeekingCapture?

> `optional` **onSeekingCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSeekingCapture`

***

### onStalled?

> `optional` **onStalled**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onStalled`

***

### onStalledCapture?

> `optional` **onStalledCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onStalledCapture`

***

### onSuspend?

> `optional` **onSuspend**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSuspend`

***

### onSuspendCapture?

> `optional` **onSuspendCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSuspendCapture`

***

### onTimeUpdate?

> `optional` **onTimeUpdate**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTimeUpdate`

***

### onTimeUpdateCapture?

> `optional` **onTimeUpdateCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTimeUpdateCapture`

***

### onVolumeChange?

> `optional` **onVolumeChange**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onVolumeChange`

***

### onVolumeChangeCapture?

> `optional` **onVolumeChangeCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onVolumeChangeCapture`

***

### onWaiting?

> `optional` **onWaiting**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onWaiting`

***

### onWaitingCapture?

> `optional` **onWaitingCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onWaitingCapture`

***

### onAuxClick?

> `optional` **onAuxClick**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAuxClick`

***

### onAuxClickCapture?

> `optional` **onAuxClickCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAuxClickCapture`

***

### onClick?

> `optional` **onClick**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onClick`

***

### onClickCapture?

> `optional` **onClickCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onClickCapture`

***

### onContextMenu?

> `optional` **onContextMenu**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onContextMenu`

***

### onContextMenuCapture?

> `optional` **onContextMenuCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onContextMenuCapture`

***

### onDoubleClick?

> `optional` **onDoubleClick**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDoubleClick`

***

### onDoubleClickCapture?

> `optional` **onDoubleClickCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDoubleClickCapture`

***

### onDragCapture?

> `optional` **onDragCapture**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragCapture`

***

### onDragEndCapture?

> `optional` **onDragEndCapture**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragEndCapture`

***

### onDragEnter?

> `optional` **onDragEnter**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragEnter`

***

### onDragEnterCapture?

> `optional` **onDragEnterCapture**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragEnterCapture`

***

### onDragExit?

> `optional` **onDragExit**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragExit`

***

### onDragExitCapture?

> `optional` **onDragExitCapture**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragExitCapture`

***

### onDragLeave?

> `optional` **onDragLeave**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragLeave`

***

### onDragLeaveCapture?

> `optional` **onDragLeaveCapture**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragLeaveCapture`

***

### onDragOver?

> `optional` **onDragOver**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragOver`

***

### onDragOverCapture?

> `optional` **onDragOverCapture**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragOverCapture`

***

### onDragStartCapture?

> `optional` **onDragStartCapture**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDragStartCapture`

***

### onDrop?

> `optional` **onDrop**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDrop`

***

### onDropCapture?

> `optional` **onDropCapture**: `DragEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onDropCapture`

***

### onMouseDown?

> `optional` **onMouseDown**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseDown`

***

### onMouseDownCapture?

> `optional` **onMouseDownCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseDownCapture`

***

### onMouseEnter?

> `optional` **onMouseEnter**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseEnter`

***

### onMouseLeave?

> `optional` **onMouseLeave**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseLeave`

***

### onMouseMove?

> `optional` **onMouseMove**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseMove`

***

### onMouseMoveCapture?

> `optional` **onMouseMoveCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseMoveCapture`

***

### onMouseOut?

> `optional` **onMouseOut**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOut`

***

### onMouseOutCapture?

> `optional` **onMouseOutCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOutCapture`

***

### onMouseOver?

> `optional` **onMouseOver**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOver`

***

### onMouseOverCapture?

> `optional` **onMouseOverCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOverCapture`

***

### onMouseUp?

> `optional` **onMouseUp**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseUp`

***

### onMouseUpCapture?

> `optional` **onMouseUpCapture**: `MouseEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onMouseUpCapture`

***

### onSelect?

> `optional` **onSelect**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSelect`

***

### onSelectCapture?

> `optional` **onSelectCapture**: `ReactEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onSelectCapture`

***

### onTouchCancel?

> `optional` **onTouchCancel**: `TouchEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTouchCancel`

***

### onTouchCancelCapture?

> `optional` **onTouchCancelCapture**: `TouchEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTouchCancelCapture`

***

### onTouchEnd?

> `optional` **onTouchEnd**: `TouchEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTouchEnd`

***

### onTouchEndCapture?

> `optional` **onTouchEndCapture**: `TouchEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTouchEndCapture`

***

### onTouchMove?

> `optional` **onTouchMove**: `TouchEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTouchMove`

***

### onTouchMoveCapture?

> `optional` **onTouchMoveCapture**: `TouchEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTouchMoveCapture`

***

### onTouchStart?

> `optional` **onTouchStart**: `TouchEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTouchStart`

***

### onTouchStartCapture?

> `optional` **onTouchStartCapture**: `TouchEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTouchStartCapture`

***

### onPointerDown?

> `optional` **onPointerDown**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerDown`

***

### onPointerDownCapture?

> `optional` **onPointerDownCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerDownCapture`

***

### onPointerMove?

> `optional` **onPointerMove**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerMove`

***

### onPointerMoveCapture?

> `optional` **onPointerMoveCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerMoveCapture`

***

### onPointerUp?

> `optional` **onPointerUp**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerUp`

***

### onPointerUpCapture?

> `optional` **onPointerUpCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerUpCapture`

***

### onPointerCancel?

> `optional` **onPointerCancel**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerCancel`

***

### onPointerCancelCapture?

> `optional` **onPointerCancelCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerCancelCapture`

***

### onPointerEnter?

> `optional` **onPointerEnter**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerEnter`

***

### onPointerLeave?

> `optional` **onPointerLeave**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerLeave`

***

### onPointerOver?

> `optional` **onPointerOver**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOver`

***

### onPointerOverCapture?

> `optional` **onPointerOverCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOverCapture`

***

### onPointerOut?

> `optional` **onPointerOut**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOut`

***

### onPointerOutCapture?

> `optional` **onPointerOutCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOutCapture`

***

### onGotPointerCapture?

> `optional` **onGotPointerCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onGotPointerCapture`

***

### onGotPointerCaptureCapture?

> `optional` **onGotPointerCaptureCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onGotPointerCaptureCapture`

***

### onLostPointerCapture?

> `optional` **onLostPointerCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLostPointerCapture`

***

### onLostPointerCaptureCapture?

> `optional` **onLostPointerCaptureCapture**: `PointerEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onLostPointerCaptureCapture`

***

### onScroll?

> `optional` **onScroll**: `UIEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onScroll`

***

### onScrollCapture?

> `optional` **onScrollCapture**: `UIEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onScrollCapture`

***

### onScrollEnd?

> `optional` **onScrollEnd**: `UIEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onScrollEnd`

***

### onScrollEndCapture?

> `optional` **onScrollEndCapture**: `UIEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onScrollEndCapture`

***

### onWheel?

> `optional` **onWheel**: `WheelEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onWheel`

***

### onWheelCapture?

> `optional` **onWheelCapture**: `WheelEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onWheelCapture`

***

### onAnimationStartCapture?

> `optional` **onAnimationStartCapture**: `AnimationEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationStartCapture`

***

### onAnimationEnd?

> `optional` **onAnimationEnd**: `AnimationEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationEnd`

***

### onAnimationEndCapture?

> `optional` **onAnimationEndCapture**: `AnimationEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationEndCapture`

***

### onAnimationIteration?

> `optional` **onAnimationIteration**: `AnimationEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationIteration`

***

### onAnimationIterationCapture?

> `optional` **onAnimationIterationCapture**: `AnimationEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationIterationCapture`

***

### onToggle?

> `optional` **onToggle**: `ToggleEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onToggle`

***

### onBeforeToggle?

> `optional` **onBeforeToggle**: `ToggleEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeToggle`

***

### onTransitionCancel?

> `optional` **onTransitionCancel**: `TransitionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionCancel`

***

### onTransitionCancelCapture?

> `optional` **onTransitionCancelCapture**: `TransitionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionCancelCapture`

***

### onTransitionEnd?

> `optional` **onTransitionEnd**: `TransitionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionEnd`

***

### onTransitionEndCapture?

> `optional` **onTransitionEndCapture**: `TransitionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionEndCapture`

***

### onTransitionRun?

> `optional` **onTransitionRun**: `TransitionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionRun`

***

### onTransitionRunCapture?

> `optional` **onTransitionRunCapture**: `TransitionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionRunCapture`

***

### onTransitionStart?

> `optional` **onTransitionStart**: `TransitionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionStart`

***

### onTransitionStartCapture?

> `optional` **onTransitionStartCapture**: `TransitionEventHandler`\<`HTMLButtonElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionStartCapture`

***

### disabled?

> `optional` **disabled**: `boolean`

#### Inherited from

`HTMLMotionProps.disabled`

***

### value?

> `optional` **value**: `string` \| `number` \| readonly `string`[]

#### Inherited from

`HTMLMotionProps.value`

***

### formAction?

> `optional` **formAction**: `string` \| (`formData`) => `void` \| `Promise`\<`void`\>

#### Inherited from

`HTMLMotionProps.formAction`

***

### formEncType?

> `optional` **formEncType**: `string`

#### Inherited from

`HTMLMotionProps.formEncType`

***

### formMethod?

> `optional` **formMethod**: `string`

#### Inherited from

`HTMLMotionProps.formMethod`

***

### formNoValidate?

> `optional` **formNoValidate**: `boolean`

#### Inherited from

`HTMLMotionProps.formNoValidate`

***

### formTarget?

> `optional` **formTarget**: `string`

#### Inherited from

`HTMLMotionProps.formTarget`

***

### name?

> `optional` **name**: `string`

#### Inherited from

`HTMLMotionProps.name`

***

### type?

> `optional` **type**: `"button"` \| `"submit"` \| `"reset"`

#### Inherited from

`HTMLMotionProps.type`
