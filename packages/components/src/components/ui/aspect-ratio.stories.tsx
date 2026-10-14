import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {AspectRatio} from "./aspect-ratio";
const storyStyles = `
.ac-story-aspect-ratio-storyFrame {
  width: min(32rem, 100%);
  border-radius: var(--ac-radius-lg);
}

.ac-story-aspect-ratio-storyMedia {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  background-color: var(--ac-muted);
  color: var(--ac-muted-foreground);
}
`;

const storyClasses = {
  storyFrame: "ac-story-aspect-ratio-storyFrame",
  storyMedia: "ac-story-aspect-ratio-storyMedia",
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
  title: "Components/Layout/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
  argTypes: {ratio: {control: "text", description: "Numeric ratio or native CSS ratio string; takes precedence over caller ratio styles."}},
  render: (args): React.JSX.Element => (
    <div className={storyClasses.storyFrame}>
      <AspectRatio {...args} />
    </div>
  ),
} satisfies Meta<typeof AspectRatio>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {args: {children: <div className={storyClasses.storyMedia}>Default square</div>}};
export const Square: Story = {args: {ratio: 1, children: <div className={storyClasses.storyMedia}>1:1</div>}};
export const Widescreen: Story = {args: {ratio: 16 / 9, children: <div className={storyClasses.storyMedia}>16:9 numeric ratio</div>}};
export const Standard: Story = {args: {ratio: 4 / 3, children: <div className={storyClasses.storyMedia}>4:3</div>}};
export const StringRatio: Story = {
  args: {ratio: "16 / 9", children: <div className={storyClasses.storyMedia}>16 / 9 CSS ratio string</div>},
};
export const Video: Story = {
  args: {
    ratio: "16 / 9",
    children: (
      <svg
        className={storyClasses.storyMedia}
        role='img'
        aria-label='Video placeholder'
        viewBox='0 0 160 90'>
        <path
          d='m65 25 35 20-35 20Z'
          fill='currentColor'
        />
      </svg>
    ),
  },
};
