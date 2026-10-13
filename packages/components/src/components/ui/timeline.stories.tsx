import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Timeline, TimelineContent, TimelineDot, TimelineItem} from "./timeline";
import styles from "./timeline.module.css";

const meta = {title: "Components/Data Display/Timeline", component: Timeline, tags: ["autodocs"], args: {children: null}} satisfies Meta<
  typeof Timeline
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Timeline aria-label='Release history'>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>Project created</strong>
          <p className={styles.storyMeta}>January 1</p>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>First release</strong>
          <p className={styles.storyMeta}>January 15</p>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <strong>Documentation updated</strong>
          <p className={styles.storyMeta}>February 1</p>
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
          <p className={styles.storyMeta}>
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
        <TimelineDot className={styles.storyCompletedDot} />
        <TimelineContent>
          <strong>Completed</strong>
          <p className={styles.storyMeta}>All milestones finished.</p>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};
