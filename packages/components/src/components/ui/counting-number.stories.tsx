import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {CountingNumber} from "./counting-number";
const storyStyles = `
.ac-story-counting-number-storyValue {
  font-size: calc(var(--ac-text-xl) * 2);
  font-weight: 700;
}

.ac-story-counting-number-storyDeferred {
  margin-block-start: 110vh;
  padding: var(--ac-space-4);
  background: var(--ac-muted);
}
`;

const storyClasses = {
  storyValue: "ac-story-counting-number-storyValue",
  storyDeferred: "ac-story-counting-number-storyDeferred",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
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
    <div className={storyClasses.storyDeferred}>
      <p>Scroll to the nonzero counter.</p>
      <CountingNumber
        {...args}
        className={storyClasses.storyValue}
      />
    </div>
  ),
};
export const Currency: Story = {
  render: () => (
    <div className={storyClasses.storyValue}>
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
    <div className={storyClasses.storyValue}>
      <CountingNumber
        number={100}
        fromNumber={25}
      />
      %
    </div>
  ),
};
export const Large: Story = {args: {number: 1_000_000, className: storyClasses.storyValue}};
