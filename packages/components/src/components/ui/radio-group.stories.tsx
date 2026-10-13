import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {RadioGroup, RadioGroupItem} from "./radio-group";
import styles from "./radio-group.module.css";

const meta = {
  title: "Components/Forms/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
  args: {"aria-label": "Options"},
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup
      aria-label='Options'
      name='option'
      defaultValue='one'>
      {["one", "two", "three"].map((value) => (
        <label
          key={value}
          className={styles.storyRow}>
          <RadioGroupItem value={value} />
          Option {value}
        </label>
      ))}
    </RadioGroup>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <RadioGroup
      aria-label='Quality'
      defaultValue='standard'>
      <label className={styles.storyRow}>
        <RadioGroupItem
          value='standard'
          aria-describedby='standard-description'
        />
        <span>
          Standard <small id='standard-description'>Balanced quality</small>
        </span>
      </label>
      <label className={styles.storyRow}>
        <RadioGroupItem
          value='high'
          aria-describedby='high-description'
        />
        <span>
          High <small id='high-description'>Maximum detail</small>
        </span>
      </label>
    </RadioGroup>
  ),
};

export const WithDisabled: Story = {
  render: () => (
    <RadioGroup
      aria-label='Availability'
      defaultValue='one'>
      {["one", "two", "three"].map((value) => (
        <label
          key={value}
          className={styles.storyRow}>
          <RadioGroupItem
            value={value}
            disabled={value === "two"}
          />
          Option {value}
          {value === "two" ? " (disabled)" : ""}
        </label>
      ))}
    </RadioGroup>
  ),
};

export const PaymentMethod: Story = {
  render: () => (
    <RadioGroup
      aria-label='Payment method'
      defaultValue='card'>
      {["card", "bank", "other"].map((value) => (
        <label
          key={value}
          className={styles.storyRow}>
          <RadioGroupItem value={value} />
          {value}
        </label>
      ))}
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup
      aria-label='Disabled options'
      disabled
      defaultValue='one'>
      <RadioGroupItem
        value='one'
        aria-label='Disabled one'
      />
      <RadioGroupItem
        value='two'
        aria-label='Disabled two'
      />
    </RadioGroup>
  ),
};

function ControlledDemo(): React.JSX.Element {
  const [value, setValue] = React.useState(1);
  return (
    <div className={styles.storyStack}>
      <RadioGroup
        aria-label='Numeric selection'
        value={value}
        onValueChange={setValue}>
        {[1, 2, 3].map((item) => (
          <label
            key={item}
            className={styles.storyRow}>
            <RadioGroupItem
              value={item}
              render={(props, state) => (
                <span
                  {...props}
                  data-contract-checked={String(state.checked)}
                />
              )}
            />
            Option {item}
          </label>
        ))}
      </RadioGroup>
      <output>Selected: {value}</output>
    </div>
  );
}

export const Controlled: Story = {render: () => <ControlledDemo />};
export const NativeComposition: Story = {
  render: () => (
    <RadioGroup
      aria-label='Native target options'
      defaultValue='one'>
      <RadioGroupItem
        nativeButton
        value='one'
        aria-label='Native one'
        render={<button />}
      />
      <RadioGroupItem
        nativeButton
        value='two'
        aria-label='Native two'
        render={<button />}
      />
    </RadioGroup>
  ),
};
