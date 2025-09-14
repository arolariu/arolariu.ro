import type {Meta, StoryObj} from "@storybook/react";
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue} from "../dist";

const meta: Meta<typeof Select> = {
  title: "Design System/Select",
  component: Select,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Select Component**

Displays a dropdown list of options, allowing the user to select a single value. Built upon the Radix UI Select primitive, ensuring accessibility and robust functionality for dropdown controls.

**Core Components (from Radix UI):**
*   \`<Select>\`: The root component managing state and context. Accepts props like \`value\`, \`defaultValue\`, \`onValueChange\`, \`open\`, \`defaultOpen\`, \`onOpenChange\`, \`disabled\`, \`required\`, \`name\`, \`dir\`.
*   \`<SelectTrigger>\`: The button element that toggles the dropdown's visibility and displays the selected value (\`<SelectValue>\`). Handles ARIA attributes (\`aria-haspopup\`, \`aria-expanded\`, \`aria-controls\`, \`aria-labelledby\`).
*   \`<SelectValue>\`: Displays the selected value within the trigger. Can have a \`placeholder\` prop for when no value is selected.
*   \`<SelectPortal>\`: (Optional) Renders the dropdown content into a specific part of the DOM. \`<SelectContent>\` uses this by default.
*   \`<SelectContent>\`: The container (\`<div>\`) for the list of options that appears as a popover. Handles positioning, styling, keyboard navigation, and accessibility attributes (\`role="listbox"\`). Accepts props like \`position\` ('item-aligned' or 'popper'), \`side\`, \`sideOffset\`, \`align\`, \`alignOffset\`.
*   \`<SelectViewport>\`: (Used internally by \`<SelectContent>\`) The scrollable container for the items.
*   \`<SelectGroup>\`: A semantic container (\`<div>\`) to group related options. Can be associated with a \`<SelectLabel>\`.
*   \`<SelectLabel>\`: A non-interactive label (\`<div>\`) displayed within the content, typically associated with a \`<SelectGroup>\`.
*   \`<SelectItem>\`: Represents a single selectable option (\`<div>\` with \`role="option"\`). Requires a unique \`value\` prop. Handles selection state and keyboard interaction. Accepts \`disabled\`. Includes \`<SelectItemText>\` and optionally \`<SelectItemIndicator>\`.
*   \`<SelectItemText>\`: Displays the text content of an option.
*   \`<SelectItemIndicator>\`: (Optional) A visual element (e.g., checkmark) displayed next to the selected item(s).
*   \`<SelectSeparator>\`: A visual divider (\`<div>\` with \`role="separator"\`) between items or groups.
*   \`<SelectScrollUpButton>\`, \`<SelectScrollDownButton>\`: (Optional) Buttons displayed within the content when items overflow, allowing scrolling via click.

**Key Features:**
*   **Accessibility**: Full keyboard navigation (Arrow keys, Home, End, Enter, Space, Type-ahead), focus management, and ARIA roles/attributes (\`listbox\`, \`option\`). Requires association with an external \`<Label>\` for full context.
*   **State Management**: Supports controlled (\`value\`, \`onValueChange\`) and uncontrolled (\`defaultValue\`) state.
*   **Positioning**: Customizable positioning of the dropdown content relative to the trigger.
*   **Type-Ahead**: Allows users to quickly navigate options by typing characters.
*   **Form Integration**: Includes \`name\` and \`required\` props.

See the [shadcn/ui Select documentation](https://ui.shadcn.com/docs/components/select) and the [Radix UI Select documentation](https://www.radix-ui.com/primitives/docs/components/select) for comprehensive details.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Select>;

// Basic select
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A basic Select dropdown with several options. The selected value is displayed on the trigger button.",
      },
    },
  },
  render: () => (
    <Select>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='Select a fruit' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem value='banana'>Banana</SelectItem>
        <SelectItem value='orange'>Orange</SelectItem>
        <SelectItem value='grape'>Grape</SelectItem>
        <SelectItem value='pineapple'>Pineapple</SelectItem>
      </SelectContent>
    </Select>
  ),
};

// Select with groups
export const WithGroups: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how to group related options within the Select dropdown using `SelectGroup` and `SelectLabel`.",
      },
    },
  },
  render: () => (
    <Select>
      <SelectTrigger className='w-[250px]'>
        <SelectValue placeholder='Select a timezone' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>North America</SelectLabel>
          <SelectItem value='est'>Eastern Standard Time (EST)</SelectItem>
          <SelectItem value='cst'>Central Standard Time (CST)</SelectItem>
          <SelectItem value='mst'>Mountain Standard Time (MST)</SelectItem>
          <SelectItem value='pst'>Pacific Standard Time (PST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Europe & Africa</SelectLabel>
          <SelectItem value='gmt'>Greenwich Mean Time (GMT)</SelectItem>
          <SelectItem value='cet'>Central European Time (CET)</SelectItem>
          <SelectItem value='eet'>Eastern European Time (EET)</SelectItem>
          <SelectItem value='sast'>South Africa Standard Time (SAST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Asia</SelectLabel>
          <SelectItem value='ist'>India Standard Time (IST)</SelectItem>
          <SelectItem value='cst_china'>China Standard Time (CST)</SelectItem>
          <SelectItem value='jst'>Japan Standard Time (JST)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

// Disabled select
export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story: "A Select component that is disabled, preventing the user from opening the dropdown or changing the selection.",
      },
    },
  },
  render: () => (
    <Select disabled>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='Select a fruit' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem value='banana'>Banana</SelectItem>
        <SelectItem value='orange'>Orange</SelectItem>
      </SelectContent>
    </Select>
  ),
};

// Small size
export const Small: Story = {
  parameters: {
    docs: {
      description: {
        story: "A basic Select dropdown with a smaller trigger size.",
      },
    },
  },
  render: () => (
    <Select>
      <SelectTrigger
        className='w-[180px]'
        size='sm'>
        <SelectValue placeholder='Small select' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem value='banana'>Banana</SelectItem>
        <SelectItem value='orange'>Orange</SelectItem>
      </SelectContent>
    </Select>
  ),
};

// With disabled items
export const WithDisabledItems: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows a Select dropdown where specific options are disabled and cannot be selected.",
      },
    },
  },
  render: () => (
    <Select>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='Select a fruit' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem
          value='banana'
          disabled>
          Banana (Unavailable)
        </SelectItem>
        <SelectItem value='orange'>Orange</SelectItem>
        <SelectItem
          value='grape'
          disabled>
          Grape (Unavailable)
        </SelectItem>
        <SelectItem value='pineapple'>Pineapple</SelectItem>
      </SelectContent>
    </Select>
  ),
};

// With label (using standard HTML)
export const WithLabel: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates how to use a standard HTML label with the Select component.",
      },
    },
  },
  render: () => (
    <div className='grid w-full max-w-sm gap-1.5'>
      <label
        htmlFor='country'
        className='text-sm font-medium'>
        Country
      </label>
      <Select>
        <SelectTrigger
          className='w-full'
          id='country'>
          <SelectValue placeholder='Select a country' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='us'>United States</SelectItem>
          <SelectItem value='uk'>United Kingdom</SelectItem>
          <SelectItem value='ca'>Canada</SelectItem>
          <SelectItem value='au'>Australia</SelectItem>
          <SelectItem value='de'>Germany</SelectItem>
          <SelectItem value='fr'>France</SelectItem>
          <SelectItem value='jp'>Japan</SelectItem>
          <SelectItem value='in'>India</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
