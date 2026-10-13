import type {ReactElement} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage} from "./avatar";
import styles from "./avatar.module.css";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23dbeafe'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%233b82f6'/%3E%3Cpath d='M10 64a22 22 0 0 1 44 0' fill='%231d4ed8'/%3E%3C/svg%3E";

const meta = {
  title: "Components/Data Display/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: {size: "default"},
  argTypes: {
    size: {control: "select", options: ["sm", "default", "lg"]},
  },
  parameters: {
    docs: {
      description: {
        component:
          "Base UI owns image loading and fallback delay. Compose AvatarBadge directly inside Avatar; AvatarGroup stacks direct avatars and AvatarGroupCount matches the first avatar's size.",
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A real image with initials shown only while it is unavailable. */
export const WithImage = {
  render: (args: Readonly<Avatar.Props>): ReactElement => (
    <Avatar {...args}>
      <AvatarImage
        src={portrait}
        alt='Illustrated profile portrait'
      />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
} satisfies Story;

/** Initials without a network request or a broken-image placeholder. */
export const WithFallback = {
  render: (args: Readonly<Avatar.Props>): ReactElement => (
    <Avatar {...args}>
      <AvatarFallback>AO</AvatarFallback>
    </Avatar>
  ),
} satisfies Story;

/** The public AvatarGroup provides overlap and themed separation rings. */
export const Group = {
  render: (): ReactElement => (
    <AvatarGroup
      role='group'
      aria-label='Contributors'>
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    </AvatarGroup>
  ),
} satisfies Story;

/** The badge lives inside the root and is not clipped by its circular surface. */
export const WithStatus = {
  render: (): ReactElement => (
    <Avatar>
      <AvatarImage
        src={portrait}
        alt='Illustrated profile portrait'
      />
      <AvatarFallback>JD</AvatarFallback>
      <AvatarBadge
        role='img'
        aria-label='Online'>
        <svg
          viewBox='0 0 16 16'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          aria-hidden='true'>
          <path d='m3 8 3 3 7-7' />
        </svg>
      </AvatarBadge>
    </Avatar>
  ),
} satisfies Story;

/** A real trailing count, not an avatar with count-like fallback content. */
export const AvatarStack = {
  render: (): ReactElement => (
    <AvatarGroup
      role='group'
      aria-label='Team members'>
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
      <AvatarGroupCount aria-label='5 more team members'>+5</AvatarGroupCount>
    </AvatarGroup>
  ),
} satisfies Story;

/** The count also works independently using the default 40px size. */
export const GroupCount = {
  render: (): ReactElement => <AvatarGroupCount aria-label='5 more contributors'>+5</AvatarGroupCount>,
} satisfies Story;

/** Small 24px, backward-compatible default 40px, and large 48px avatars. */
export const Sizes = {
  render: (): ReactElement => (
    <div className={styles.storyRow}>
      <Avatar
        size='sm'
        role='img'
        aria-label='Small avatar'>
        <AvatarFallback>S</AvatarFallback>
      </Avatar>
      <Avatar
        role='img'
        aria-label='Default avatar'>
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <Avatar
        size='lg'
        role='img'
        aria-label='Large avatar'>
        <AvatarFallback>L</AvatarFallback>
      </Avatar>
    </div>
  ),
} satisfies Story;

/** Small badges become dots; default and large badges can display an icon. */
export const BadgeSizes = {
  render: (): ReactElement => (
    <div className={styles.storyRow}>
      {(["sm", "default", "lg"] as const).map((size) => (
        <Avatar
          key={size}
          size={size}>
          <AvatarFallback>AO</AvatarFallback>
          <AvatarBadge
            role='img'
            aria-label={`${size} available`}>
            <svg
              viewBox='0 0 16 16'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'>
              <path d='m3 8 3 3 7-7' />
            </svg>
          </AvatarBadge>
        </Avatar>
      ))}
    </div>
  ),
} satisfies Story;

/** Counts follow the first direct avatar; badge-bearing avatars remain above peers. */
export const GroupSizes = {
  render: (): ReactElement => (
    <div className={styles.storyColumn}>
      {(["sm", "default", "lg"] as const).map((size) => (
        <AvatarGroup
          key={size}
          role='group'
          aria-label={`${size} contributors`}>
          <Avatar size={size}>
            <AvatarFallback>AO</AvatarFallback>
            <AvatarBadge
              role='img'
              aria-label={`${size} available`}
            />
          </Avatar>
          <Avatar size={size}>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <AvatarGroupCount aria-label='3 more contributors'>+3</AvatarGroupCount>
        </AvatarGroup>
      ))}
    </div>
  ),
} satisfies Story;

/** A deterministic no-image case demonstrates Base UI's delayed fallback. */
export const WithDelay = {
  render: (): ReactElement => (
    <Avatar>
      <AvatarFallback delay={600}>AO</AvatarFallback>
    </Avatar>
  ),
} satisfies Story;

/** Render composition receives the live primitive status plus the selected size. */
export const RenderState = {
  render: (): ReactElement => (
    <Avatar
      size='lg'
      render={(elementProps, state) => (
        <span
          {...elementProps}
          role='img'
          aria-label={`${state.size} avatar: ${state.imageLoadingStatus}`}
        />
      )}>
      <AvatarImage
        src={portrait}
        alt=''
      />
      <AvatarFallback>AO</AvatarFallback>
      <AvatarBadge aria-hidden='true' />
    </Avatar>
  ),
} satisfies Story;

/** Theme tokens control the fallback, count, badge, outline, and group rings. */
export const DarkTheme = {
  render: (): ReactElement => (
    <div
      data-theme='dark'
      className={styles.storyPanel}>
      <AvatarGroup
        role='group'
        aria-label='Dark theme contributors'>
        <Avatar>
          <AvatarFallback>AO</AvatarFallback>
          <AvatarBadge
            role='img'
            aria-label='Available'
          />
        </Avatar>
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <AvatarGroupCount aria-label='3 more contributors'>+3</AvatarGroupCount>
      </AvatarGroup>
    </div>
  ),
} satisfies Story;

/** Logical overlap and badge positioning also follow right-to-left layout. */
export const RightToLeft = {
  render: (): ReactElement => (
    <AvatarGroup
      dir='rtl'
      role='group'
      aria-label='Right-to-left contributors'>
      <Avatar>
        <AvatarFallback>AO</AvatarFallback>
        <AvatarBadge
          role='img'
          aria-label='Available'
        />
      </Avatar>
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <AvatarGroupCount aria-label='3 more contributors'>+3</AvatarGroupCount>
    </AvatarGroup>
  ),
} satisfies Story;
