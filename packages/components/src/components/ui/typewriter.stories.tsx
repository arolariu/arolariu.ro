import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {cn} from "@/lib/utilities";
import {Button} from "./button";
import {TypewriterText, TypewriterTextSmooth} from "./typewriter";
import styles from "./typewriter.module.css";

const meta = {
  title: "Components/Typography/Typewriter",
  component: TypewriterText,
  tags: ["autodocs"],
  args: {words: [{text: "Welcome"}, {text: "to"}, {text: "the"}, {text: "future"}]},
} satisfies Meta<typeof TypewriterText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const StyledWords: Story = {
  args: {words: [{text: "Build"}, {text: "accessible", className: cn(styles.storyAccent)}, {text: "interfaces"}]},
};
export const Smooth: Story = {
  render: (args) => (
    <TypewriterTextSmooth
      {...args}
      aria-label='Smooth greeting'
    />
  ),
};
export const LongText: Story = {
  args: {words: [{text: "Experience"}, {text: "the"}, {text: "power"}, {text: "of"}, {text: "accessible"}, {text: "text"}]},
};
export const CodeTyping: Story = {
  args: {words: [{text: "npm"}, {text: "install"}, {text: "@arolariu/components"}], className: styles.storyCode},
};
export const MultiLine: Story = {
  render: (args) => (
    <div className={styles.storyStack}>
      <TypewriterText {...args} />
      <TypewriterTextSmooth words={[{text: "Complete"}, {text: "accessible"}, {text: "phrase"}]} />
    </div>
  ),
};

function ChangingWords(): React.JSX.Element {
  const [changed, setChanged] = React.useState(false);
  const words = changed ? [{text: "Updated"}, {text: "phrase"}] : [{text: "Initial"}, {text: "phrase"}];
  return (
    <div className={styles.storyStack}>
      <TypewriterText words={words} />
      <TypewriterTextSmooth words={words} />
      <Button
        size='sm'
        onClick={() => setChanged((value) => !value)}>
        Change words
      </Button>
      <p>Enable reduced motion in your operating system to see the completed static state.</p>
    </div>
  );
}
export const DynamicWords: Story = {render: () => <ChangingWords />};
