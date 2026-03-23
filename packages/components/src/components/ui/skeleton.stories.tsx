import type {Meta, StoryObj} from "@storybook/react-vite";
import {Skeleton} from "./skeleton";

const meta = {
  component: Skeleton,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className='space-y-2'>
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-5/6' />
      <Skeleton className='h-4 w-4/5' />
    </div>
  ),
};

export const Card: Story = {
  render: () => (
    <div className='space-y-3 rounded border p-4'>
      <Skeleton className='h-12 w-12 rounded-full' />
      <div className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-5/6' />
      </div>
    </div>
  ),
};

export const List: Story = {
  render: () => (
    <div className='space-y-4'>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className='flex items-center space-x-4'>
          <Skeleton className='h-12 w-12 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>
        </div>
      ))}
    </div>
  ),
};
