[**@arolariu/components**](../README.md)

***

[@arolariu/components](../README.md) / HighlightTextProps

# Interface: HighlightTextProps

Defined in: [packages/components/src/components/ui/highlight-text.tsx:8](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/highlight-text.tsx#L8)

## Extends

- `HTMLMotionProps`\<`"span"`\>

## Properties

### text

> **text**: `string`

Defined in: [packages/components/src/components/ui/highlight-text.tsx:9](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/highlight-text.tsx#L9)

***

### inView?

> `optional` **inView**: `boolean`

Defined in: [packages/components/src/components/ui/highlight-text.tsx:10](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/highlight-text.tsx#L10)

***

### inViewMargin?

> `optional` **inViewMargin**: `MarginType`

Defined in: [packages/components/src/components/ui/highlight-text.tsx:11](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/highlight-text.tsx#L11)

***

### inViewOnce?

> `optional` **inViewOnce**: `boolean`

Defined in: [packages/components/src/components/ui/highlight-text.tsx:12](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/highlight-text.tsx#L12)

***

### transition?

> `optional` **transition**: `Transition`

Defined in: [packages/components/src/components/ui/highlight-text.tsx:13](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/highlight-text.tsx#L13)

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

> `optional` **ref**: `Ref`\<`HTMLSpanElement`\>

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

> `optional` **onCopy**: `ClipboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCopy`

***

### onCopyCapture?

> `optional` **onCopyCapture**: `ClipboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCopyCapture`

***

### onCut?

> `optional` **onCut**: `ClipboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCut`

***

### onCutCapture?

> `optional` **onCutCapture**: `ClipboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCutCapture`

***

### onPaste?

> `optional` **onPaste**: `ClipboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPaste`

***

### onPasteCapture?

> `optional` **onPasteCapture**: `ClipboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPasteCapture`

***

### onCompositionEnd?

> `optional` **onCompositionEnd**: `CompositionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionEnd`

***

### onCompositionEndCapture?

> `optional` **onCompositionEndCapture**: `CompositionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionEndCapture`

***

### onCompositionStart?

> `optional` **onCompositionStart**: `CompositionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionStart`

***

### onCompositionStartCapture?

> `optional` **onCompositionStartCapture**: `CompositionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionStartCapture`

***

### onCompositionUpdate?

> `optional` **onCompositionUpdate**: `CompositionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionUpdate`

***

### onCompositionUpdateCapture?

> `optional` **onCompositionUpdateCapture**: `CompositionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionUpdateCapture`

***

### onFocus?

> `optional` **onFocus**: `FocusEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onFocus`

***

### onFocusCapture?

> `optional` **onFocusCapture**: `FocusEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onFocusCapture`

***

### onBlur?

> `optional` **onBlur**: `FocusEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onBlur`

***

### onBlurCapture?

> `optional` **onBlurCapture**: `FocusEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onBlurCapture`

***

### onChange?

> `optional` **onChange**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onChange`

***

### onChangeCapture?

> `optional` **onChangeCapture**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onChangeCapture`

***

### onBeforeInput?

> `optional` **onBeforeInput**: `InputEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeInput`

***

### onBeforeInputCapture?

> `optional` **onBeforeInputCapture**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeInputCapture`

***

### onInput?

> `optional` **onInput**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onInput`

***

### onInputCapture?

> `optional` **onInputCapture**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onInputCapture`

***

### onReset?

> `optional` **onReset**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onReset`

***

### onResetCapture?

> `optional` **onResetCapture**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onResetCapture`

***

### onSubmit?

> `optional` **onSubmit**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSubmit`

***

### onSubmitCapture?

> `optional` **onSubmitCapture**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSubmitCapture`

***

### onInvalid?

> `optional` **onInvalid**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onInvalid`

***

### onInvalidCapture?

> `optional` **onInvalidCapture**: `FormEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onInvalidCapture`

***

### onLoad?

> `optional` **onLoad**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLoad`

***

### onLoadCapture?

> `optional` **onLoadCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLoadCapture`

***

### onError?

> `optional` **onError**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onError`

***

### onErrorCapture?

> `optional` **onErrorCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onErrorCapture`

***

### onKeyDown?

> `optional` **onKeyDown**: `KeyboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onKeyDown`

***

### onKeyDownCapture?

> `optional` **onKeyDownCapture**: `KeyboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onKeyDownCapture`

***

### onKeyPress?

> `optional` **onKeyPress**: `KeyboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onKeyPress`

***

### onKeyPressCapture?

> `optional` **onKeyPressCapture**: `KeyboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onKeyPressCapture`

***

### onKeyUp?

> `optional` **onKeyUp**: `KeyboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onKeyUp`

***

### onKeyUpCapture?

> `optional` **onKeyUpCapture**: `KeyboardEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onKeyUpCapture`

***

### onAbort?

> `optional` **onAbort**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAbort`

***

### onAbortCapture?

> `optional` **onAbortCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAbortCapture`

***

### onCanPlay?

> `optional` **onCanPlay**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlay`

***

### onCanPlayCapture?

> `optional` **onCanPlayCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayCapture`

***

### onCanPlayThrough?

> `optional` **onCanPlayThrough**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayThrough`

***

### onCanPlayThroughCapture?

> `optional` **onCanPlayThroughCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayThroughCapture`

***

### onDurationChange?

> `optional` **onDurationChange**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDurationChange`

***

### onDurationChangeCapture?

> `optional` **onDurationChangeCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDurationChangeCapture`

***

### onEmptied?

> `optional` **onEmptied**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onEmptied`

***

### onEmptiedCapture?

> `optional` **onEmptiedCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onEmptiedCapture`

***

### onEncrypted?

> `optional` **onEncrypted**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onEncrypted`

***

### onEncryptedCapture?

> `optional` **onEncryptedCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onEncryptedCapture`

***

### onEnded?

> `optional` **onEnded**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onEnded`

***

### onEndedCapture?

> `optional` **onEndedCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onEndedCapture`

***

### onLoadedData?

> `optional` **onLoadedData**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedData`

***

### onLoadedDataCapture?

> `optional` **onLoadedDataCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedDataCapture`

***

### onLoadedMetadata?

> `optional` **onLoadedMetadata**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedMetadata`

***

### onLoadedMetadataCapture?

> `optional` **onLoadedMetadataCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedMetadataCapture`

***

### onLoadStart?

> `optional` **onLoadStart**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLoadStart`

***

### onLoadStartCapture?

> `optional` **onLoadStartCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLoadStartCapture`

***

### onPause?

> `optional` **onPause**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPause`

***

### onPauseCapture?

> `optional` **onPauseCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPauseCapture`

***

### onPlay?

> `optional` **onPlay**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPlay`

***

### onPlayCapture?

> `optional` **onPlayCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPlayCapture`

***

### onPlaying?

> `optional` **onPlaying**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPlaying`

***

### onPlayingCapture?

> `optional` **onPlayingCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPlayingCapture`

***

### onProgress?

> `optional` **onProgress**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onProgress`

***

### onProgressCapture?

> `optional` **onProgressCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onProgressCapture`

***

### onRateChange?

> `optional` **onRateChange**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onRateChange`

***

### onRateChangeCapture?

> `optional` **onRateChangeCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onRateChangeCapture`

***

### onSeeked?

> `optional` **onSeeked**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSeeked`

***

### onSeekedCapture?

> `optional` **onSeekedCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSeekedCapture`

***

### onSeeking?

> `optional` **onSeeking**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSeeking`

***

### onSeekingCapture?

> `optional` **onSeekingCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSeekingCapture`

***

### onStalled?

> `optional` **onStalled**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onStalled`

***

### onStalledCapture?

> `optional` **onStalledCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onStalledCapture`

***

### onSuspend?

> `optional` **onSuspend**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSuspend`

***

### onSuspendCapture?

> `optional` **onSuspendCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSuspendCapture`

***

### onTimeUpdate?

> `optional` **onTimeUpdate**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTimeUpdate`

***

### onTimeUpdateCapture?

> `optional` **onTimeUpdateCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTimeUpdateCapture`

***

### onVolumeChange?

> `optional` **onVolumeChange**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onVolumeChange`

***

### onVolumeChangeCapture?

> `optional` **onVolumeChangeCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onVolumeChangeCapture`

***

### onWaiting?

> `optional` **onWaiting**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onWaiting`

***

### onWaitingCapture?

> `optional` **onWaitingCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onWaitingCapture`

***

### onAuxClick?

> `optional` **onAuxClick**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAuxClick`

***

### onAuxClickCapture?

> `optional` **onAuxClickCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAuxClickCapture`

***

### onClick?

> `optional` **onClick**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onClick`

***

### onClickCapture?

> `optional` **onClickCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onClickCapture`

***

### onContextMenu?

> `optional` **onContextMenu**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onContextMenu`

***

### onContextMenuCapture?

> `optional` **onContextMenuCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onContextMenuCapture`

***

### onDoubleClick?

> `optional` **onDoubleClick**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDoubleClick`

***

### onDoubleClickCapture?

> `optional` **onDoubleClickCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDoubleClickCapture`

***

### onDragCapture?

> `optional` **onDragCapture**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragCapture`

***

### onDragEndCapture?

> `optional` **onDragEndCapture**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragEndCapture`

***

### onDragEnter?

> `optional` **onDragEnter**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragEnter`

***

### onDragEnterCapture?

> `optional` **onDragEnterCapture**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragEnterCapture`

***

### onDragExit?

> `optional` **onDragExit**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragExit`

***

### onDragExitCapture?

> `optional` **onDragExitCapture**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragExitCapture`

***

### onDragLeave?

> `optional` **onDragLeave**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragLeave`

***

### onDragLeaveCapture?

> `optional` **onDragLeaveCapture**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragLeaveCapture`

***

### onDragOver?

> `optional` **onDragOver**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragOver`

***

### onDragOverCapture?

> `optional` **onDragOverCapture**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragOverCapture`

***

### onDragStartCapture?

> `optional` **onDragStartCapture**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDragStartCapture`

***

### onDrop?

> `optional` **onDrop**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDrop`

***

### onDropCapture?

> `optional` **onDropCapture**: `DragEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onDropCapture`

***

### onMouseDown?

> `optional` **onMouseDown**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseDown`

***

### onMouseDownCapture?

> `optional` **onMouseDownCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseDownCapture`

***

### onMouseEnter?

> `optional` **onMouseEnter**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseEnter`

***

### onMouseLeave?

> `optional` **onMouseLeave**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseLeave`

***

### onMouseMove?

> `optional` **onMouseMove**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseMove`

***

### onMouseMoveCapture?

> `optional` **onMouseMoveCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseMoveCapture`

***

### onMouseOut?

> `optional` **onMouseOut**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOut`

***

### onMouseOutCapture?

> `optional` **onMouseOutCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOutCapture`

***

### onMouseOver?

> `optional` **onMouseOver**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOver`

***

### onMouseOverCapture?

> `optional` **onMouseOverCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOverCapture`

***

### onMouseUp?

> `optional` **onMouseUp**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseUp`

***

### onMouseUpCapture?

> `optional` **onMouseUpCapture**: `MouseEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onMouseUpCapture`

***

### onSelect?

> `optional` **onSelect**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSelect`

***

### onSelectCapture?

> `optional` **onSelectCapture**: `ReactEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onSelectCapture`

***

### onTouchCancel?

> `optional` **onTouchCancel**: `TouchEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTouchCancel`

***

### onTouchCancelCapture?

> `optional` **onTouchCancelCapture**: `TouchEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTouchCancelCapture`

***

### onTouchEnd?

> `optional` **onTouchEnd**: `TouchEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTouchEnd`

***

### onTouchEndCapture?

> `optional` **onTouchEndCapture**: `TouchEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTouchEndCapture`

***

### onTouchMove?

> `optional` **onTouchMove**: `TouchEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTouchMove`

***

### onTouchMoveCapture?

> `optional` **onTouchMoveCapture**: `TouchEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTouchMoveCapture`

***

### onTouchStart?

> `optional` **onTouchStart**: `TouchEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTouchStart`

***

### onTouchStartCapture?

> `optional` **onTouchStartCapture**: `TouchEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTouchStartCapture`

***

### onPointerDown?

> `optional` **onPointerDown**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerDown`

***

### onPointerDownCapture?

> `optional` **onPointerDownCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerDownCapture`

***

### onPointerMove?

> `optional` **onPointerMove**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerMove`

***

### onPointerMoveCapture?

> `optional` **onPointerMoveCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerMoveCapture`

***

### onPointerUp?

> `optional` **onPointerUp**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerUp`

***

### onPointerUpCapture?

> `optional` **onPointerUpCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerUpCapture`

***

### onPointerCancel?

> `optional` **onPointerCancel**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerCancel`

***

### onPointerCancelCapture?

> `optional` **onPointerCancelCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerCancelCapture`

***

### onPointerEnter?

> `optional` **onPointerEnter**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerEnter`

***

### onPointerLeave?

> `optional` **onPointerLeave**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerLeave`

***

### onPointerOver?

> `optional` **onPointerOver**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOver`

***

### onPointerOverCapture?

> `optional` **onPointerOverCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOverCapture`

***

### onPointerOut?

> `optional` **onPointerOut**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOut`

***

### onPointerOutCapture?

> `optional` **onPointerOutCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOutCapture`

***

### onGotPointerCapture?

> `optional` **onGotPointerCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onGotPointerCapture`

***

### onGotPointerCaptureCapture?

> `optional` **onGotPointerCaptureCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onGotPointerCaptureCapture`

***

### onLostPointerCapture?

> `optional` **onLostPointerCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLostPointerCapture`

***

### onLostPointerCaptureCapture?

> `optional` **onLostPointerCaptureCapture**: `PointerEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onLostPointerCaptureCapture`

***

### onScroll?

> `optional` **onScroll**: `UIEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onScroll`

***

### onScrollCapture?

> `optional` **onScrollCapture**: `UIEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onScrollCapture`

***

### onScrollEnd?

> `optional` **onScrollEnd**: `UIEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onScrollEnd`

***

### onScrollEndCapture?

> `optional` **onScrollEndCapture**: `UIEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onScrollEndCapture`

***

### onWheel?

> `optional` **onWheel**: `WheelEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onWheel`

***

### onWheelCapture?

> `optional` **onWheelCapture**: `WheelEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onWheelCapture`

***

### onAnimationStartCapture?

> `optional` **onAnimationStartCapture**: `AnimationEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationStartCapture`

***

### onAnimationEnd?

> `optional` **onAnimationEnd**: `AnimationEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationEnd`

***

### onAnimationEndCapture?

> `optional` **onAnimationEndCapture**: `AnimationEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationEndCapture`

***

### onAnimationIteration?

> `optional` **onAnimationIteration**: `AnimationEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationIteration`

***

### onAnimationIterationCapture?

> `optional` **onAnimationIterationCapture**: `AnimationEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationIterationCapture`

***

### onToggle?

> `optional` **onToggle**: `ToggleEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onToggle`

***

### onBeforeToggle?

> `optional` **onBeforeToggle**: `ToggleEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeToggle`

***

### onTransitionCancel?

> `optional` **onTransitionCancel**: `TransitionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionCancel`

***

### onTransitionCancelCapture?

> `optional` **onTransitionCancelCapture**: `TransitionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionCancelCapture`

***

### onTransitionEnd?

> `optional` **onTransitionEnd**: `TransitionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionEnd`

***

### onTransitionEndCapture?

> `optional` **onTransitionEndCapture**: `TransitionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionEndCapture`

***

### onTransitionRun?

> `optional` **onTransitionRun**: `TransitionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionRun`

***

### onTransitionRunCapture?

> `optional` **onTransitionRunCapture**: `TransitionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionRunCapture`

***

### onTransitionStart?

> `optional` **onTransitionStart**: `TransitionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionStart`

***

### onTransitionStartCapture?

> `optional` **onTransitionStartCapture**: `TransitionEventHandler`\<`HTMLSpanElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionStartCapture`
