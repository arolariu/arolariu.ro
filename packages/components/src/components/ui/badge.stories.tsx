import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Badge} from "./badge";

const meta = {
  title: "Components/Data Display/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
      description: "Visual style variant",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

/**
 * Badge with a status dot indicator.
 */
function BadgeWithDot(): React.JSX.Element {
  return (
    <div style={{display: "flex", gap: "12px", flexWrap: "wrap"}}>
      <Badge variant='default'>
        <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: "currentColor",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Active
      </Badge>
      <Badge variant='secondary'>
        <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: "#fbbf24",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Pending
      </Badge>
      <Badge variant='outline'>
        <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: "#22c55e",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Online
      </Badge>
    </div>
  );
}

export const WithDot: Story = {
  render: () => <BadgeWithDot />,
};

/**
 * Badge with larger text and padding.
 */
function LargeBadge(): React.JSX.Element {
  return (
    <div style={{display: "flex", gap: "12px", flexWrap: "wrap"}}>
      <Badge variant='default' style={{fontSize: "16px", padding: "8px 16px"}}>
        Large Default
      </Badge>
      <Badge variant='secondary' style={{fontSize: "16px", padding: "8px 16px"}}>
        Large Secondary
      </Badge>
      <Badge variant='destructive' style={{fontSize: "16px", padding: "8px 16px"}}>
        Large Destructive
      </Badge>
      <Badge variant='outline' style={{fontSize: "16px", padding: "8px 16px"}}>
        Large Outline
      </Badge>
    </div>
  );
}

export const Large: Story = {
  render: () => <LargeBadge />,
};
