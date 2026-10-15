import * as React from "react";
import {FolderOpen} from "lucide-react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "./empty";

const meta = {title: "Components/Feedback/Empty", component: Empty, tags: ["autodocs"]} satisfies Meta<typeof Empty>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (): React.JSX.Element => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <FolderOpen aria-hidden='true' />
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>
          Try adjusting your filters or <a href='#guide'>read the guide</a>.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

export const WithAction: Story = {
  render: (): React.JSX.Element => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <FolderOpen aria-hidden='true' />
        </EmptyMedia>
        <EmptyTitle>No items yet</EmptyTitle>
        <EmptyDescription>Get started by creating your first item.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Create item</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const Compact: Story = {
  render: (): React.JSX.Element => (
    <Empty>
      <EmptyContent>
        <EmptyTitle>No data available</EmptyTitle>
        <EmptyDescription>Check back later.</EmptyDescription>
      </EmptyContent>
    </Empty>
  ),
};

export const RichContent: Story = {
  render: (): React.JSX.Element => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <svg
            role='img'
            aria-label='Empty folder illustration'
            width='96'
            height='64'
            viewBox='0 0 96 64'>
            <path
              d='M8 16h30l8 8h42v32H8Z'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            />
          </svg>
        </EmptyMedia>
        <EmptyTitle>
          <h2>Your library is empty</h2>
        </EmptyTitle>
        <EmptyDescription as='div'>
          <p>There are several ways to get started:</p>
          <ul>
            <li>Create an item.</li>
            <li>
              <a href='#import'>Import an existing collection</a>.
            </li>
          </ul>
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Create item</Button>
        <a href='#help'>Ask for help</a>
      </EmptyContent>
    </Empty>
  ),
};
