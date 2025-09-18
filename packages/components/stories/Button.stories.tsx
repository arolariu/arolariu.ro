import type {Meta, StoryObj} from "@storybook/react";
import {ArrowRightIcon, BellIcon, CheckIcon, LoaderCircleIcon, PlusIcon, TrashIcon} from "lucide-react";
import {Button} from "../dist";

const meta: Meta<typeof Button> = {
  title: "Design System/Buttons/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
**Button Component**

Renders an interactive button element, providing consistent styling and behavior. Built using \`@radix-ui/react-slot\` for optional rendering as a child element and \`cva\` for managing variants.

**Core Component:**
*   \`<Button>\`: The primary component. Renders as a standard HTML \`<button>\` by default.

**Key Features:**
*   **Variants**: Supports multiple visual styles via the \`variant\` prop:
    *   \`default\`: Standard filled button.
    *   \`destructive\`: Styled for actions with negative consequences.
    *   \`outline\`: Button with a border and transparent background.
    *   \`secondary\`: Less prominent style than default.
    *   \`ghost\`: Minimal styling, often used for actions within other components.
    *   \`link\`: Styled like a hyperlink.
*   **Sizes**: Control padding and font size using the \`size\` prop:
    *   \`default\`: Standard size.
    *   \`sm\`: Small size.
    *   \`lg\`: Large size.
    *   \`icon\`: Optimized for containing only an icon (square aspect ratio).
*   **Composition**: Can render as its child element using the \`asChild\` prop. This is useful for integrating with routing libraries (e.g., \`<Button asChild><Link to="/home">Home</Link></Button>\`) while retaining button styles.
*   **States**: Includes styles for hover, focus, active, and disabled states. The \`disabled\` prop makes the button non-interactive.
*   **Accessibility**: Provides clear focus indicators and uses the native \`<button>\` element for inherent accessibility, unless \`asChild\` is used.

See the [shadcn/ui Button documentation](https://ui.shadcn.com/docs/components/button) for more details and examples.
        `,
      },
    },
  },
  argTypes: {
    variant: {
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
      control: {type: "select"},
    },
    size: {
      options: ["default", "sm", "lg", "icon"],
      control: {type: "select"},
    },
    asChild: {
      control: "boolean",
      description: "Render as the child component instead of a <button>.",
      table: {
        defaultValue: {summary: "false"},
      },
    },
    disabled: {
      control: "boolean",
      description: "Disable the button, making it non-interactive.",
      table: {
        defaultValue: {summary: "false"},
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

// Default button
export const Default: Story = {
  args: {
    children: "Click me",
  },
  parameters: {
    docs: {
      description: {
        story: "The default button style.",
      },
    },
  },
};

// All button variants
export const AllVariants: Story = {
  parameters: {
    docs: {
      description: {
        story: "Showcase of all available button variants.",
      },
    },
  },
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button variant='default'>Default</Button>
      <Button variant='destructive'>Destructive</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='link'>Link</Button>
    </div>
  ),
};

// Button sizes
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates the different button sizes: `sm`, `default`, `lg`, and `icon`.",
      },
    },
  },
  render: () => (
    <div className='flex flex-wrap items-center gap-4'>
      <Button size='sm'>Small</Button>
      <Button size='default'>Default</Button>
      <Button size='lg'>Large</Button>
      <Button size='icon'>
        <PlusIcon />
      </Button>
    </div>
  ),
};

// Buttons with icons
export const WithIcons: Story = {
  parameters: {
    docs: {
      description: {
        story: "Examples of buttons containing icons alongside text.",
      },
    },
  },
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button>
        <BellIcon />
        Notifications
      </Button>
      <Button variant='outline'>
        <CheckIcon />
        Confirm
      </Button>
      <Button variant='destructive'>
        <TrashIcon />
        Delete
      </Button>
      <Button variant='secondary'>
        Next
        <ArrowRightIcon />
      </Button>
    </div>
  ),
};

// Icon buttons
export const IconButtons: Story = {
  parameters: {
    docs: {
      description: {
        story: "Buttons that contain only an icon, typically used for toolbars or compact UIs. Requires `size='icon'`.",
      },
    },
  },
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button
        size='icon'
        variant='default'>
        <PlusIcon />
        <span className='sr-only'>Add item</span>
      </Button>
      <Button
        size='icon'
        variant='outline'>
        <CheckIcon />
        <span className='sr-only'>Confirm</span>
      </Button>
      <Button
        size='icon'
        variant='destructive'>
        <TrashIcon />
        <span className='sr-only'>Delete</span>
      </Button>
      <Button
        size='icon'
        variant='secondary'>
        <ArrowRightIcon />
        <span className='sr-only'>Next</span>
      </Button>
      <Button
        size='icon'
        variant='ghost'>
        <BellIcon />
        <span className='sr-only'>Notifications</span>
      </Button>
    </div>
  ),
};

// Disabled state
export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
  parameters: {
    docs: {
      description: {
        story: "Demonstrates the appearance of buttons in the disabled state across different variants.",
      },
    },
  },
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button disabled>Disabled</Button>
      <Button
        disabled
        variant='destructive'>
        Disabled
      </Button>
      <Button
        disabled
        variant='outline'>
        Disabled
      </Button>
      <Button
        disabled
        variant='secondary'>
        Disabled
      </Button>
      <Button
        disabled
        variant='ghost'>
        Disabled
      </Button>
      <Button
        disabled
        variant='link'>
        Disabled
      </Button>
    </div>
  ),
};

// Loading state
export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Example of buttons indicating a loading or busy state. This typically involves adding an animated icon and disabling the button.",
      },
    },
  },
  render: function LoadingButtons() {
    return (
      <div className='flex flex-wrap gap-4'>
        <Button disabled>
          <LoaderCircleIcon className='mr-2 size-4 animate-spin' />
          Loading
        </Button>
        <Button
          disabled
          variant='destructive'>
          <LoaderCircleIcon className='mr-2 size-4 animate-spin' />
          Loading
        </Button>
        <Button
          disabled
          variant='outline'>
          <LoaderCircleIcon className='mr-2 size-4 animate-spin' />
          Loading
        </Button>
      </div>
    );
  },
};

// As child example (with anchor)
export const AsChild: Story = {
  parameters: {
    docs: {
      description: {
        story: "Using the `asChild` prop to render an anchor tag (`<a>`) styled as a button.",
      },
    },
  },
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button asChild>
        <a href='#'>Link that looks like a button</a>
      </Button>
      <Button
        variant='outline'
        asChild>
        <a href='#'>Outline link</a>
      </Button>
    </div>
  ),
};

// Button group
export const ButtonGroup: Story = {
  parameters: {
    docs: {
      description: {
        story: "An example showing how buttons can be grouped visually, often using a container with specific styling.",
      },
    },
  },
  render: () => (
    <div className='inline-flex flex-wrap gap-1 rounded-md border p-1'>
      <Button variant='secondary'>Profile</Button>
      <Button variant='ghost'>Settings</Button>
      <Button variant='ghost'>Messages</Button>
    </div>
  ),
};

// Custom styled button
export const CustomStyled: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates applying custom CSS classes to override or extend the default button styles.",
      },
    },
  },
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'>
        <PlusIcon className='size-4' />
        Custom Blue
      </Button>
      <Button className='bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'>Gradient</Button>
    </div>
  ),
};
