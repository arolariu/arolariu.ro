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
      <p className='text-xs text-muted-foreground'>Minimum: 1, Maximum: 10</p>
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
      <p className='text-xs text-muted-foreground'>Step: 0.1 (10%)</p>
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
      <p className='text-xs text-muted-foreground'>Currency: USD</p>
    </div>
  ),
};
