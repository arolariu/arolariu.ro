import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle} from "./item";

const meta = {
  title: "Components/Data Display/Item",
  component: Item,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "muted"],
      description: "Visual surface treatment for the item container",
    },
    size: {
      control: "select",
      options: ["default", "sm"],
      description: "Compactness applied to the item container",
    },
  },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic item with media, content, and actions.
 */
export const Default: Story = {
  render: () => (
    <Item>
      <ItemMedia variant='icon'>📧</ItemMedia>
      <ItemContent>
        <ItemTitle>New message received</ItemTitle>
        <ItemDescription>You have a new message from John Doe</ItemDescription>
      </ItemContent>
      <ItemActions>
        <button
          type='button'
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.875rem",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}>
          View
        </button>
      </ItemActions>
    </Item>
  ),
};

/**
 * Item with outline variant.
 */
export const Outline: Story = {
  render: () => (
    <Item variant='outline'>
      <ItemMedia variant='icon'>🔔</ItemMedia>
      <ItemContent>
        <ItemTitle>Notification settings</ItemTitle>
        <ItemDescription>Manage how you receive notifications</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

/**
 * Group of items with separators.
 */
export const Group: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemMedia variant='icon'>👤</ItemMedia>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>john@example.com</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant='icon'>👤</ItemMedia>
        <ItemContent>
          <ItemTitle>Jane Smith</ItemTitle>
          <ItemDescription>jane@example.com</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant='icon'>👤</ItemMedia>
        <ItemContent>
          <ItemTitle>Bob Johnson</ItemTitle>
          <ItemDescription>bob@example.com</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Small size variant for compact layouts.
 */
export const SmallSize: Story = {
  render: () => (
    <Item
      size='sm'
      variant='muted'>
      <ItemMedia variant='icon'>⚙️</ItemMedia>
      <ItemContent>
        <ItemTitle>Settings</ItemTitle>
        <ItemDescription>Configure your preferences</ItemDescription>
      </ItemContent>
      <ItemActions>
        <button
          type='button'
          style={{
            padding: "0.125rem 0.5rem",
            fontSize: "0.75rem",
            background: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "3px",
          }}>
          Edit
        </button>
      </ItemActions>
    </Item>
  ),
};
