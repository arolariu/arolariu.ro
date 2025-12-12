[**@arolariu/components**](../README.md)

***

[@arolariu/components](../README.md) / GradientBackgroundProps

# Interface: GradientBackgroundProps

Defined in: [packages/components/src/components/ui/gradient-background.tsx:8](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/gradient-background.tsx#L8)

## Extends

- `HTMLMotionProps`\<`"div"`\>

## Properties

### transition?

> `optional` **transition**: `Transition`

Defined in: [packages/components/src/components/ui/gradient-background.tsx:9](https://github.com/arolariu/arolariu.ro/blob/618baec8b061ce9601b486c8558fae1e3d704c6c/packages/components/src/components/ui/gradient-background.tsx#L9)

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

> `optional` **ref**: `Ref`\<`HTMLDivElement`\>

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

> `optional` **onCopy**: `ClipboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCopy`

***

### onCopyCapture?

> `optional` **onCopyCapture**: `ClipboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCopyCapture`

***

### onCut?

> `optional` **onCut**: `ClipboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCut`

***

### onCutCapture?

> `optional` **onCutCapture**: `ClipboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCutCapture`

***

### onPaste?

> `optional` **onPaste**: `ClipboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPaste`

***

### onPasteCapture?

> `optional` **onPasteCapture**: `ClipboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPasteCapture`

***

### onCompositionEnd?

> `optional` **onCompositionEnd**: `CompositionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionEnd`

***

### onCompositionEndCapture?

> `optional` **onCompositionEndCapture**: `CompositionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionEndCapture`

***

### onCompositionStart?

> `optional` **onCompositionStart**: `CompositionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionStart`

***

### onCompositionStartCapture?

> `optional` **onCompositionStartCapture**: `CompositionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionStartCapture`

***

### onCompositionUpdate?

> `optional` **onCompositionUpdate**: `CompositionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionUpdate`

***

### onCompositionUpdateCapture?

> `optional` **onCompositionUpdateCapture**: `CompositionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCompositionUpdateCapture`

***

### onFocus?

> `optional` **onFocus**: `FocusEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onFocus`

***

### onFocusCapture?

> `optional` **onFocusCapture**: `FocusEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onFocusCapture`

***

### onBlur?

> `optional` **onBlur**: `FocusEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onBlur`

***

### onBlurCapture?

> `optional` **onBlurCapture**: `FocusEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onBlurCapture`

***

### onChange?

> `optional` **onChange**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onChange`

***

### onChangeCapture?

> `optional` **onChangeCapture**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onChangeCapture`

***

### onBeforeInput?

> `optional` **onBeforeInput**: `InputEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeInput`

***

### onBeforeInputCapture?

> `optional` **onBeforeInputCapture**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeInputCapture`

***

### onInput?

> `optional` **onInput**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onInput`

***

### onInputCapture?

> `optional` **onInputCapture**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onInputCapture`

***

### onReset?

> `optional` **onReset**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onReset`

***

### onResetCapture?

> `optional` **onResetCapture**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onResetCapture`

***

### onSubmit?

> `optional` **onSubmit**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSubmit`

***

### onSubmitCapture?

> `optional` **onSubmitCapture**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSubmitCapture`

***

### onInvalid?

> `optional` **onInvalid**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onInvalid`

***

### onInvalidCapture?

> `optional` **onInvalidCapture**: `FormEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onInvalidCapture`

***

### onLoad?

> `optional` **onLoad**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLoad`

***

### onLoadCapture?

> `optional` **onLoadCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLoadCapture`

***

### onError?

> `optional` **onError**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onError`

***

### onErrorCapture?

> `optional` **onErrorCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onErrorCapture`

***

### onKeyDown?

> `optional` **onKeyDown**: `KeyboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onKeyDown`

***

### onKeyDownCapture?

> `optional` **onKeyDownCapture**: `KeyboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onKeyDownCapture`

***

### onKeyPress?

> `optional` **onKeyPress**: `KeyboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onKeyPress`

***

### onKeyPressCapture?

> `optional` **onKeyPressCapture**: `KeyboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onKeyPressCapture`

***

### onKeyUp?

> `optional` **onKeyUp**: `KeyboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onKeyUp`

***

### onKeyUpCapture?

> `optional` **onKeyUpCapture**: `KeyboardEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onKeyUpCapture`

***

### onAbort?

> `optional` **onAbort**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAbort`

***

### onAbortCapture?

> `optional` **onAbortCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAbortCapture`

***

### onCanPlay?

> `optional` **onCanPlay**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlay`

***

### onCanPlayCapture?

> `optional` **onCanPlayCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayCapture`

***

### onCanPlayThrough?

> `optional` **onCanPlayThrough**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayThrough`

***

### onCanPlayThroughCapture?

> `optional` **onCanPlayThroughCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onCanPlayThroughCapture`

***

### onDurationChange?

> `optional` **onDurationChange**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDurationChange`

***

### onDurationChangeCapture?

> `optional` **onDurationChangeCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDurationChangeCapture`

***

### onEmptied?

> `optional` **onEmptied**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onEmptied`

***

### onEmptiedCapture?

> `optional` **onEmptiedCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onEmptiedCapture`

***

### onEncrypted?

> `optional` **onEncrypted**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onEncrypted`

***

### onEncryptedCapture?

> `optional` **onEncryptedCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onEncryptedCapture`

***

### onEnded?

> `optional` **onEnded**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onEnded`

***

### onEndedCapture?

> `optional` **onEndedCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onEndedCapture`

***

### onLoadedData?

> `optional` **onLoadedData**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedData`

***

### onLoadedDataCapture?

> `optional` **onLoadedDataCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedDataCapture`

***

### onLoadedMetadata?

> `optional` **onLoadedMetadata**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedMetadata`

***

### onLoadedMetadataCapture?

> `optional` **onLoadedMetadataCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLoadedMetadataCapture`

***

### onLoadStart?

> `optional` **onLoadStart**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLoadStart`

***

### onLoadStartCapture?

> `optional` **onLoadStartCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLoadStartCapture`

***

### onPause?

> `optional` **onPause**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPause`

***

### onPauseCapture?

> `optional` **onPauseCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPauseCapture`

***

### onPlay?

> `optional` **onPlay**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPlay`

***

### onPlayCapture?

> `optional` **onPlayCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPlayCapture`

***

### onPlaying?

> `optional` **onPlaying**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPlaying`

***

### onPlayingCapture?

> `optional` **onPlayingCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPlayingCapture`

***

### onProgress?

> `optional` **onProgress**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onProgress`

***

### onProgressCapture?

> `optional` **onProgressCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onProgressCapture`

***

### onRateChange?

> `optional` **onRateChange**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onRateChange`

***

### onRateChangeCapture?

> `optional` **onRateChangeCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onRateChangeCapture`

***

### onSeeked?

> `optional` **onSeeked**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSeeked`

***

### onSeekedCapture?

> `optional` **onSeekedCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSeekedCapture`

***

### onSeeking?

> `optional` **onSeeking**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSeeking`

***

### onSeekingCapture?

> `optional` **onSeekingCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSeekingCapture`

***

### onStalled?

> `optional` **onStalled**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onStalled`

***

### onStalledCapture?

> `optional` **onStalledCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onStalledCapture`

***

### onSuspend?

> `optional` **onSuspend**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSuspend`

***

### onSuspendCapture?

> `optional` **onSuspendCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSuspendCapture`

***

### onTimeUpdate?

> `optional` **onTimeUpdate**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTimeUpdate`

***

### onTimeUpdateCapture?

> `optional` **onTimeUpdateCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTimeUpdateCapture`

***

### onVolumeChange?

> `optional` **onVolumeChange**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onVolumeChange`

***

### onVolumeChangeCapture?

> `optional` **onVolumeChangeCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onVolumeChangeCapture`

***

### onWaiting?

> `optional` **onWaiting**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onWaiting`

***

### onWaitingCapture?

> `optional` **onWaitingCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onWaitingCapture`

***

### onAuxClick?

> `optional` **onAuxClick**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAuxClick`

***

### onAuxClickCapture?

> `optional` **onAuxClickCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAuxClickCapture`

***

### onClick?

> `optional` **onClick**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onClick`

***

### onClickCapture?

> `optional` **onClickCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onClickCapture`

***

### onContextMenu?

> `optional` **onContextMenu**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onContextMenu`

***

### onContextMenuCapture?

> `optional` **onContextMenuCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onContextMenuCapture`

***

### onDoubleClick?

> `optional` **onDoubleClick**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDoubleClick`

***

### onDoubleClickCapture?

> `optional` **onDoubleClickCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDoubleClickCapture`

***

### onDragCapture?

> `optional` **onDragCapture**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragCapture`

***

### onDragEndCapture?

> `optional` **onDragEndCapture**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragEndCapture`

***

### onDragEnter?

> `optional` **onDragEnter**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragEnter`

***

### onDragEnterCapture?

> `optional` **onDragEnterCapture**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragEnterCapture`

***

### onDragExit?

> `optional` **onDragExit**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragExit`

***

### onDragExitCapture?

> `optional` **onDragExitCapture**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragExitCapture`

***

### onDragLeave?

> `optional` **onDragLeave**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragLeave`

***

### onDragLeaveCapture?

> `optional` **onDragLeaveCapture**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragLeaveCapture`

***

### onDragOver?

> `optional` **onDragOver**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragOver`

***

### onDragOverCapture?

> `optional` **onDragOverCapture**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragOverCapture`

***

### onDragStartCapture?

> `optional` **onDragStartCapture**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDragStartCapture`

***

### onDrop?

> `optional` **onDrop**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDrop`

***

### onDropCapture?

> `optional` **onDropCapture**: `DragEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onDropCapture`

***

### onMouseDown?

> `optional` **onMouseDown**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseDown`

***

### onMouseDownCapture?

> `optional` **onMouseDownCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseDownCapture`

***

### onMouseEnter?

> `optional` **onMouseEnter**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseEnter`

***

### onMouseLeave?

> `optional` **onMouseLeave**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseLeave`

***

### onMouseMove?

> `optional` **onMouseMove**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseMove`

***

### onMouseMoveCapture?

> `optional` **onMouseMoveCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseMoveCapture`

***

### onMouseOut?

> `optional` **onMouseOut**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOut`

***

### onMouseOutCapture?

> `optional` **onMouseOutCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOutCapture`

***

### onMouseOver?

> `optional` **onMouseOver**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOver`

***

### onMouseOverCapture?

> `optional` **onMouseOverCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseOverCapture`

***

### onMouseUp?

> `optional` **onMouseUp**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseUp`

***

### onMouseUpCapture?

> `optional` **onMouseUpCapture**: `MouseEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onMouseUpCapture`

***

### onSelect?

> `optional` **onSelect**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSelect`

***

### onSelectCapture?

> `optional` **onSelectCapture**: `ReactEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onSelectCapture`

***

### onTouchCancel?

> `optional` **onTouchCancel**: `TouchEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTouchCancel`

***

### onTouchCancelCapture?

> `optional` **onTouchCancelCapture**: `TouchEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTouchCancelCapture`

***

### onTouchEnd?

> `optional` **onTouchEnd**: `TouchEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTouchEnd`

***

### onTouchEndCapture?

> `optional` **onTouchEndCapture**: `TouchEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTouchEndCapture`

***

### onTouchMove?

> `optional` **onTouchMove**: `TouchEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTouchMove`

***

### onTouchMoveCapture?

> `optional` **onTouchMoveCapture**: `TouchEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTouchMoveCapture`

***

### onTouchStart?

> `optional` **onTouchStart**: `TouchEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTouchStart`

***

### onTouchStartCapture?

> `optional` **onTouchStartCapture**: `TouchEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTouchStartCapture`

***

### onPointerDown?

> `optional` **onPointerDown**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerDown`

***

### onPointerDownCapture?

> `optional` **onPointerDownCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerDownCapture`

***

### onPointerMove?

> `optional` **onPointerMove**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerMove`

***

### onPointerMoveCapture?

> `optional` **onPointerMoveCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerMoveCapture`

***

### onPointerUp?

> `optional` **onPointerUp**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerUp`

***

### onPointerUpCapture?

> `optional` **onPointerUpCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerUpCapture`

***

### onPointerCancel?

> `optional` **onPointerCancel**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerCancel`

***

### onPointerCancelCapture?

> `optional` **onPointerCancelCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerCancelCapture`

***

### onPointerEnter?

> `optional` **onPointerEnter**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerEnter`

***

### onPointerLeave?

> `optional` **onPointerLeave**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerLeave`

***

### onPointerOver?

> `optional` **onPointerOver**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOver`

***

### onPointerOverCapture?

> `optional` **onPointerOverCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOverCapture`

***

### onPointerOut?

> `optional` **onPointerOut**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOut`

***

### onPointerOutCapture?

> `optional` **onPointerOutCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onPointerOutCapture`

***

### onGotPointerCapture?

> `optional` **onGotPointerCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onGotPointerCapture`

***

### onGotPointerCaptureCapture?

> `optional` **onGotPointerCaptureCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onGotPointerCaptureCapture`

***

### onLostPointerCapture?

> `optional` **onLostPointerCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLostPointerCapture`

***

### onLostPointerCaptureCapture?

> `optional` **onLostPointerCaptureCapture**: `PointerEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onLostPointerCaptureCapture`

***

### onScroll?

> `optional` **onScroll**: `UIEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onScroll`

***

### onScrollCapture?

> `optional` **onScrollCapture**: `UIEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onScrollCapture`

***

### onScrollEnd?

> `optional` **onScrollEnd**: `UIEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onScrollEnd`

***

### onScrollEndCapture?

> `optional` **onScrollEndCapture**: `UIEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onScrollEndCapture`

***

### onWheel?

> `optional` **onWheel**: `WheelEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onWheel`

***

### onWheelCapture?

> `optional` **onWheelCapture**: `WheelEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onWheelCapture`

***

### onAnimationStartCapture?

> `optional` **onAnimationStartCapture**: `AnimationEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationStartCapture`

***

### onAnimationEnd?

> `optional` **onAnimationEnd**: `AnimationEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationEnd`

***

### onAnimationEndCapture?

> `optional` **onAnimationEndCapture**: `AnimationEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationEndCapture`

***

### onAnimationIteration?

> `optional` **onAnimationIteration**: `AnimationEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationIteration`

***

### onAnimationIterationCapture?

> `optional` **onAnimationIterationCapture**: `AnimationEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onAnimationIterationCapture`

***

### onToggle?

> `optional` **onToggle**: `ToggleEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onToggle`

***

### onBeforeToggle?

> `optional` **onBeforeToggle**: `ToggleEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onBeforeToggle`

***

### onTransitionCancel?

> `optional` **onTransitionCancel**: `TransitionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionCancel`

***

### onTransitionCancelCapture?

> `optional` **onTransitionCancelCapture**: `TransitionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionCancelCapture`

***

### onTransitionEnd?

> `optional` **onTransitionEnd**: `TransitionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionEnd`

***

### onTransitionEndCapture?

> `optional` **onTransitionEndCapture**: `TransitionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionEndCapture`

***

### onTransitionRun?

> `optional` **onTransitionRun**: `TransitionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionRun`

***

### onTransitionRunCapture?

> `optional` **onTransitionRunCapture**: `TransitionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionRunCapture`

***

### onTransitionStart?

> `optional` **onTransitionStart**: `TransitionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionStart`

***

### onTransitionStartCapture?

> `optional` **onTransitionStartCapture**: `TransitionEventHandler`\<`HTMLDivElement`\>

#### Inherited from

`HTMLMotionProps.onTransitionStartCapture`
