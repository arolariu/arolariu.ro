import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Scratcher, type ScratcherProps} from "./scratcher";

function ResettableCard(args: Readonly<ScratcherProps>): React.JSX.Element {
  const [reset, setReset] = React.useState(0);
  const [completions, setCompletions] = React.useState(0);
  return (
    <div className={storyClasses.demo}>
      <Scratcher
        key={reset}
        {...args}
        onComplete={(): void => {
          setCompletions((count) => count + 1);
          args.onComplete?.();
        }}
      />
      <button
        type='button'
        onClick={(): void => {
          setReset((count) => count + 1);
        }}>
        Reset card
      </button>
      <p role='status'>Completed {completions} times</p>
    </div>
  );
}
const storyStyles = `
.ac-story-scratcher-demo {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: 2rem;
}

.ac-story-scratcher-demoPrize {
  display: grid;
  width: 100%;
  height: 100%;
  place-content: center;
  border-radius: var(--ac-radius-lg);
  color: var(--ac-foreground);
  background: var(--ac-muted);
  font-size: 1.5rem;
}
`;

const storyClasses = {
  demo: "ac-story-scratcher-demo",
  demoPrize: "ac-story-scratcher-demoPrize",
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
  title: "Components/Interactions/Scratcher",
  component: Scratcher,
  tags: ["autodocs"],
  args: {width: 320, height: 180, minScratchPercentage: 50, children: <div className={storyClasses.demoPrize}>Content revealed</div>},
  argTypes: {
    width: {control: {type: "number", min: 1}},
    height: {control: {type: "number", min: 1}},
    minScratchPercentage: {control: {type: "range", min: 0, max: 100}},
  },
  parameters: {
    docs: {
      description: {
        component:
          "Pointer scratching and a native keyboard reveal button complete the same card. Children are always mounted and accessible: this is not a security gate. Dimensions/gradient reset the bitmap. Reduced motion finishes feedback immediately.",
      },
    },
  },
  render: (args) => <ResettableCard {...args} />,
} satisfies Meta<typeof Scratcher>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const CustomGradient: Story = {args: {gradientColors: ["#ff0080", "#ff8c00", "#40e0d0"]}};
export const Large: Story = {args: {width: 400, height: 250, minScratchPercentage: 30}};
/**
 * Tab to the reveal button and activate it: completion is equivalent to pointer scratching, and focus stays on the button,
 * which becomes `aria-disabled` (still focusable, activation ignored) until the card resets.
 */
export const KeyboardReveal: Story = {args: {revealLabel: "Reveal the card", completedLabel: "Card revealed"}};
