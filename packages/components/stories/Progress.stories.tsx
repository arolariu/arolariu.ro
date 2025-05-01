import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Progress, Button } from "../dist";

const meta: Meta<typeof Progress> = {
  title: "Design System/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof Progress>;

// Basic progress bar
export const Basic: Story = {
  render: () => (
    <div className="w-[60%] space-y-6">
      <Progress value={33} className="w-full" />
    </div>
  ),
};

// Different values
export const DifferentValues: Story = {
  render: () => (
    <div className="w-[60%] space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium">0%</div>
        <Progress value={0} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">25%</div>
        <Progress value={25} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">50%</div>
        <Progress value={50} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">75%</div>
        <Progress value={75} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">100%</div>
        <Progress value={100} />
      </div>
    </div>
  ),
};

// Custom colors
export const CustomColors: Story = {
  render: () => (
    <div className="w-[60%] space-y-6">
      <Progress
        value={45}
        className="w-full bg-blue-100 dark:bg-blue-950"
        indicatorClassName="bg-blue-600 dark:bg-blue-400"
      />
      <Progress
        value={60}
        className="w-full bg-green-100 dark:bg-green-950"
        indicatorClassName="bg-green-600 dark:bg-green-400"
      />
      <Progress
        value={75}
        className="w-full bg-amber-100 dark:bg-amber-950"
        indicatorClassName="bg-amber-600 dark:bg-amber-400"
      />
      <Progress
        value={90}
        className="w-full bg-red-100 dark:bg-red-950"
        indicatorClassName="bg-red-600 dark:bg-red-400"
      />
    </div>
  ),
};

// With labels
export const WithLabels: Story = {
  render: () => (
    <div className="w-[60%] space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <div>Uploading...</div>
          <div>45%</div>
        </div>
        <Progress value={45} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <div>Processing...</div>
          <div>67%</div>
        </div>
        <Progress value={67} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <div>Complete</div>
          <div>100%</div>
        </div>
        <Progress value={100} />
      </div>
    </div>
  ),
};

// Different sizes
export const DifferentSizes: Story = {
  render: () => (
    <div className="w-[60%] space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium">Small (h-2)</div>
        <Progress value={75} className="h-2" />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Default (h-4)</div>
        <Progress value={75} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Large (h-6)</div>
        <Progress value={75} className="h-6" />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Extra Large (h-8)</div>
        <Progress value={75} className="h-8" />
      </div>
    </div>
  ),
};

// Interactive progress
export const Interactive: Story = {
  render: function InteractiveProgress() {
    const [progress, setProgress] = React.useState(0);

    function onClick() {
      setProgress(0);
      const timer = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prevProgress + 5;
        });
      }, 200);
      return () => clearInterval(timer);
    }

    return (
      <div className="w-[60%] space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <div>
              {progress === 100
                ? "Upload complete"
                : progress === 0
                ? "Ready to upload"
                : "Uploading..."}
            </div>
            <div>{progress}%</div>
          </div>
          <Progress value={progress} />
        </div>
        <Button onClick={onClick}>
          {progress === 100
            ? "Upload again"
            : progress === 0
            ? "Start upload"
            : "Uploading..."}
        </Button>
      </div>
    );
  },
};

// Indeterminate progress
export const Indeterminate: Story = {
  render: () => (
    <div className="w-[60%] space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium">Indeterminate</div>
        <Progress className="h-4 w-full">
          <div className="h-full w-full bg-primary/10 dark:bg-primary/20">
            <div
              className="h-full bg-primary animate-[indeterminate_1s_ease-in-out_infinite] will-change-transform dark:bg-primary"
              style={{
                width: "30%",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        </Progress>
        <style jsx>{`
          @keyframes indeterminate {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(200%);
            }
          }
        `}</style>
      </div>
    </div>
  ),
};

// Progress with steps
export const WithSteps: Story = {
  render: function ProgressWithSteps() {
    const [currentStep, setCurrentStep] = React.useState(1);
    const totalSteps = 4;
    const progress = (currentStep / totalSteps) * 100;

    return (
      <div className="w-[60%] space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <div>
              Step {currentStep} of {totalSteps}
            </div>
            <div>{Math.round(progress)}%</div>
          </div>
          <Progress value={progress} />
        </div>
        <div className="flex justify-between">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <Button
              key={index}
              variant={currentStep > index ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentStep(index + 1)}
            >
              Step {index + 1}
            </Button>
          ))}
        </div>
      </div>
    );
  },
};

// Animated progress bar
export const Animated: Story = {
  render: function AnimatedProgress() {
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
      const timer = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress === 100) {
            return 0;
          }
          return oldProgress + 10;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    }, []);

    return (
      <div className="w-[60%] space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <div>Auto-incrementing progress</div>
            <div>{progress}%</div>
          </div>
          <Progress
            value={progress}
            className="transition-all duration-500 ease-in-out"
          />
        </div>
      </div>
    );
  },
};
