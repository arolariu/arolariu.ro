"use client";

import {Archive, Copy, Settings} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Button} from "./button";
import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerFooter,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerSeparator,
  DropDrawerSub,
  DropDrawerSubContent,
  DropDrawerSubTrigger,
  DropDrawerTrigger,
} from "./dropdrawer";
const storyStyles = `
.ac-story-dropdrawer-storyContainer {
  width: min(24rem, 100%);
  padding: 1.5rem;
}

.ac-story-dropdrawer-storyStatus {
  margin-block-start: 1rem;
  font-size: var(--ac-text-sm);
  color: var(--ac-muted-foreground);
}
`;

const storyClasses = {
  storyContainer: "ac-story-dropdrawer-storyContainer",
  storyStatus: "ac-story-dropdrawer-storyStatus",
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
  title: "Components/Navigation/DropDrawer",
  component: DropDrawer,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof DropDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

function ActionExample({nested = false, controlled = false}: Readonly<{nested?: boolean; controlled?: boolean}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [selection, setSelection] = React.useState("No action selected");
  return (
    <div className={storyClasses.storyContainer}>
      <DropDrawer
        open={controlled ? open : undefined}
        onOpenChange={(nextOpen) => setOpen(nextOpen)}
        mobileTitle='Document actions'>
        <DropDrawerTrigger render={<Button variant='outline'>Document actions</Button>} />
        <DropDrawerContent aria-label='Document actions'>
          <DropDrawerGroup>
            <DropDrawerLabel>Document</DropDrawerLabel>
            <DropDrawerItem
              icon={<Copy aria-hidden='true' />}
              onSelect={() => setSelection("Duplicated")}>
              Duplicate
            </DropDrawerItem>
            <DropDrawerItem
              icon={<Archive aria-hidden='true' />}
              onSelect={() => setSelection("Archived")}>
              Archive
            </DropDrawerItem>
            <DropDrawerItem disabled>Delete (unavailable)</DropDrawerItem>
          </DropDrawerGroup>
          <DropDrawerSeparator />
          {nested && (
            <DropDrawerGroup>
              <DropDrawerSub id='sharing'>
                <DropDrawerSubTrigger>Sharing</DropDrawerSubTrigger>
                <DropDrawerSubContent aria-label='Sharing actions'>
                  <DropDrawerItem
                    closeOnClick={false}
                    onSelect={() => setSelection("Copied link; menu remains open")}>
                    Copy link
                  </DropDrawerItem>
                  <DropDrawerSub>
                    <DropDrawerSubTrigger>Permissions</DropDrawerSubTrigger>
                    <DropDrawerSubContent aria-label='Permissions'>
                      <DropDrawerItem onSelect={() => setSelection("Read-only access")}>Read-only access</DropDrawerItem>
                      <DropDrawerItem disabled>Administrator access</DropDrawerItem>
                    </DropDrawerSubContent>
                  </DropDrawerSub>
                </DropDrawerSubContent>
              </DropDrawerSub>
              <DropDrawerSub>
                <DropDrawerSubTrigger disabled>Unavailable submenu</DropDrawerSubTrigger>
                <DropDrawerSubContent>
                  <DropDrawerItem>Unreachable action</DropDrawerItem>
                </DropDrawerSubContent>
              </DropDrawerSub>
            </DropDrawerGroup>
          )}
          <DropDrawerFooter>
            <DropDrawerItem
              closeOnClick={false}
              icon={<Settings aria-hidden='true' />}
              onSelect={() => setSelection("Preferences; menu remains open")}>
              Preferences
            </DropDrawerItem>
          </DropDrawerFooter>
        </DropDrawerContent>
      </DropDrawer>
      <p
        role='status'
        className={storyClasses.storyStatus}>
        {selection}
      </p>
    </div>
  );
}

/** Resize the real viewport; the real media hook decides which SDK owner renders. */
export const Overview: Story = {render: () => <ActionExample />};

export const DesktopView: Story = {
  globals: {viewport: {value: "desktop", isRotated: false}},
  render: () => <ActionExample nested />,
};

export const MobileView: Story = {
  globals: {viewport: {value: "mobile1", isRotated: false}},
  render: () => <ActionExample nested />,
};

export const WithSubmenus: Story = {render: () => <ActionExample nested />};
export const Controlled: Story = {
  render: () => (
    <ActionExample
      nested
      controlled
    />
  ),
};
