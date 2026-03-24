import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {RadioGroup, RadioGroupItem} from "./radio-group";

const meta = {
  title: "Components/Forms/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default radio group with multiple options.
 */
export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue='option-1'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-1'
          id='option-1'
        />
        <label
          htmlFor='option-1'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Option 1
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-2'
          id='option-2'
        />
        <label
          htmlFor='option-2'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Option 2
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-3'
          id='option-3'
        />
        <label
          htmlFor='option-3'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Option 3
        </label>
      </div>
    </RadioGroup>
  ),
};

/**
 * Radio group with descriptions for each option.
 */
export const WithDescriptions: Story = {
  render: () => (
    <RadioGroup
      defaultValue='plan-free'
      className='space-y-3'>
      <div className='flex items-start space-x-3 rounded-lg border p-4'>
        <RadioGroupItem
          value='plan-free'
          id='plan-free'
        />
        <div className='space-y-1 leading-none'>
          <label
            htmlFor='plan-free'
            className='text-sm font-medium'>
            Free Plan
          </label>
          <p className='text-muted-foreground text-sm'>Perfect for trying out our service. Limited features.</p>
        </div>
      </div>
      <div className='flex items-start space-x-3 rounded-lg border p-4'>
        <RadioGroupItem
          value='plan-pro'
          id='plan-pro'
        />
        <div className='space-y-1 leading-none'>
          <label
            htmlFor='plan-pro'
            className='text-sm font-medium'>
            Pro Plan
          </label>
          <p className='text-muted-foreground text-sm'>Best for professionals. All features included.</p>
        </div>
      </div>
      <div className='flex items-start space-x-3 rounded-lg border p-4'>
        <RadioGroupItem
          value='plan-enterprise'
          id='plan-enterprise'
        />
        <div className='space-y-1 leading-none'>
          <label
            htmlFor='plan-enterprise'
            className='text-sm font-medium'>
            Enterprise Plan
          </label>
          <p className='text-muted-foreground text-sm'>For large organizations. Custom solutions available.</p>
        </div>
      </div>
    </RadioGroup>
  ),
};

/**
 * Radio group with one disabled option.
 */
export const WithDisabled: Story = {
  render: () => (
    <RadioGroup defaultValue='option-1'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-1'
          id='r-option-1'
        />
        <label
          htmlFor='r-option-1'
          className='text-sm font-medium'>
          Available Option 1
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-2'
          id='r-option-2'
          disabled
        />
        <label
          htmlFor='r-option-2'
          className='text-sm font-medium opacity-50'>
          Unavailable Option (Disabled)
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-3'
          id='r-option-3'
        />
        <label
          htmlFor='r-option-3'
          className='text-sm font-medium'>
          Available Option 3
        </label>
      </div>
    </RadioGroup>
  ),
};

/**
 * Radio group for payment method selection with visual cards.
 */
export const PaymentMethod: Story = {
  render: () => (
    <RadioGroup
      defaultValue='card'
      className='grid grid-cols-3 gap-4'>
      <div>
        <RadioGroupItem
          value='card'
          id='payment-card'
          className='peer sr-only'
        />
        <label
          htmlFor='payment-card'
          className='border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-col items-center justify-between rounded-md border-2 p-4'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            className='mb-3 h-6 w-6'>
            <rect
              width='20'
              height='14'
              x='2'
              y='5'
              rx='2'
            />
            <path d='M2 10h20' />
          </svg>
          <span className='text-sm font-medium'>Card</span>
        </label>
      </div>
      <div>
        <RadioGroupItem
          value='paypal'
          id='payment-paypal'
          className='peer sr-only'
        />
        <label
          htmlFor='payment-paypal'
          className='border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-col items-center justify-between rounded-md border-2 p-4'>
          <svg
            role='img'
            viewBox='0 0 24 24'
            className='mb-3 h-6 w-6'
            fill='currentColor'>
            <path d='M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z' />
          </svg>
          <span className='text-sm font-medium'>PayPal</span>
        </label>
      </div>
      <div>
        <RadioGroupItem
          value='apple'
          id='payment-apple'
          className='peer sr-only'
        />
        <label
          htmlFor='payment-apple'
          className='border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-col items-center justify-between rounded-md border-2 p-4'>
          <svg
            role='img'
            viewBox='0 0 24 24'
            className='mb-3 h-6 w-6'
            fill='currentColor'>
            <path d='M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701' />
          </svg>
          <span className='text-sm font-medium'>Apple</span>
        </label>
      </div>
    </RadioGroup>
  ),
};

/**
 * Radio group with all options disabled.
 */
export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue='option-1'>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <RadioGroupItem
          value='option-1'
          id='disabled-option-1'
          disabled
        />
        <label
          htmlFor='disabled-option-1'
          style={{fontSize: "0.875rem", fontWeight: 500, opacity: 0.5}}>
          Disabled Option 1
        </label>
      </div>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <RadioGroupItem
          value='option-2'
          id='disabled-option-2'
          disabled
        />
        <label
          htmlFor='disabled-option-2'
          style={{fontSize: "0.875rem", fontWeight: 500, opacity: 0.5}}>
          Disabled Option 2
        </label>
      </div>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <RadioGroupItem
          value='option-3'
          id='disabled-option-3'
          disabled
        />
        <label
          htmlFor='disabled-option-3'
          style={{fontSize: "0.875rem", fontWeight: 500, opacity: 0.5}}>
          Disabled Option 3
        </label>
      </div>
    </RadioGroup>
  ),
};
