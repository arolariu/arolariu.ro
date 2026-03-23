import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "./resizable";

const meta = {
  title: "Components/Layout/Resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Horizontal resizable panels.
 */
export const Horizontal: Story = {
  render: () => (
    <ResizablePanelGroup
      direction='horizontal'
      className='min-h-[200px] max-w-md rounded-lg border'>
      <ResizablePanel defaultSize={50}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Panel One</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Panel Two</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

/**
 * Vertical resizable panels.
 */
export const Vertical: Story = {
  render: () => (
    <ResizablePanelGroup
      direction='vertical'
      className='min-h-[400px] max-w-md rounded-lg border'>
      <ResizablePanel defaultSize={50}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Top Panel</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Bottom Panel</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

/**
 * Three-column layout with resizable panels.
 */
export const ThreeColumn: Story = {
  render: () => (
    <ResizablePanelGroup
      direction='horizontal'
      className='min-h-[200px] max-w-2xl rounded-lg border'>
      <ResizablePanel defaultSize={25}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Sidebar</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Main Content</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={25}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Details</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
