import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {CountingNumber} from "./counting-number";
import styles from "./counting-number.module.css";

const meta = {
  title: "Components/Data Display/CountingNumber",
  component: CountingNumber,
  tags: ["autodocs"],
  args: {number: 1000, fromNumber: 37},
  argTypes: {number: {control: "number"}, fromNumber: {control: "number"}, decimalPlaces: {control: "number"}},
} satisfies Meta<typeof CountingNumber>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Nonzero initial text remains stable before the real spring starts. */
export const Integer: Story = {};
export const Decimal: Story = {args: {number: 99.99, fromNumber: 12.25, decimalPlaces: 2}};
export const NegativePadded: Story = {args: {number: -123.45, fromNumber: -5.25, padStart: true, decimalPlaces: 2, decimalSeparator: ","}};
export const InView: Story = {
  args: {number: 5000, fromNumber: 37, inView: true},
  render: (args) => (
    <div className={styles.storyDeferred}>
      <p>Scroll to the nonzero counter.</p>
      <CountingNumber
        {...args}
        className={styles.storyValue}
      />
    </div>
  ),
};
export const Currency: Story = {
  render: () => (
    <div className={styles.storyValue}>
      $
      <CountingNumber
        number={1234.56}
        fromNumber={125}
        decimalPlaces={2}
      />
    </div>
  ),
};
export const Percentage: Story = {
  render: () => (
    <div className={styles.storyValue}>
      <CountingNumber
        number={100}
        fromNumber={25}
      />
      %
    </div>
  ),
};
export const Large: Story = {args: {number: 1_000_000, className: styles.storyValue}};
