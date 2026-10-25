import {useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {DirectionProvider, useDirection, type DirectionProviderProps, type TextDirection} from "./direction";
import {NativeSelect, NativeSelectOption} from "./native-select";

const meta = {
  title: "Components/Utilities/Direction",
  component: DirectionProvider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The original Base UI DirectionProvider and useDirection, without an extra wrapper or stylesheet. "
          + "The provider scopes Base UI direction; consumers explicitly apply HTML dir for native layout.",
      },
    },
  },
  argTypes: {
    direction: {
      control: "select",
      options: ["ltr", "rtl"],
      description: "Reading direction in this Base UI context scope.",
    },
    children: {control: false},
  },
  args: {direction: "ltr"},
} satisfies Meta<typeof DirectionProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function DirectionContent({id, label}: Readonly<{id: string; label: string}>): React.JSX.Element {
  const direction = useDirection();
  const [submitted, setSubmitted] = useState("Not submitted");

  return (
    <fieldset dir={direction}>
      <legend>{label}</legend>
      <p>
        Context direction: <output aria-label={`${label} direction`}>{direction}</output>
      </p>
      <form
        aria-label={`${label} native form`}
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("fruit");
          setSubmitted(typeof value === "string" ? value : "No submitted value");
        }}>
        <label htmlFor={`${id}-fruit`}>Fruit</label>
        <NativeSelect
          id={`${id}-fruit`}
          name='fruit'
          dir={direction}
          defaultValue='pear'>
          <NativeSelectOption value='pear'>Pear</NativeSelectOption>
          <NativeSelectOption value='apple'>Apple</NativeSelectOption>
          <NativeSelectOption value='orange'>Orange</NativeSelectOption>
        </NativeSelect>
        <button type='submit'>Submit form</button>
        <p>
          Submitted fruit: <output aria-label={`${label} submitted fruit`}>{submitted}</output>
        </p>
      </form>
    </fieldset>
  );
}

function DirectionExample(props: Readonly<DirectionProviderProps>): React.JSX.Element {
  return (
    <DirectionProvider {...props}>
      <DirectionContent
        id='direction-default'
        label='Scoped direction'
      />
    </DirectionProvider>
  );
}

function DynamicExample(): React.JSX.Element {
  const [direction, setDirection] = useState<TextDirection>("ltr");
  return (
    <>
      <button
        type='button'
        onClick={() => setDirection((current) => (current === "ltr" ? "rtl" : "ltr"))}>
        Toggle reading direction
      </button>
      <DirectionProvider direction={direction}>
        <DirectionContent
          id='direction-changing'
          label='Changing scope'
        />
      </DirectionProvider>
      <DirectionContent
        id='direction-outside'
        label='Outside scope'
      />
    </>
  );
}

export const Default: Story = {
  render: (args): React.JSX.Element => <DirectionExample {...args} />,
};

export const RightToLeft: Story = {
  args: {direction: "rtl"},
  render: (args): React.JSX.Element => <DirectionExample {...args} />,
};

export const NestedScopes: Story = {
  args: {direction: "rtl"},
  render: (args): React.JSX.Element => (
    <>
      <DirectionProvider {...args}>
        <DirectionContent
          id='direction-outer'
          label='Outer scope'
        />
        <DirectionProvider direction='ltr'>
          <DirectionContent
            id='direction-inner'
            label='Nested LTR scope'
          />
        </DirectionProvider>
        <DirectionContent
          id='direction-sibling'
          label='Outer sibling'
        />
      </DirectionProvider>
      <DirectionContent
        id='direction-unscoped'
        label='Outside scope'
      />
    </>
  ),
};

export const Dynamic: Story = {
  render: (): React.JSX.Element => <DynamicExample />,
};
