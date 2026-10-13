"use client";

import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {ScrollArea, ScrollAreaContent, ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport, ScrollBar} from "./scroll-area";
import styles from "./scroll-area.module.css";

const meta = {
  title: "Components/Layout/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof ScrollArea>;
export default meta;
type Story = StoryObj<typeof meta>;

function Notes(): React.JSX.Element {
  return (
    <ol className={styles.storyNotes}>
      {Array.from({length: 30}, (_, index) => (
        <li key={`note-${index}`}>Note {index + 1}: a scrollable list item.</li>
      ))}
    </ol>
  );
}

export const Default: Story = {
  render: (): React.JSX.Element => (
    <ScrollArea
      className={styles.storyArea}
      viewportProps={{"aria-label": "Scrollable notes", role: "region"}}>
      <Notes />
    </ScrollArea>
  ),
};

export const Compact: Story = {
  render: (): React.JSX.Element => (
    <ScrollArea
      className={styles.storyCompact}
      viewportProps={{"aria-label": "Compact notes", role: "region"}}>
      <Notes />
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: (): React.JSX.Element => (
    <ScrollAreaRoot className={styles.storyArea}>
      <ScrollAreaViewport
        aria-label='Horizontal collection'
        role='region'>
        <ScrollAreaContent className={styles.storyCollection}>
          {Array.from({length: 12}, (_, index) => (
            <figure
              className={styles.storyTile}
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
      className={(state) => (state.scrolling ? styles.storyScrollingArea : styles.storyArea)}
      render={(props, state) => (
        <div
          {...props}
          data-scrolling={state.scrolling}
        />
      )}>
      <ScrollAreaViewport
        aria-label='Wide notes'
        role='region'>
        <ScrollAreaContent className={styles.storyWide}>
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
    <div className={styles.storyControls}>
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
        className={styles.storyArea}
        viewportProps={{ref: viewportRef, "aria-label": "Notes with scroll controls", role: "region"}}>
        <Notes />
      </ScrollArea>
    </div>
  );
}
export const ProgrammaticScroll: Story = {render: (): React.JSX.Element => <ScrollRequests />};
