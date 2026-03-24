import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {CountingNumber} from "./counting-number";

const meta = {
  title: "Components/Data Display/CountingNumber",
  component: CountingNumber,
  tags: ["autodocs"],
  argTypes: {
    number: {
      control: "number",
      description: "Final numeric value to animate toward",
    },
    fromNumber: {
      control: "number",
      description: "Initial numeric value used before the spring animation starts",
    },
    decimalPlaces: {
      control: "number",
      description: "Number of decimal places rendered during the animation",
    },
  },
} satisfies Meta<typeof CountingNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Integer counting animation from 0 to 1000.
 */
export const Integer: Story = {
  args: {
    number: 1000,
    fromNumber: 0,
  },
};

/**
 * Decimal counting animation with two decimal places.
 */
export const Decimal: Story = {
  args: {
    number: 99.99,
    fromNumber: 0,
    decimalPlaces: 2,
  },
};

/**
 * Counting animation that starts when element enters viewport.
 */
export const InView: Story = {
  args: {
    number: 5000,
    fromNumber: 0,
    inView: true,
    inViewOnce: true,
  },
  render: (args) => (
    <div style={{marginTop: "200vh", padding: "2rem", background: "#f3f4f6", borderRadius: "8px", textAlign: "center"}}>
      <p style={{fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem"}}>Scroll down to see animation</p>
      <div style={{fontSize: "3rem", fontWeight: "bold", color: "#111827"}}>
        <CountingNumber {...args} />
      </div>
    </div>
  ),
};

/**
 * Currency counter with dollar prefix counting to $1,234.56.
 */
export const Currency: Story = {
  render: () => (
    <div style={{padding: "2rem", textAlign: "center"}}>
      <div style={{fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem"}}>Total Revenue</div>
      <div style={{fontSize: "3rem", fontWeight: "bold", color: "#059669"}}>
        $
        <CountingNumber
          number={1234.56}
          fromNumber={0}
          decimalPlaces={2}
        />
      </div>
    </div>
  ),
};

/**
 * Percentage counter from 0 to 100 with % suffix.
 */
export const Percentage: Story = {
  render: () => (
    <div style={{padding: "2rem", textAlign: "center"}}>
      <div style={{fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem"}}>Completion Rate</div>
      <div style={{fontSize: "3rem", fontWeight: "bold", color: "#3b82f6"}}>
        <CountingNumber
          number={100}
          fromNumber={0}
          decimalPlaces={0}
        />
        %
      </div>
    </div>
  ),
};

/**
 * Large number counter to 1,000,000 with comma separators.
 */
export const Large: Story = {
  render: () => (
    <div style={{padding: "2rem", textAlign: "center"}}>
      <div style={{fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem"}}>Active Users</div>
      <div style={{fontSize: "3rem", fontWeight: "bold", color: "#8b5cf6"}}>
        <CountingNumber
          number={1000000}
          fromNumber={0}
          decimalPlaces={0}
        />
      </div>
      <div style={{fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem"}}>(1 million milestone reached!)</div>
    </div>
  ),
};
