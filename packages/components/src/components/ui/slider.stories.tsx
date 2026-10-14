import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Slider} from "./slider";
const storyStyles = `
.ac-story-slider-story {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 16rem;
  max-width: 100%;
}

.ac-story-slider-storyHeader {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.ac-story-slider-storyValue {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.ac-story-slider-storyLabels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--ac-muted-foreground);
}

.ac-story-slider-storyVertical {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  height: 16rem;
}
`;

const storyClasses = {
  story: "ac-story-slider-story",
  storyHeader: "ac-story-slider-storyHeader",
  storyValue: "ac-story-slider-storyValue",
  storyLabels: "ac-story-slider-storyLabels",
  storyVertical: "ac-story-slider-storyVertical",
} as const;

const meta: Meta<typeof Slider> = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Forms/Slider",
  component: Slider,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    controls: {disable: true},
  },
  argTypes: {
    orientation: {control: "select", options: ["horizontal", "vertical"]},
    disabled: {control: "boolean"},
    thumbAlignment: {control: "select", options: ["edge", "center", "edge-client-only"]},
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default slider with single value.
 */
export const Default: Story = {
  parameters: {controls: {disable: false, include: ["orientation", "disabled", "thumbAlignment"]}},
  args: {orientation: "horizontal", disabled: false, thumbAlignment: "edge"},
  render: (args) => (
    <div className={args.orientation === "vertical" ? storyClasses.storyVertical : storyClasses.story}>
      <Slider
        aria-label='Volume'
        defaultValue={50}
        min={0}
        max={100}
        {...args}
      />
    </div>
  ),
};

/**
 * Slider with custom range and step.
 */
export const CustomRange: Story = {
  render: () => (
    <div className={storyClasses.story}>
      <div className={storyClasses.storyHeader}>Price range: $0 – $1000</div>
      <Slider
        aria-label='Price range'
        defaultValue={[250, 750]}
        min={0}
        max={1000}
        step={50}
      />
    </div>
  ),
};

/**
 * Controlled slider showing current value.
 */
function ControlledDemo(): React.JSX.Element {
  const [value, setValue] = React.useState(30);

  return (
    <div className={storyClasses.story}>
      <div className={storyClasses.storyHeader}>
        <span>Volume</span>
        <output className={storyClasses.storyValue}>{value}%</output>
      </div>
      <Slider
        aria-label='Volume'
        value={value}
        onValueChange={setValue}
        min={0}
        max={100}
      />
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

/**
 * Disabled slider.
 */
export const Disabled: Story = {
  render: () => (
    <div className={storyClasses.story}>
      <Slider
        aria-label='Unavailable range'
        defaultValue={[25, 75]}
        min={0}
        max={100}
        disabled
      />
    </div>
  ),
};

/**
 * Range slider with two thumbs.
 */
function RangeSliderDemo(): React.JSX.Element {
  const [range, setRange] = React.useState([25, 75]);

  return (
    <div className={storyClasses.story}>
      <div className={storyClasses.storyHeader}>
        <span>Price Range</span>
        <output className={storyClasses.storyValue}>
          ${range[0]} – ${range[1]}
        </output>
      </div>
      <Slider
        aria-label='Price range'
        value={range}
        onValueChange={setRange}
        min={0}
        max={100}
        step={5}
      />
    </div>
  );
}

export const RangeSlider: Story = {
  render: () => <RangeSliderDemo />,
};

/**
 * Slider with min/max labels.
 */
export const WithLabels: Story = {
  render: () => (
    <div className={storyClasses.story}>
      <Slider
        aria-label='Labeled value'
        defaultValue={[50]}
        min={0}
        max={100}
      />
      <div className={storyClasses.storyLabels}>
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  ),
};

/**
 * Omitted value props retain the primitive's single minimum thumb, not a full-range selection.
 */
export const PrimitiveDefault: Story = {
  render: () => (
    <div className={storyClasses.story}>
      <div className={storyClasses.storyHeader}>No supplied value: starts at 20</div>
      <Slider
        aria-label='Primitive default'
        min={20}
        max={80}
      />
    </div>
  ),
};

/**
 * Both endpoint thumbs stay inside the control at its minimum and maximum.
 */
export const EdgeAligned: Story = {
  render: () => (
    <div className={storyClasses.story}>
      <Slider
        aria-label='Full range'
        defaultValue={[0, 100]}
      />
      <div className={storyClasses.storyLabels}>
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  ),
};

/**
 * Vertical scalar geometry uses a story-owned CSS container with a definite height.
 */
export const Vertical: Story = {
  render: () => (
    <div className={storyClasses.storyVertical}>
      <Slider
        aria-label='Vertical volume'
        defaultValue={50}
        orientation='vertical'
      />
      <Slider
        aria-label='Disabled vertical volume'
        defaultValue={50}
        orientation='vertical'
        disabled
      />
    </div>
  ),
};

function VerticalRangeDemo(): React.JSX.Element {
  const [range, setRange] = React.useState([25, 75]);
  return (
    <div className={storyClasses.story}>
      <div className={storyClasses.storyHeader}>
        <span>Vertical range</span>
        <output className={storyClasses.storyValue}>
          {range[0]} – {range[1]}
        </output>
      </div>
      <div className={storyClasses.storyVertical}>
        <Slider
          aria-label='Vertical range'
          orientation='vertical'
          value={range}
          onValueChange={setRange}
          step={5}
        />
        <Slider
          aria-label='Vertical endpoint alignment'
          orientation='vertical'
          defaultValue={[0, 100]}
        />
      </div>
    </div>
  );
}

/**
 * Independent vertical endpoints, live controlled values, and edge alignment at both limits.
 */
export const VerticalRange: Story = {
  render: () => <VerticalRangeDemo />,
};
