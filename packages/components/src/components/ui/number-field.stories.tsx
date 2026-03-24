import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput} from "./number-field";

const meta = {
  title: "Components/Forms/NumberField",
  component: NumberField,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default number field with increment/decrement buttons.
 */
export const Default: Story = {
  render: () => (
    <NumberField defaultValue={0}>
      <NumberFieldGroup>
        <NumberFieldDecrement />
        <NumberFieldInput aria-label='Quantity' />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  ),
};

/**
 * Number field with min and max constraints.
 */
export const WithLimits: Story = {
  render: () => (
    <div className='space-y-2'>
      <label className='text-sm font-medium'>Select quantity (1-10)</label>
      <NumberField
        defaultValue={1}
        min={1}
        max={10}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-label='Quantity' />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <p className='text-muted-foreground text-xs'>Minimum: 1, Maximum: 10</p>
    </div>
  ),
};

/**
 * Number field with step increment for decimal values.
 */
export const WithStep: Story = {
  render: () => (
    <div className='space-y-2'>
      <label className='text-sm font-medium'>Adjust opacity</label>
      <NumberField
        defaultValue={1.0}
        min={0}
        max={1}
        step={0.1}
        formatOptions={{style: "percent"}}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-label='Opacity' />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <p className='text-muted-foreground text-xs'>Step: 0.1 (10%)</p>
    </div>
  ),
};

/**
 * Number field for currency input with custom formatting.
 */
export const Currency: Story = {
  render: () => (
    <div className='space-y-2'>
      <label className='text-sm font-medium'>Enter amount</label>
      <NumberField
        defaultValue={100}
        min={0}
        step={1}
        formatOptions={{
          style: "currency",
          currency: "USD",
        }}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-label='Amount' />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <p className='text-muted-foreground text-xs'>Currency: USD</p>
    </div>
  ),
};

/**
 * Number field showing currency with $ prefix.
 */
export const WithCurrency: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <label style={{fontSize: "14px", fontWeight: 500}}>Budget Amount</label>
      <div style={{position: "relative"}}>
        <span
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "14px",
            color: "#6b7280",
            zIndex: 1,
          }}>
          $
        </span>
        <NumberField
          defaultValue={1000}
          min={0}
          step={50}
          formatOptions={{
            style: "decimal",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput
              aria-label='Budget'
              style={{paddingLeft: "28px"}}
            />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>
      <p style={{fontSize: "12px", color: "#6b7280"}}>Set your monthly budget in USD</p>
    </div>
  ),
};

/**
 * Number field constrained between 0 and 100 with validation.
 */
export const MinMax: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <label style={{fontSize: "14px", fontWeight: 500}}>Progress Percentage</label>
      <NumberField
        defaultValue={50}
        min={0}
        max={100}
        step={5}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-label='Percentage' />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <div style={{display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280"}}>
        <span>Min: 0%</span>
        <span>Max: 100%</span>
      </div>
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#e5e7eb",
          borderRadius: "4px",
          overflow: "hidden",
        }}>
        <div
          style={{
            width: "50%",
            height: "100%",
            background: "#3b82f6",
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  ),
};
