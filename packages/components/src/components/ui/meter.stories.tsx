import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Meter, MeterIndicator, MeterLabel, MeterTrack} from "./meter";

const meta = {
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
  render: () => (
    <div style={{width: "16rem", display: "flex", flexDirection: "column", gap: "0.5rem"}}>
      <Meter
        value={85}
        min={0}
        max={100}>
        <MeterLabel>Memory usage</MeterLabel>
        <MeterTrack>
          <MeterIndicator style={{background: "#ef4444"}} />
        </MeterTrack>
      </Meter>
      <p style={{fontSize: "0.875rem", color: "#ef4444", fontWeight: "500"}}>⚠️ 85% - Approaching capacity</p>
    </div>
  ),
};

/**
 * Meter with descriptive label showing percentage value.
 */
export const WithLabel: Story = {
  render: () => (
    <div style={{width: "16rem", display: "flex", flexDirection: "column", gap: "0.5rem"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <MeterLabel style={{fontSize: "0.875rem", fontWeight: "500"}}>CPU Usage</MeterLabel>
        <span style={{fontSize: "0.875rem", fontWeight: "600", color: "#3b82f6"}}>65%</span>
      </div>
      <Meter
        value={65}
        min={0}
        max={100}>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>
    </div>
  ),
};

function AnimatedMeterContent(): React.JSX.Element {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setValue(78);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{width: "16rem", display: "flex", flexDirection: "column", gap: "0.5rem"}}>
      <Meter
        value={value}
        min={0}
        max={100}>
        <MeterLabel>Loading progress</MeterLabel>
        <MeterTrack>
          <MeterIndicator style={{transition: "width 1s ease-out"}} />
        </MeterTrack>
      </Meter>
      <p style={{fontSize: "0.875rem", color: "#6b7280"}}>{value}% complete</p>
    </div>
  );
}

/**
 * Meter that animates to its value on mount.
 */
export const Animated: Story = {
  render: () => <AnimatedMeterContent />,
};
