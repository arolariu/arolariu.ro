import type {Meta, StoryObj} from "@storybook/react";
import {useCallback, useState} from "react";
import {ClassificationSystem} from "@/types/invoices";
import ClassificationPicker from "./ClassificationPicker";

type ClassificationPickerProps = React.ComponentProps<typeof ClassificationPicker>;

function ControlledClassificationPicker({value: initialValue, onChange, ...props}: Readonly<ClassificationPickerProps>): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  const handleChange = useCallback<ClassificationPickerProps["onChange"]>(
    (selection) => {
      setValue(selection);
      onChange(selection);
    },
    [onChange],
  );

  return (
    <ClassificationPicker
      {...props}
      value={value}
      onChange={handleChange}
    />
  );
}

/**
 * Accessible canonical-taxonomy picker.
 *
 * @remarks
 * These stories use deterministic controlled values and do not prefetch or
 * depend on a network response. Search requests are only issued after a user
 * enters at least two normalized characters.
 */
const meta = {
  title: "Invoices/Classification/ClassificationPicker",
  component: ClassificationPicker,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    system: ClassificationSystem.Gs1Gpc,
    value: null,
    onChange: () => undefined,
    label: "Product classification",
  },
  render: (args) => (
    <ControlledClassificationPicker
      key={`${args.system}-${args.value?.code ?? "empty"}`}
      {...args}
    />
  ),
  argTypes: {
    onChange: {control: false},
  },
} satisfies Meta<typeof ClassificationPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty picker ready for a taxonomy query. */
export const Empty: Story = {};

/** Controlled picker with an existing taxonomy selection. */
export const Selected: Story = {
  args: {
    value: {
      system: ClassificationSystem.Gs1Gpc,
      code: "50202200",
    },
  },
};

/** Disabled picker with a deterministic existing selection. */
export const Disabled: Story = {
  args: {
    value: {
      system: ClassificationSystem.Gs1Gpc,
      code: "50202200",
    },
    disabled: true,
  },
};
