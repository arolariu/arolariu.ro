import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {HoverCard, HoverCardContent, HoverCardTrigger} from "./hover-card";
const storyStyles = `
.ac-story-hover-card-storyContent {
  display: grid;
  gap: var(--ac-space-2);
  font-size: var(--ac-text-sm);
}

.ac-story-hover-card-storyTitle {
  margin: 0;
  font-size: var(--ac-text-sm);
  font-weight: 600;
}

.ac-story-hover-card-storyDescription {
  margin: 0;
  color: var(--ac-muted-foreground);
}

.ac-story-hover-card-storyLink {
  color: var(--ac-primary);
  text-underline-offset: var(--ac-space-1);
}

.ac-story-hover-card-storyWide {
  width: 20rem;
  max-width: var(--available-width);
}

@media (forced-colors: active) {

  .ac-story-hover-card-storyDescription {
    color: CanvasText;
  }
}
`;

const storyClasses = {
  storyContent: "ac-story-hover-card-storyContent",
  storyTitle: "ac-story-hover-card-storyTitle",
  storyDescription: "ac-story-hover-card-storyDescription",
  storyLink: "ac-story-hover-card-storyLink",
  storyWide: "ac-story-hover-card-storyWide",
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
        className={storyClasses.storyLink}>
        React
      </HoverCardTrigger>
      <HoverCardContent
        className={storyClasses.storyContent}
        aria-label='React preview'>
        <h3 className={storyClasses.storyTitle}>React</h3>
        <p className={storyClasses.storyDescription}>A library for building user interfaces.</p>
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
        className={storyClasses.storyLink}>
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
        className={storyClasses.storyLink}>
        View product details
      </HoverCardTrigger>
      <HoverCardContent className={storyClasses.storyContent}>
        <h3 className={storyClasses.storyTitle}>Premium Headphones</h3>
        <p className={storyClasses.storyDescription}>Wireless audio with active noise cancellation.</p>
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
        className={storyClasses.storyLink}
        render={(props, state): React.ReactElement => <a {...props}>React repository{state.open ? " — preview open" : ""}</a>}
      />
      <HoverCardContent
        className={storyClasses.storyContent}
        render={(props, state): React.ReactElement => (
          <section
            {...props}
            data-preview-open={state.open}
          />
        )}>
        <h3 className={storyClasses.storyTitle}>facebook/react</h3>
        <p className={storyClasses.storyDescription}>Source code and community contributions.</p>
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
        className={storyClasses.storyLink}>
        Profile (1s delay)
      </HoverCardTrigger>
      <HoverCardContent className={storyClasses.storyContent}>
        <h3 className={storyClasses.storyTitle}>Sarah Anderson</h3>
        <p className={storyClasses.storyDescription}>Developer interested in accessible web experiences.</p>
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
        className={storyClasses.storyLink}>
        Read the full article
      </HoverCardTrigger>
      <HoverCardContent
        className={storyClasses.storyWide}
        side='top'
        align='start'
        sideOffset={8}
        alignOffset={0}>
        <div className={storyClasses.storyContent}>
          <h3 className={storyClasses.storyTitle}>Building Better React Applications</h3>
          <p className={storyClasses.storyDescription}>Patterns for scalable, accessible user interfaces.</p>
          <span>5 min read · example.com</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
