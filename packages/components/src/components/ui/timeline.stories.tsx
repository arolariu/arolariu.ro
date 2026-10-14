import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Timeline, TimelineContent, TimelineDot, TimelineItem} from "./timeline";
const storyStyles = `
.ac-story-timeline-storyMeta {
  color: var(--ac-muted-foreground);
  font-size: var(--ac-text-sm);
}

.ac-story-timeline-storyCompletedDot {
  background: var(--ac-primary);
}
`;

const storyClasses = {
  storyMeta: "ac-story-timeline-storyMeta",
  storyCompletedDot: "ac-story-timeline-storyCompletedDot",
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
  title: "Components/Data Display/Timeline",
  component: Timeline,
  tags: ["autodocs"],
  args: {children: null as React.ReactNode},
} satisfies Meta<typeof Timeline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Timeline aria-label='Release history'>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>Project created</strong>
          <p className={storyClasses.storyMeta}>January 1</p>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>First release</strong>
          <p className={storyClasses.storyMeta}>January 15</p>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>Documentation updated</strong>
          <p className={storyClasses.storyMeta}>February 1</p>
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
        <TimelineContent>First milestone</TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>Second milestone</TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};
export const WithDates: Story = {
  render: () => (
    <Timeline aria-label='Dated events'>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>Version released</strong>
          <p className={storyClasses.storyMeta}>
            <time dateTime='2026-10-13'>October 13, 2026</time>
          </p>
          <a href='#release-notes'>Read release notes</a>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};
export const Completed: Story = {
  render: () => (
    <Timeline>
      <TimelineItem>
        <TimelineDot className={storyClasses.storyCompletedDot} />
        <TimelineContent>
          <strong>Completed</strong>
          <p className={storyClasses.storyMeta}>All milestones finished.</p>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};
