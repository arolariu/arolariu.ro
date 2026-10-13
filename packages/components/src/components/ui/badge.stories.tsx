import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Badge, type BadgeProps} from "./badge";
import styles from "./badge.module.css";

const meta = {
  title: "Components/Data Display/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
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

export const Ghost = {
  args: {
    children: "Ghost",
    variant: "ghost",
  } satisfies BadgeProps,
} satisfies Story;

export const Link = {
  args: {
    children: "Release notes",
    variant: "link",
    render: <a href='#release-notes' />,
  } satisfies BadgeProps,
} satisfies Story;

export const CallbackRender = {
  args: {
    children: "Preview",
    variant: "outline",
    render: (props, state) => (
      <span
        {...props}
        aria-label={`${state.variant} badge`}
      />
    ),
  } satisfies BadgeProps,
} satisfies Story;

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
    <div className={styles.storyRow}>
      <Badge variant='default'>
        <span
          aria-hidden='true'
          className={styles.statusDot}
        />
        Active
      </Badge>
      <Badge variant='secondary'>
        <span
          aria-hidden='true'
          className={styles.statusDot}
        />
        Pending
      </Badge>
      <Badge variant='outline'>
        <span
          aria-hidden='true'
          className={styles.statusDot}
        />
        Online
      </Badge>
    </div>
  );
}

export const WithDot = {
  render: () => <BadgeWithDot />,
} satisfies Story;

/**
 * Badge with larger text and padding.
 */
function LargeBadge(): React.JSX.Element {
  return (
    <div className={styles.storyRow}>
      <Badge
        variant='default'
        className={styles.storyLarge}>
        Large Default
      </Badge>
      <Badge
        variant='secondary'
        className={styles.storyLarge}>
        Large Secondary
      </Badge>
      <Badge
        variant='destructive'
        className={styles.storyLarge}>
        Large Destructive
      </Badge>
      <Badge
        variant='outline'
        className={styles.storyLarge}>
        Large Outline
      </Badge>
    </div>
  );
}

export const Large = {
  render: () => <LargeBadge />,
} satisfies Story;
