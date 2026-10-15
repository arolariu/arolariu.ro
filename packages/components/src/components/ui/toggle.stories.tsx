import {Bold, Italic} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Toggle} from "./toggle";
const storyStyles = `
.ac-story-toggle-storyRow {
  display: flex;
  align-items: center;
  gap: var(--ac-space-2);
}

.ac-story-toggle-storyStack {
  display: grid;
  gap: var(--ac-space-4);
}
`;

const storyClasses = {
  storyRow: "ac-story-toggle-storyRow",
  storyStack: "ac-story-toggle-storyStack",
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
  title: "Components/Actions/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
  args: {"aria-label": "Toggle bold", children: "Bold"},
  argTypes: {
    variant: {control: "select", options: ["default", "outline"]},
    size: {control: "select", options: ["sm", "default", "lg"]},
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithIcon: Story = {
  render: () => (
    <Toggle aria-label='Toggle italic'>
      <Italic aria-hidden='true' />
    </Toggle>
  ),
};
export const Outline: Story = {args: {variant: "outline"}};
export const Disabled: Story = {args: {disabled: true}};
export const Sizes: Story = {
  render: () => (
    <div className={storyClasses.storyRow}>
      <Toggle size='sm'>Small</Toggle>
      <Toggle>Default</Toggle>
      <Toggle size='lg'>Large</Toggle>
    </div>
  ),
};

function ControlledDemo(): React.JSX.Element {
  const [pressed, setPressed] = React.useState(false);
  return (
    <div className={storyClasses.storyStack}>
      <Toggle
        pressed={pressed}
        onPressedChange={setPressed}
        aria-label='Toggle bold'
        render={(props, state) => (
          <button
            {...props}
            data-contract-pressed={String(state.pressed)}
          />
        )}>
        <Bold aria-hidden='true' />
        Bold
      </Toggle>
      <output>Status: {pressed ? "Pressed" : "Not pressed"}</output>
    </div>
  );
}

export const Controlled: Story = {render: () => <ControlledDemo />};
export const NonNativeComposition: Story = {
  render: () => (
    <Toggle
      nativeButton={false}
      render={<span />}
      aria-label='Span toggle'>
      Use Enter or Space
    </Toggle>
  ),
};
