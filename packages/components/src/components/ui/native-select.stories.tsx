import {useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {NativeSelect, NativeSelectOptGroup, NativeSelectOption, type NativeSelectProps} from "./native-select";
import styles from "./native-select.module.css";

const meta = {
  title: "Components/Forms/NativeSelect",
  component: NativeSelect,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A browser-owned select menu. The caller supplies its label; native options, optgroups, validation and form submission remain intact. "
          + "size is a visual sm/default variant, not the HTML row-count attribute. className targets the wrapper; refs target the select.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["default", "sm"],
      description: "Logical visual size; not the native select row count.",
    },
    disabled: {control: "boolean"},
    required: {control: "boolean"},
    children: {control: false},
  },
  args: {
    defaultValue: "pear",
    size: "default",
    disabled: false,
    required: false,
  },
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

function FruitOptions(): React.JSX.Element {
  return (
    <>
      <NativeSelectOption value='pear'>Pear</NativeSelectOption>
      <NativeSelectOption value='apple'>Apple</NativeSelectOption>
      <NativeSelectOption value='orange'>Orange</NativeSelectOption>
    </>
  );
}

function NativeFormExample({
  id = "native-fruit",
  children,
  onFormReset,
  ...props
}: Readonly<NativeSelectProps & {onFormReset?: () => void}>): React.JSX.Element {
  const [submitted, setSubmitted] = useState("Not submitted");
  const name = props.name ?? "fruit";

  return (
    <form
      aria-label='Native fruit form'
      className={styles.example}
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget).getAll(name);
        setSubmitted(values.length ? values.map(String).join(", ") : "No submitted value");
      }}
      onReset={() => {
        setSubmitted("Not submitted");
        onFormReset?.();
      }}>
      <label htmlFor={id}>Fruit</label>
      <NativeSelect
        {...props}
        id={id}
        name={name}
        aria-describedby={`${id}-hint`}>
        {children ?? <FruitOptions />}
      </NativeSelect>
      <p id={`${id}-hint`}>Choose a fruit, then submit to inspect native FormData.</p>
      <div className={styles.exampleActions}>
        <button type='submit'>Submit form</button>
        <button type='reset'>Reset form</button>
      </div>
      <output aria-label='Submitted fruit'>{submitted}</output>
    </form>
  );
}

function ControlledExample({defaultValue, value, onChange, ...props}: Readonly<NativeSelectProps>): React.JSX.Element {
  const [fruit, setFruit] = useState("pear");

  return (
    <div className={styles.example}>
      <NativeFormExample
        {...props}
        id='controlled-native-fruit'
        value={fruit}
        onChange={(event) => {
          setFruit(event.currentTarget.value);
          onChange?.(event);
        }}
        onFormReset={() => setFruit("pear")}
      />
      <output aria-label='Controlled fruit'>Controlled value: {fruit}</output>
    </div>
  );
}

export const Default: Story = {
  render: (args): React.JSX.Element => <NativeFormExample {...args} />,
};

export const Small: Story = {
  args: {size: "sm"},
  render: (args): React.JSX.Element => (
    <NativeFormExample
      {...args}
      id='small-native-fruit'
    />
  ),
};

export const Required: Story = {
  args: {
    required: true,
    defaultValue: "",
    children: (
      <>
        <NativeSelectOption
          value=''
          disabled>
          Choose a fruit
        </NativeSelectOption>
        <FruitOptions />
      </>
    ),
  },
  render: (args): React.JSX.Element => (
    <NativeFormExample
      {...args}
      id='required-native-fruit'
    />
  ),
};

export const Disabled: Story = {
  args: {disabled: true},
  render: (args): React.JSX.Element => (
    <NativeFormExample
      {...args}
      id='disabled-native-fruit'
    />
  ),
};

export const WithOptGroups: Story = {
  args: {
    children: (
      <>
        <NativeSelectOptGroup label='Available'>
          <NativeSelectOption value='pear'>Pear</NativeSelectOption>
          <NativeSelectOption value='apple'>Apple</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup
          label='Out of season'
          disabled>
          <NativeSelectOption value='orange'>Orange</NativeSelectOption>
        </NativeSelectOptGroup>
      </>
    ),
  },
  render: (args): React.JSX.Element => (
    <NativeFormExample
      {...args}
      id='grouped-native-fruit'
    />
  ),
};

export const Controlled: Story = {
  render: (args): React.JSX.Element => <ControlledExample {...args} />,
};

export const RightToLeft: Story = {
  args: {dir: "rtl"},
  render: (args): React.JSX.Element => (
    <div dir='rtl'>
      <NativeFormExample
        {...args}
        id='rtl-native-fruit'
      />
    </div>
  ),
};

export const Multiple: Story = {
  args: {
    multiple: true,
    defaultValue: ["pear"],
  },
  render: (args): React.JSX.Element => (
    <NativeFormExample
      {...args}
      id='multiple-native-fruit'
    />
  ),
};
