import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Timeline, TimelineContent, TimelineDot, TimelineItem} from "./timeline";

const meta = {
  component: Timeline,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Timeline>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>Account created</strong>
          <p className='text-sm text-gray-500'>January 1, 2024</p>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>Profile updated</strong>
          <p className='text-sm text-gray-500'>January 15, 2024</p>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>First purchase</strong>
          <p className='text-sm text-gray-500'>February 1, 2024</p>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};

export const Simple: Story = {
  render: () => (
    <Timeline>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>Step 1 completed</TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>Step 2 completed</TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};
