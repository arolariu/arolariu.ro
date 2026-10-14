import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Meter, MeterIndicator, MeterLabel, MeterTrack} from "./meter";
const storyStyles = `
.ac-story-meter-storyContainer {
  width: 16rem;
}

.ac-story-meter-storyLabelRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ac-story-meter-storyValue {
  color: var(--ac-primary);
  font-size: var(--ac-text-sm);
  font-weight: 600;
}

.ac-story-meter-demoStack {
  width: 16rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ac-story-meter-dangerIndicator {
  background: #ef4444;
}

.ac-story-meter-dangerStatus {
  font-size: 0.875rem;
  color: #ef4444;
  font-weight: 500;
}

.ac-story-meter-animatedIndicator {
  transition: width 1s ease-out;
}

.ac-story-meter-status {
  font-size: 0.875rem;
  color: #6b7280;
}
`;

const storyClasses = {
  storyContainer: "ac-story-meter-storyContainer",
  storyLabelRow: "ac-story-meter-storyLabelRow",
  storyValue: "ac-story-meter-storyValue",
  demoStack: "ac-story-meter-demoStack",
  dangerIndicator: "ac-story-meter-dangerIndicator",
  dangerStatus: "ac-story-meter-dangerStatus",
  animatedIndicator: "ac-story-meter-animatedIndicator",
  status: "ac-story-meter-status",
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
  title: "Components/Data Display/Meter",
  component: Meter,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default meter showing storage usage.
 */
export const Default: Story = {
  args: {value: 72},
  render: () => (
    <div className='w-64 space-y-2'>
      <Meter
        value={72}
        min={0}
        max={100}>
        <MeterLabel>Storage used</MeterLabel>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>
      <p className='text-muted-foreground text-sm'>72% of 100 GB used</p>
    </div>
  ),
};

/**
 * Low value meter.
 */
export const LowValue: Story = {
  args: {value: 25},
  render: () => (
    <div className='w-64 space-y-2'>
      <Meter
        value={25}
        min={0}
        max={100}>
        <MeterLabel>Battery level</MeterLabel>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>
      <p className='text-muted-foreground text-sm'>25% remaining</p>
    </div>
  ),
};

/**
 * High value meter.
 */
export const HighValue: Story = {
  args: {value: 95},
  render: () => (
    <div className='w-64 space-y-2'>
      <Meter
        value={95}
        min={0}
        max={100}>
        <MeterLabel>CPU usage</MeterLabel>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>
      <p className='text-muted-foreground text-destructive text-sm'>95% - High usage detected</p>
    </div>
  ),
};

/**
 * Meter turning red when value exceeds 80% threshold.
 */
export const DangerThreshold: Story = {
  args: {value: 85},
  render: () => (
    <div className={storyClasses.demoStack}>
      <Meter
        value={85}
        min={0}
        max={100}>
        <MeterLabel>Memory usage</MeterLabel>
        <MeterTrack>
          <MeterIndicator className={storyClasses.dangerIndicator} />
        </MeterTrack>
      </Meter>
      <p className={storyClasses.dangerStatus}>⚠️ 85% - Approaching capacity</p>
    </div>
  ),
};

/**
 * Meter with descriptive label showing percentage value.
 */
export const WithLabel = {
  args: {value: 65},
  render: () => (
    <div className={storyClasses.storyContainer}>
      <Meter
        value={65}
        min={0}
        max={100}>
        <div className={storyClasses.storyLabelRow}>
          <MeterLabel>CPU Usage</MeterLabel>
          <span className={storyClasses.storyValue}>65%</span>
        </div>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>
    </div>
  ),
} satisfies Story;

function AnimatedMeterContent(): React.JSX.Element {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setValue(78);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={storyClasses.demoStack}>
      <Meter
        value={value}
        min={0}
        max={100}>
        <MeterLabel>Loading progress</MeterLabel>
        <MeterTrack>
          <MeterIndicator className={storyClasses.animatedIndicator} />
        </MeterTrack>
      </Meter>
      <p className={storyClasses.status}>{value}% complete</p>
    </div>
  );
}

/**
 * Meter that animates to its value on mount.
 */
export const Animated: Story = {
  args: {value: 0},
  render: () => <AnimatedMeterContent />,
};
