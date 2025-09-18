import type {Meta, StoryObj} from "@storybook/react";
import React from "react";
import {RadioGroup, RadioGroupItem} from "../dist";

const meta: Meta<typeof RadioGroup> = {
  title: "Design System/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Radio Group Component**

A set of checkable buttons (radio buttons) where only one option can be selected at a time within the group. Built upon the Radix UI Radio Group primitive.

**Core Components (from Radix UI):**
*   \`<RadioGroup>\`: The root component (\`<div>\` with \`role="radiogroup"\`) that groups the radio items and manages the selected value. Accepts props like \`value\`, \`defaultValue\`, \`onValueChange\`, \`disabled\`, \`required\`, \`orientation\`, \`loop\`, \`name\`.
*   \`<RadioGroupItem>\`: Represents a single radio button input (\`<button>\` with \`role="radio"\`). Requires a unique \`value\` prop. Includes a \`<RadioGroupIndicator>\` internally. Must be associated with a \`<label>\`.
*   \`<RadioGroupIndicator>\`: (Used internally by \`<RadioGroupItem>\`) The visual element (often a dot) that indicates the selected state.

**Key Features & Props (from Radix UI):**
*   **Single Selection**: Enforces that only one \`<RadioGroupItem>\` within the group can be selected.
*   **State Management**: Supports controlled (\`value\`, \`onValueChange\`) and uncontrolled (\`defaultValue\`) state.
*   **Accessibility**:
    *   Provides correct ARIA roles (\`radiogroup\`, \`radio\`) and states (\`aria-checked\`, \`aria-disabled\`).
    *   Full keyboard navigation support (Arrow keys to move between items, Space key to select).
    *   Requires associated \`<label>\` elements for each \`<RadioGroupItem>\` (using \`htmlFor\` and matching \`id\`) for screen reader accessibility.
*   **Layout**: Supports \`orientation\` ('horizontal' or 'vertical') for layout direction.
*   **Form Integration**: Includes \`name\` prop for form submission and \`required\` prop for validation.

See the [shadcn/ui Radio Group documentation](https://ui.shadcn.com/docs/components/radio-group) and the [Radix UI Radio Group documentation](https://www.radix-ui.com/primitives/docs/components/radio-group) for comprehensive details.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof RadioGroup>;

// Basic radio group
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A basic RadioGroup with multiple options. Users can select only one option at a time.",
      },
    },
  },
  render: () => (
    <RadioGroup defaultValue='option-one'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-one'
          id='option-one'
        />
        <label
          htmlFor='option-one'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Option One
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-two'
          id='option-two'
        />
        <label
          htmlFor='option-two'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Option Two
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-three'
          id='option-three'
        />
        <label
          htmlFor='option-three'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Option Three
        </label>
      </div>
    </RadioGroup>
  ),
};

// Radio group with disabled item
export const WithDisabledItem: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows a RadioGroup where one of the options is disabled and cannot be selected.",
      },
    },
  },
  render: () => (
    <RadioGroup defaultValue='default'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='default'
          id='radio-default'
        />
        <label
          htmlFor='radio-default'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Default
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='comfortable'
          id='radio-comfortable'
        />
        <label
          htmlFor='radio-comfortable'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Comfortable
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='compact'
          id='radio-compact'
          disabled
        />
        <label
          htmlFor='radio-compact'
          className='cursor-not-allowed text-sm leading-none font-medium opacity-70'>
          Compact (Disabled)
        </label>
      </div>
    </RadioGroup>
  ),
};

// Horizontal layout
export const HorizontalLayout: Story = {
  parameters: {
    docs: {
      description: {
        story: "Displays the RadioGroup options horizontally instead of the default vertical layout.",
      },
    },
  },
  render: () => (
    <RadioGroup
      defaultValue='option-one'
      className='flex gap-6'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-one'
          id='horizontal-option-one'
        />
        <label
          htmlFor='horizontal-option-one'
          className='text-sm leading-none font-medium'>
          Option One
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-two'
          id='horizontal-option-two'
        />
        <label
          htmlFor='horizontal-option-two'
          className='text-sm leading-none font-medium'>
          Option Two
        </label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem
          value='option-three'
          id='horizontal-option-three'
        />
        <label
          htmlFor='horizontal-option-three'
          className='text-sm leading-none font-medium'>
          Option Three
        </label>
      </div>
    </RadioGroup>
  ),
};

// Card-styled radio group
export const CardRadioGroup: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates a card-styled RadioGroup where each option is presented as a card with additional details.",
      },
    },
  },
  render: () => (
    <RadioGroup
      defaultValue='card1'
      className='grid grid-cols-3 gap-4'>
      <div>
        <label
          htmlFor='card1'
          className='flex cursor-pointer flex-col items-center justify-between rounded-md border border-neutral-200 bg-white p-4 text-neutral-950 transition-all hover:border-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:border-neutral-50 [&:has([data-state=checked])]:border-neutral-950 dark:[&:has([data-state=checked])]:border-neutral-50'>
          <RadioGroupItem
            value='card1'
            id='card1'
            className='sr-only'
          />
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mb-3'>
            <rect
              width='20'
              height='14'
              x='2'
              y='5'
              rx='2'
            />
            <line
              x1='2'
              x2='22'
              y1='10'
              y2='10'
            />
          </svg>
          <div className='text-center'>
            <p className='text-sm font-medium'>Credit Card</p>
            <p className='text-xs opacity-70'>Pay with credit card</p>
          </div>
        </label>
      </div>
      <div>
        <label
          htmlFor='card2'
          className='flex cursor-pointer flex-col items-center justify-between rounded-md border border-neutral-200 bg-white p-4 text-neutral-950 transition-all hover:border-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:border-neutral-50 [&:has([data-state=checked])]:border-neutral-950 dark:[&:has([data-state=checked])]:border-neutral-50'>
          <RadioGroupItem
            value='card2'
            id='card2'
            className='sr-only'
          />
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mb-3'>
            <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10' />
          </svg>
          <div className='text-center'>
            <p className='text-sm font-medium'>PayPal</p>
            <p className='text-xs opacity-70'>Pay with PayPal</p>
          </div>
        </label>
      </div>
      <div>
        <label
          htmlFor='card3'
          className='flex cursor-pointer flex-col items-center justify-between rounded-md border border-neutral-200 bg-white p-4 text-neutral-950 transition-all hover:border-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:border-neutral-50 [&:has([data-state=checked])]:border-neutral-950 dark:[&:has([data-state=checked])]:border-neutral-50'>
          <RadioGroupItem
            value='card3'
            id='card3'
            className='sr-only'
          />
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mb-3'>
            <rect
              width='20'
              height='10'
              x='2'
              y='7'
              rx='2'
            />
            <path d='M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' />
          </svg>
          <div className='text-center'>
            <p className='text-sm font-medium'>Apple Pay</p>
            <p className='text-xs opacity-70'>Pay with Apple</p>
          </div>
        </label>
      </div>
    </RadioGroup>
  ),
};

// Form example with validation
export const FormExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An example of a controlled RadioGroup where the selected value is managed by React state, allowing for interaction tracking or conditional logic based on the selection.",
      },
    },
  },
  render: function FormRadioGroup() {
    const [selected, setSelected] = React.useState<string>("email");

    return (
      <form className='w-full max-w-sm space-y-4'>
        <div className='space-y-2'>
          <h4 className='text-sm font-medium'>Preferred contact method</h4>
          <RadioGroup
            value={selected}
            onValueChange={setSelected}>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem
                value='email'
                id='form-email'
              />
              <label
                htmlFor='form-email'
                className='text-sm leading-none'>
                Email
              </label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem
                value='phone'
                id='form-phone'
              />
              <label
                htmlFor='form-phone'
                className='text-sm leading-none'>
                Phone
              </label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem
                value='mail'
                id='form-mail'
              />
              <label
                htmlFor='form-mail'
                className='text-sm leading-none'>
                Mail
              </label>
            </div>
          </RadioGroup>
        </div>

        {selected === "email" && (
          <div className='space-y-2'>
            <label
              htmlFor='email-input'
              className='text-sm font-medium'>
              Email address
            </label>
            <input
              id='email-input'
              type='email'
              className='w-full rounded-md border border-neutral-200 p-2 text-sm focus:ring-2 focus:ring-neutral-950/20 focus:outline-none'
              placeholder='your@email.com'
            />
          </div>
        )}

        {selected === "phone" && (
          <div className='space-y-2'>
            <label
              htmlFor='phone-input'
              className='text-sm font-medium'>
              Phone number
            </label>
            <input
              id='phone-input'
              type='tel'
              className='w-full rounded-md border border-neutral-200 p-2 text-sm focus:ring-2 focus:ring-neutral-950/20 focus:outline-none'
              placeholder='(123) 456-7890'
            />
          </div>
        )}

        {selected === "mail" && (
          <div className='space-y-2'>
            <label
              htmlFor='address-input'
              className='text-sm font-medium'>
              Mailing address
            </label>
            <textarea
              id='address-input'
              className='w-full rounded-md border border-neutral-200 p-2 text-sm focus:ring-2 focus:ring-neutral-950/20 focus:outline-none'
              placeholder='Your mailing address'
              rows={3}
            />
          </div>
        )}
      </form>
    );
  },
};
