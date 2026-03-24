import {useEffect, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Progress} from "./progress";

const meta = {
  title: "Components/Feedback/Progress",
  component: Progress,
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: {type: "range", min: 0, max: 100, step: 1},
      description: "Completion percentage (0-100)",
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
 * Progress bar that animates from 0 to 100.
 */
function AnimatedProgressComponent(): React.JSX.Element {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{width: "100%", maxWidth: "400px"}}>
      <Progress value={progress} />
    </div>
  );
}

export const Animated: Story = {
  render: () => <AnimatedProgressComponent />,
};

/**
 * Progress bar with percentage label overlay.
 */
export const WithLabel: Story = {
  args: {
    value: 65,
  },
  render: (args) => (
    <div style={{width: "100%", maxWidth: "400px", position: "relative"}}>
      <Progress {...args} />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "12px",
          fontWeight: "600",
          color: "#fff",
          mixBlendMode: "difference",
        }}>
        {args.value}%
      </div>
    </div>
  ),
};
