import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Checkbox} from "./checkbox";
import styles from "./checkbox.module.css";

const meta = {
  title: "Components/Forms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: {"aria-label": "Consent"},
  argTypes: {
    checked: {control: "select", options: [true, false, "indeterminate"]},
    indeterminate: {control: "boolean"},
    disabled: {control: "boolean"},
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {args: {defaultChecked: false}};
export const Checked: Story = {args: {defaultChecked: true}};
export const Indeterminate: Story = {args: {checked: "indeterminate"}};
export const Disabled: Story = {args: {disabled: true}};
export const CheckedDisabled: Story = {args: {defaultChecked: true, disabled: true}};

export const WithLabel: Story = {
  render: () => (
    <label className={styles.storyRow}>
      <Checkbox
        name='consent'
        value='accepted'
      />
      Accept terms and conditions
    </label>
  ),
};

function SelectionDemo(): React.JSX.Element {
  const [selected, setSelected] = React.useState<string[]>(["Alpha"]);
  const allSelected = selected.length === 2;
  const someSelected = selected.length > 0 && !allSelected;

  return (
    <div className={styles.storyStack}>
      <label className={styles.storyRow}>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onCheckedChange={(checked) => setSelected(checked ? ["Alpha", "Beta"] : [])}
        />
        Select all
      </label>
      {["Alpha", "Beta"].map((value) => (
        <label
          key={value}
          className={styles.storyRow}>
          <Checkbox
            checked={selected.includes(value)}
            onCheckedChange={(checked) =>
              setSelected((current) => (checked ? [...current, value] : current.filter((item) => item !== value)))
            }
          />
          {value}
        </label>
      ))}
      <output>Selected: {selected.join(", ") || "none"}</output>
    </div>
  );
}

export const IndeterminateState: Story = {render: () => <SelectionDemo />};
export const Controlled: Story = {render: () => <SelectionDemo />};

export const PrimitiveState: Story = {
  render: () => (
    <Checkbox
      aria-label='Composed checkbox'
      defaultChecked
      render={(props, state) => (
        <span
          {...props}
          data-contract-checked={String(state.checked)}
          data-contract-mixed={String(state.indeterminate)}
        />
      )}
    />
  ),
};

export const NativeComposition: Story = {
  render: () => (
    <Checkbox
      aria-label='Native button checkbox'
      nativeButton
      render={<button />}
    />
  ),
};
