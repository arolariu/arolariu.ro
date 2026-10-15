"use client";

import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {ScrollArea, ScrollAreaContent, ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport, ScrollBar} from "./scroll-area";
const storyStyles = `
.ac-story-scroll-area-storyArea,
.ac-story-scroll-area-storyScrollingArea {
  width: 22rem;
  height: 14rem;
  max-width: 100%;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-md);
}

.ac-story-scroll-area-storyScrollingArea {
  border-color: var(--ac-ring);
}

.ac-story-scroll-area-storyCompact {
  width: 16rem;
  height: 8rem;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-md);
}

.ac-story-scroll-area-storyNotes {
  margin: 0;
  padding: var(--ac-space-4) var(--ac-space-6);
}

.ac-story-scroll-area-storyNotes li {
  padding-block: var(--ac-space-2);
}

.ac-story-scroll-area-storyCollection {
  display: flex;
  gap: var(--ac-space-4);
  padding: var(--ac-space-4);
}

.ac-story-scroll-area-storyTile {
  display: grid;
  width: 10rem;
  height: 9rem;
  flex-shrink: 0;
  margin: 0;
  place-items: center;
  border-radius: var(--ac-radius-md);
  background-color: var(--ac-muted);
}

.ac-story-scroll-area-storyWide {
  width: 40rem;
}

.ac-story-scroll-area-storyControls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ac-space-2);
  max-width: 22rem;
}
`;

const storyClasses = {
  storyArea: "ac-story-scroll-area-storyArea",
  storyScrollingArea: "ac-story-scroll-area-storyScrollingArea",
  storyCompact: "ac-story-scroll-area-storyCompact",
  storyNotes: "ac-story-scroll-area-storyNotes",
  storyCollection: "ac-story-scroll-area-storyCollection",
  storyTile: "ac-story-scroll-area-storyTile",
  storyWide: "ac-story-scroll-area-storyWide",
  storyControls: "ac-story-scroll-area-storyControls",
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
  title: "Components/Layout/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof ScrollArea>;
export default meta;
type Story = StoryObj<typeof meta>;

function Notes(): React.JSX.Element {
  return (
    <ol className={storyClasses.storyNotes}>
      {Array.from({length: 30}, (_, index) => (
        <li key={`note-${index}`}>Note {index + 1}: a scrollable list item.</li>
      ))}
    </ol>
  );
}

export const Default: Story = {
  render: (): React.JSX.Element => (
    <ScrollArea
      className={storyClasses.storyArea}
      viewportProps={{"aria-label": "Scrollable notes", role: "region"}}>
      <Notes />
    </ScrollArea>
  ),
};

export const Compact: Story = {
  render: (): React.JSX.Element => (
    <ScrollArea
      className={storyClasses.storyCompact}
      viewportProps={{"aria-label": "Compact notes", role: "region"}}>
      <Notes />
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: (): React.JSX.Element => (
    <ScrollAreaRoot className={storyClasses.storyArea}>
      <ScrollAreaViewport
        aria-label='Horizontal collection'
        role='region'>
        <ScrollAreaContent className={storyClasses.storyCollection}>
          {Array.from({length: 12}, (_, index) => (
            <figure
              className={storyClasses.storyTile}
              key={`tile-${index}`}>
              <figcaption>Item {index + 1}</figcaption>
            </figure>
          ))}
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollBar orientation='horizontal' />
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  ),
};

export const BothDirections: Story = {
  render: (): React.JSX.Element => (
    <ScrollAreaRoot
      className={(state) => (state.scrolling ? storyClasses.storyScrollingArea : storyClasses.storyArea)}
      render={(props, state) => (
        <div
          {...props}
          data-scrolling={state.scrolling}
        />
      )}>
      <ScrollAreaViewport
        aria-label='Wide notes'
        role='region'>
        <ScrollAreaContent className={storyClasses.storyWide}>
          <Notes />
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollBar />
      <ScrollBar orientation='horizontal' />
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  ),
};

export const HorizontalScroll: Story = Horizontal;
export const BothAxes: Story = BothDirections;

function ScrollRequests(): React.JSX.Element {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  return (
    <div className={storyClasses.storyControls}>
      <Button
        size='sm'
        onClick={() => viewportRef.current?.scrollTo({top: 0})}>
        Back to top
      </Button>
      <Button
        size='sm'
        onClick={() => viewportRef.current?.scrollBy({top: 100})}>
        Scroll down
      </Button>
      <ScrollArea
        className={storyClasses.storyArea}
        viewportProps={{ref: viewportRef, "aria-label": "Notes with scroll controls", role: "region"}}>
        <Notes />
      </ScrollArea>
    </div>
  );
}
export const ProgrammaticScroll: Story = {render: (): React.JSX.Element => <ScrollRequests />};
