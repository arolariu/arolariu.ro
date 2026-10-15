import {ArrowUpRight, Bell, FileText, Folder, Mail, MessageCircle, Settings, User} from "lucide-react";
import type * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Badge} from "./badge";
import {Button} from "./button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./item";
const storyStyles = `
.ac-story-item-storyStack {
  display: flex;
  flex-direction: column;
  gap: var(--ac-space-4);
  width: min(36rem, 90vw);
}

.ac-story-item-storyCheckbox {
  width: var(--ac-space-4);
  height: var(--ac-space-4);
  accent-color: var(--ac-primary);
}
`;

const storyClasses = {
  storyStack: "ac-story-item-storyStack",
  storyCheckbox: "ac-story-item-storyCheckbox",
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
      options: ["default", "sm", "xs"],
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
  render: (): React.JSX.Element => (
    <Item>
      <ItemMedia variant='icon'>
        <Mail />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>New message received</ItemTitle>
        <ItemDescription>You have a new message from John Doe</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size='sm'>View</Button>
      </ItemActions>
    </Item>
  ),
};

/**
 * Item with outline variant.
 */
export const Outline: Story = {
  render: (): React.JSX.Element => (
    <Item variant='outline'>
      <ItemMedia variant='icon'>
        <Bell />
      </ItemMedia>
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
  render: (): React.JSX.Element => (
    <ItemGroup role='list'>
      <Item role='listitem'>
        <ItemMedia variant='icon'>
          <User />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>john@example.com</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator
        role='presentation'
        aria-hidden='true'
      />
      <Item role='listitem'>
        <ItemMedia variant='icon'>
          <User />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Jane Smith</ItemTitle>
          <ItemDescription>jane@example.com</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator
        role='presentation'
        aria-hidden='true'
      />
      <Item role='listitem'>
        <ItemMedia variant='icon'>
          <User />
        </ItemMedia>
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
  render: (): React.JSX.Element => (
    <Item
      size='sm'
      variant='muted'>
      <ItemMedia variant='icon'>
        <Settings />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Settings</ItemTitle>
        <ItemDescription>Configure your preferences</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size='xs'>Edit</Button>
      </ItemActions>
    </Item>
  ),
};

/**
 * Item with leading checkbox for selection.
 */
export const WithCheckbox: Story = {
  render: (): React.JSX.Element => (
    <Item>
      <input
        id='export-project'
        type='checkbox'
        className={storyClasses.storyCheckbox}
      />
      <ItemMedia variant='icon'>
        <Folder />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <label htmlFor='export-project'>Project files</label>
        </ItemTitle>
        <ItemDescription>Select to include in export</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

/**
 * Item showing notification badge count.
 */
export const WithBadge: Story = {
  render: (): React.JSX.Element => (
    <Item>
      <ItemMedia variant='icon'>
        <MessageCircle />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Messages</ItemTitle>
        <ItemDescription>You have unread messages</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant='secondary'>12</Badge>
      </ItemActions>
    </Item>
  ),
};

/**
 * Canonical render composition preserves native anchor navigation and keyboard behavior.
 */
export const Clickable: Story = {
  render: (): React.JSX.Element => (
    <Item
      variant='outline'
      render={<a href='#document-details' />}>
      <ItemMedia variant='icon'>
        <FileText />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Document.pdf</ItemTitle>
        <ItemDescription>Open document details</ItemDescription>
      </ItemContent>
      <ItemMedia>
        <ArrowUpRight aria-hidden='true' />
      </ItemMedia>
    </Item>
  ),
};

/** Render composition produces one real link with original content. */
export const RenderLink: Story = {
  render: (): React.JSX.Element => (
    <Item
      size='sm'
      variant='outline'
      render={
        <a href='#render-document'>
          <ItemContent>
            <ItemTitle>Rendered document link</ItemTitle>
            <ItemDescription>Native navigation, not a synthetic keyboard button</ItemDescription>
          </ItemContent>
        </a>
      }
    />
  ),
};

/** Extra-small sizing scales leading media and retains header/footer/action slots. */
export const ExtraSmall: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      <Item
        size='xs'
        variant='outline'>
        <ItemHeader>
          <span>Shared file</span>
          <Badge variant='outline'>Ready</Badge>
        </ItemHeader>
        <ItemMedia variant='icon'>
          <FileText />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Release notes</ItemTitle>
          <ItemDescription>Compact icon media with action controls</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size='xs'>Open</Button>
        </ItemActions>
        <ItemFooter>Updated today</ItemFooter>
      </Item>
      <Item
        size='xs'
        variant='muted'>
        <ItemMedia variant='image'>
          <img
            src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="silver"/%3E%3Ccircle cx="32" cy="24" r="12" fill="gray"/%3E%3Cpath d="M8 64a24 24 0 0 1 48 0" fill="gray"/%3E%3C/svg%3E'
            alt=''
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Profile preview</ItemTitle>
          <ItemDescription>Image media is cropped without stretching</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
};

/** Title and rich description clamp to one and two lines; full content remains accessible. */
export const RichOverflow: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      <Item variant='outline'>
        <ItemMedia variant='icon'>
          <Folder />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>A very long collection title that should wrap, clamp and remain inside the item without expanding the row</ItemTitle>
          <ItemDescription>
            This <strong>rich description</strong> includes <a href='#documentation'>documentation</a> and enough additional text to
            demonstrate the two-line limit. All of this content stays in the DOM and is not removed from the accessibility tree.
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
};

/** Render callbacks receive item-owned state and can produce a correctly typed native label. */
export const RenderCallback: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      <Item
        size='xs'
        variant='muted'
        render={(props, state): React.ReactElement => (
          <label
            {...props}
            htmlFor='callback-project'
            data-demo-size={state.size}
          />
        )}>
        <span>Select the project through its native label</span>
      </Item>
      <input
        id='callback-project'
        type='checkbox'
        className={storyClasses.storyCheckbox}
      />
    </div>
  ),
};
