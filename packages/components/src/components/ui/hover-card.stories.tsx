import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {HoverCard, HoverCardContent, HoverCardTrigger} from "./hover-card";
import styles from "./hover-card.module.css";

const meta = {
  title: "Components/Overlays/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A navigable link with a non-interactive preview. */
export const Default: Story = {
  render: (): React.JSX.Element => (
    <HoverCard>
      <HoverCardTrigger
        href='https://react.dev'
        className={styles.storyLink}>
        React
      </HoverCardTrigger>
      <HoverCardContent
        className={styles.storyContent}
        aria-label='React preview'>
        <h3 className={styles.storyTitle}>React</h3>
        <p className={styles.storyDescription}>A library for building user interfaces.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};

/** Short native link preview with an immediate trigger-owned delay. */
export const Simple: Story = {
  render: (): React.JSX.Element => (
    <HoverCard>
      <HoverCardTrigger
        href='#details'
        delay={0}
        closeDelay={0}
        className={styles.storyLink}>
        Preview immediately
      </HoverCardTrigger>
      <HoverCardContent>Additional non-interactive information.</HoverCardContent>
    </HoverCard>
  ),
};

/** Presentation copy remains domain-agnostic component input. */
export const ProductInfo: Story = {
  render: (): React.JSX.Element => (
    <HoverCard>
      <HoverCardTrigger
        href='#product'
        className={styles.storyLink}>
        View product details
      </HoverCardTrigger>
      <HoverCardContent className={styles.storyContent}>
        <h3 className={styles.storyTitle}>Premium Headphones</h3>
        <p className={styles.storyDescription}>Wireless audio with active noise cancellation.</p>
        <span>$299.99 · In stock</span>
      </HoverCardContent>
    </HoverCard>
  ),
};

/** Composition callbacks observe the real Trigger and Popup state. */
export const RepositoryStats: Story = {
  render: (): React.JSX.Element => (
    <HoverCard>
      <HoverCardTrigger
        href='https://github.com/facebook/react'
        delay={300}
        className={styles.storyLink}
        render={(props, state): React.ReactElement => <a {...props}>React repository{state.open ? " — preview open" : ""}</a>}
      />
      <HoverCardContent
        className={styles.storyContent}
        render={(props, state): React.ReactElement => (
          <section
            {...props}
            data-preview-open={state.open}
          />
        )}>
        <h3 className={styles.storyTitle}>facebook/react</h3>
        <p className={styles.storyDescription}>Source code and community contributions.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};

/** Long hover delay belongs to Trigger, not Root or Popup. */
export const UserProfile: Story = {
  render: (): React.JSX.Element => (
    <HoverCard>
      <HoverCardTrigger
        href='#profile'
        delay={1000}
        closeDelay={300}
        className={styles.storyLink}>
        Profile (1s delay)
      </HoverCardTrigger>
      <HoverCardContent className={styles.storyContent}>
        <h3 className={styles.storyTitle}>Sarah Anderson</h3>
        <p className={styles.storyDescription}>Developer interested in accessible web experiences.</p>
        <span>1,234 followers · 567 following</span>
      </HoverCardContent>
    </HoverCard>
  ),
};

/** Explicit placement overrides the upstream-compatible default alignOffset=4. */
export const LinkPreview: Story = {
  render: (): React.JSX.Element => (
    <HoverCard>
      <HoverCardTrigger
        href='#article'
        className={styles.storyLink}>
        Read the full article
      </HoverCardTrigger>
      <HoverCardContent
        className={styles.storyWide}
        side='top'
        align='start'
        sideOffset={8}
        alignOffset={0}>
        <div className={styles.storyContent}>
          <h3 className={styles.storyTitle}>Building Better React Applications</h3>
          <p className={styles.storyDescription}>Patterns for scalable, accessible user interfaces.</p>
          <span>5 min read · example.com</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
