import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "./number-field";
const storyStyles = `
.ac-story-number-field-currencyStack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ac-story-number-field-currencyLabel {
  font-size: 14px;
  font-weight: 500;
}

.ac-story-number-field-currencyPositioner {
  position: relative;
}

.ac-story-number-field-currencyPrefix {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: #6b7280;
  z-index: 1;
}

.ac-story-number-field-currencyInput {
  padding-left: 28px;
}

.ac-story-number-field-description {
  font-size: 12px;
  color: #6b7280;
}

.ac-story-number-field-percentageStack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ac-story-number-field-percentageLabel {
  font-size: 14px;
  font-weight: 500;
}

.ac-story-number-field-rangeLabels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
}

.ac-story-number-field-progressTrack {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.ac-story-number-field-progressIndicator {
  width: 50%;
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s;
}
`;

const storyClasses = {
  currencyStack: "ac-story-number-field-currencyStack",
  currencyLabel: "ac-story-number-field-currencyLabel",
  currencyPositioner: "ac-story-number-field-currencyPositioner",
  currencyPrefix: "ac-story-number-field-currencyPrefix",
  currencyInput: "ac-story-number-field-currencyInput",
  description: "ac-story-number-field-description",
  percentageStack: "ac-story-number-field-percentageStack",
  percentageLabel: "ac-story-number-field-percentageLabel",
  rangeLabels: "ac-story-number-field-rangeLabels",
  progressTrack: "ac-story-number-field-progressTrack",
  progressIndicator: "ac-story-number-field-progressIndicator",
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
        format={{style: "percent"}}>
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
        format={{
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
    <div className={storyClasses.currencyStack}>
      <label className={storyClasses.currencyLabel}>Budget Amount</label>
      <div className={storyClasses.currencyPositioner}>
        <span className={storyClasses.currencyPrefix}>$</span>
        <NumberField
          defaultValue={1000}
          min={0}
          step={50}
          format={{
            style: "decimal",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput
              aria-label='Budget'
              className={storyClasses.currencyInput}
            />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>
      <p className={storyClasses.description}>Set your monthly budget in USD</p>
    </div>
  ),
};

/**
 * Number field constrained between 0 and 100 with validation.
 */
export const MinMax: Story = {
  render: () => (
    <div className={storyClasses.percentageStack}>
      <label className={storyClasses.percentageLabel}>Progress Percentage</label>
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
      <div className={storyClasses.rangeLabels}>
        <span>Min: 0%</span>
        <span>Max: 100%</span>
      </div>
      <div className={storyClasses.progressTrack}>
        <div className={storyClasses.progressIndicator} />
      </div>
    </div>
  ),
};

/**
 * Localized decimal entry with a drag-to-adjust area and state-aware controls.
 */
export const WithScrubArea: Story = {
  render: () => (
    <NumberField
      defaultValue={2.5}
      min={0}
      max={10}
      step={0.5}
      locale='de-DE'>
      <NumberFieldGroup>
        <NumberFieldScrubArea>Drag</NumberFieldScrubArea>
        <NumberFieldDecrement />
        <NumberFieldInput
          aria-label='Quantity'
          render={(props, state) => (
            <input
              {...props}
              aria-description={`Current quantity: ${state.value ?? "empty"}`}
            />
          )}
        />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  ),
};
