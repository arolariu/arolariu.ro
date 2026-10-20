import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button, buttonVariants} from "./button";

const meta = {
  title: "Components/Actions/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    componentSubtitle: "✅ Stable",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
      description: "Visual style variant",
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
      description: "Size preset",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button should ignore user interaction",
    },
    nativeButton: {
      control: "boolean",
      description: "Set false for non-link render targets that take button semantics, such as <div>; style links with buttonVariants()",
    },
    focusableWhenDisabled: {
      control: "boolean",
      description: "Keeps an unavailable action in the tab order without allowing activation",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
    size: "default",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
    size: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
    size: "default",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
    size: "default",
  },
};

export const Link: Story = {
  args: {
    children: "Link",
    variant: "link",
    size: "default",
  },
};

export const Small: Story = {
  args: {
    children: "Small",
    variant: "default",
    size: "sm",
  },
};

export const ExtraSmall: Story = {
  args: {
    children: "Extra small",
    size: "xs",
  },
};

export const Large: Story = {
  args: {
    children: "Large",
    variant: "default",
    size: "lg",
  },
};

export const Icon: Story = {
  args: {
    children: "🚀",
    variant: "default",
    size: "icon",
    "aria-label": "Launch",
  },
};

export const IconExtraSmall = {
  args: {
    children: "＋",
    size: "icon-xs",
    "aria-label": "Add",
  } satisfies Button.Props,
} satisfies Story;

export const IconSmall: Story = {
  args: {
    children: "＋",
    size: "icon-sm",
    "aria-label": "Add",
  },
};

export const IconLarge: Story = {
  args: {
    children: "＋",
    size: "icon-lg",
    "aria-label": "Add",
  },
};

/** A non-link element that takes button semantics: `nativeButton={false}` adds the role, focus and Enter/Space activation. */
export const NonNative = {
  args: {
    children: "Keyboard action",
    nativeButton: false,
    render: <div />,
  } satisfies Button.Props,
} satisfies Story;

/**
 * Links are not buttons: style a native `<a href>` with `buttonVariants()` instead of rendering it through Button,
 * so it is announced and listed as a link and follows on Enter, not Space.
 */
export const Navigation: Story = {
  args: {
    variant: "link",
    size: "default",
  },
  render: ({variant, size}) => (
    <a
      href='#documentation'
      className={buttonVariants({variant, size})}>
      Read documentation
    </a>
  ),
};

export const FocusableDisabled = {
  args: {
    children: "Currently unavailable",
    disabled: true,
    focusableWhenDisabled: true,
    render: (props, state) => (
      <button
        {...props}
        aria-label={`${state.variant} action ${state.disabled ? "unavailable" : "available"}`}
      />
    ),
  } satisfies Button.Props,
} satisfies Story;

/** Any visual variant can style a native link; the element stays an `<a href>` with link semantics. */
export const RenderedNavigation: Story = {
  args: {
    variant: "outline",
    size: "default",
  },
  render: ({variant, size}) => (
    <a
      href='#navigation'
      className={buttonVariants({variant, size})}>
      Open navigation
    </a>
  ),
};

export const Disabled: Story = {
  args: {
    children: "Disabled",
    variant: "default",
    size: "default",
    disabled: true,
  },
};
