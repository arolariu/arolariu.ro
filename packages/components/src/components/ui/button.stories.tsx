import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";

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
      description: "Set false for non-button render targets",
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

export const NonNative = {
  args: {
    children: "Keyboard action",
    nativeButton: false,
    render: <div />,
  } satisfies Button.Props,
} satisfies Story;

export const Navigation = {
  args: {
    children: "Read documentation",
    nativeButton: false,
    render: <a href='#documentation' />,
    variant: "link",
  } satisfies Button.Props,
} satisfies Story;

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

export const LegacyChild: Story = {
  args: {
    asChild: true,
    children: <a href='#legacy'>Legacy navigation</a>,
    variant: "outline",
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled",
    variant: "default",
    size: "default",
    disabled: true,
  },
};
