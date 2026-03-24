import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Timeline, TimelineContent, TimelineDot, TimelineItem} from "./timeline";

const meta = {
  title: "Components/Data Display/Timeline",
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

/**
 * Timeline items showing timestamps/dates.
 */
function TimelineWithDates(): React.JSX.Element {
  return (
    <Timeline>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            <strong>Order Placed</strong>
            <p style={{fontSize: "14px", color: "#6b7280"}}>January 10, 2024 at 2:30 PM</p>
            <p style={{fontSize: "13px", color: "#9ca3af"}}>Order #12345 has been confirmed</p>
          </div>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            <strong>Payment Processed</strong>
            <p style={{fontSize: "14px", color: "#6b7280"}}>January 10, 2024 at 2:35 PM</p>
            <p style={{fontSize: "13px", color: "#9ca3af"}}>Payment confirmed via credit card</p>
          </div>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot />
        <TimelineContent>
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            <strong>Shipped</strong>
            <p style={{fontSize: "14px", color: "#6b7280"}}>January 11, 2024 at 10:00 AM</p>
            <p style={{fontSize: "13px", color: "#9ca3af"}}>Package handed to carrier</p>
          </div>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  );
}

export const WithDates: Story = {
  render: () => <TimelineWithDates />,
};

/**
 * Timeline with completed, active, and upcoming states.
 */
function TimelineCompleted(): React.JSX.Element {
  return (
    <Timeline>
      <TimelineItem>
        <TimelineDot style={{backgroundColor: "#22c55e", borderColor: "#22c55e"}} />
        <TimelineContent>
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            <strong style={{color: "#15803d"}}>Registration Complete</strong>
            <p style={{fontSize: "14px", color: "#6b7280"}}>Account created successfully</p>
          </div>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot style={{backgroundColor: "#22c55e", borderColor: "#22c55e"}} />
        <TimelineContent>
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            <strong style={{color: "#15803d"}}>Email Verified</strong>
            <p style={{fontSize: "14px", color: "#6b7280"}}>Verification email confirmed</p>
          </div>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot
          style={{
            backgroundColor: "#3b82f6",
            borderColor: "#3b82f6",
            boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.2)",
          }}
        />
        <TimelineContent>
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            <strong style={{color: "#1e40af"}}>Profile Setup (Current)</strong>
            <p style={{fontSize: "14px", color: "#6b7280"}}>Complete your profile information</p>
          </div>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot style={{backgroundColor: "#e5e7eb", borderColor: "#d1d5db"}} />
        <TimelineContent>
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            <strong style={{color: "#9ca3af"}}>Payment Setup</strong>
            <p style={{fontSize: "14px", color: "#9ca3af"}}>Add payment method</p>
          </div>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineDot style={{backgroundColor: "#e5e7eb", borderColor: "#d1d5db"}} />
        <TimelineContent>
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            <strong style={{color: "#9ca3af"}}>Start Using</strong>
            <p style={{fontSize: "14px", color: "#9ca3af"}}>Begin your journey</p>
          </div>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  );
}

export const Completed: Story = {
  render: () => <TimelineCompleted />,
};
