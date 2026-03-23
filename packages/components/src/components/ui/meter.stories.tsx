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
