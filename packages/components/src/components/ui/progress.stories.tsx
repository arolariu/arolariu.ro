import {useEffect, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue} from "./progress";
const storyStyles = `
.ac-story-progress-storyDemo {
  width: min(100%, 25rem);
}

.ac-story-progress-storyTrack {
  height: 0.75rem;
  border-radius: 0.25rem;
}

.ac-story-progress-storyIndicator {
  border-radius: inherit;
  background-color: var(--ac-accent-foreground);
}

.ac-story-progress-storyStatus {
  color: var(--ac-muted-foreground);
  font-size: 0.75rem;
}
`;

const storyClasses = {
  storyDemo: "ac-story-progress-storyDemo",
  storyTrack: "ac-story-progress-storyTrack",
  storyIndicator: "ac-story-progress-storyIndicator",
  storyStatus: "ac-story-progress-storyStatus",
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
  title: "Components/Feedback/Progress",
  component: Progress,
  subcomponents: {ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue},
  tags: ["autodocs"],
  args: {
    "aria-label": "Task progress",
    className: storyClasses.storyDemo,
    locale: "en-US",
  },
  argTypes: {
    value: {
      control: {type: "range", min: 0, max: 100, step: 1},
      description: "Current value within min/max; null or omission is indeterminate",
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = {
  args: {
    value: 0,
  },
};

export const TwentyFive: Story = {
  args: {
    value: 25,
  },
};

export const Fifty: Story = {
  args: {
    value: 50,
  },
};

export const SeventyFive: Story = {
  args: {
    value: 75,
  },
};

export const Complete: Story = {
  args: {
    value: 100,
  },
};

/**
 * A nullable value keeps the progress status indeterminate.
 */
export const Indeterminate: Story = {
  args: {
    value: null,
  },
  render: (args: Readonly<Progress.Props>): React.JSX.Element => (
    <Progress {...args}>
      <ProgressLabel>Preparing transfer</ProgressLabel>
      <ProgressValue>{(_formatted, value) => (value === null ? "Waiting for a total" : value)}</ProgressValue>
    </Progress>
  ),
};

/**
 * Omitting value has the same indeterminate semantics as null.
 */
export const OmittedValue: Story = {
  render: (args: Readonly<Progress.Props>): React.JSX.Element => (
    <Progress {...args}>
      <ProgressLabel>Connecting</ProgressLabel>
    </Progress>
  ),
};

/**
 * Label and formatted Value precede a single automatically supplied track.
 */
export const WithLabel: Story = {
  args: {
    value: 65,
  },
  render: (args: Readonly<Progress.Props>): React.JSX.Element => (
    <Progress
      {...args}
      aria-label={undefined}>
      <ProgressLabel>Upload progress</ProgressLabel>
      <ProgressValue />
    </Progress>
  ),
};

/**
 * A direct compound Track replaces the default without duplicate markup.
 */
export const CustomTrack: Story = {
  args: {
    value: 40,
  },
  render: (args: Readonly<Progress.Props>): React.JSX.Element => (
    <Progress
      {...args}
      aria-label={undefined}>
      <ProgressLabel>Custom track</ProgressLabel>
      <ProgressValue />
      <ProgressTrack className={storyClasses.storyTrack}>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  ),
};

/**
 * Indicator styling and primitive render composition remain independent.
 */
export const CustomIndicator: Story = {
  args: {
    value: 75,
  },
  render: (args: Readonly<Progress.Props>): React.JSX.Element => (
    <Progress
      {...args}
      aria-label={undefined}>
      <ProgressLabel>Custom indicator</ProgressLabel>
      <ProgressValue />
      <ProgressTrack render={<div aria-describedby='custom-track-description' />}>
        <ProgressIndicator className={storyClasses.storyIndicator} />
      </ProgressTrack>
      <span
        id='custom-track-description'
        className={storyClasses.storyStatus}>
        The track and fill can be customized separately.
      </span>
    </Progress>
  ),
};

/**
 * Custom range, locale, formatting, and display callback share Root's value.
 */
export const FormattedValue: Story = {
  argTypes: {
    value: {
      control: {type: "range", min: 0, max: 1024, step: 1},
    },
  },
  args: {
    value: 512,
    max: 1024,
    format: {style: "unit", unit: "kilobyte"},
  },
  render: (args: Readonly<Progress.Props>): React.JSX.Element => (
    <Progress
      {...args}
      aria-label={undefined}
      getAriaValueText={(formatted) => `${formatted} transferred`}>
      <ProgressLabel>Transferred data</ProgressLabel>
      <ProgressValue>{(formatted) => `${formatted} of 1,024 kB`}</ProgressValue>
    </Progress>
  ),
};

/**
 * Every render callback receives Base UI's real progressing/completed state.
 */
export const RenderState: Story = {
  args: {
    value: 100,
  },
  render: (args: Readonly<Progress.Props>): React.JSX.Element => (
    <Progress
      {...args}
      aria-label={undefined}
      render={(props, state) => (
        <div
          {...props}
          data-render-status={state.status}>
          {props.children}
          <span className={storyClasses.storyStatus}>Status: {state.status}</span>
        </div>
      )}>
      <ProgressLabel>Rendered status</ProgressLabel>
      <ProgressValue />
    </Progress>
  ),
};

/**
 * Animates a controlled value from zero to completion with timer cleanup.
 */
function AnimatedProgressComponent(): React.JSX.Element {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (progress >= 100) {
      return;
    }

    const timer = setTimeout(() => {
      setProgress((previous) => Math.min(previous + 1, 100));
    }, 50);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <Progress
      value={progress}
      locale='en-US'
      className={storyClasses.storyDemo}>
      <ProgressLabel>Transfer progress</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
}

export const Animated: Story = {
  render: (): React.JSX.Element => <AnimatedProgressComponent />,
};
