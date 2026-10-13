import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {AspectRatio} from "./aspect-ratio";
import styles from "./aspect-ratio.module.css";

const meta = {
  title: "Components/Layout/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
  argTypes: {ratio: {control: "text", description: "Numeric ratio or native CSS ratio string; takes precedence over caller ratio styles."}},
  render: (args): React.JSX.Element => (
    <div className={styles.storyFrame}>
      <AspectRatio {...args} />
    </div>
  ),
} satisfies Meta<typeof AspectRatio>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {args: {children: <div className={styles.storyMedia}>Default square</div>}};
export const Square: Story = {args: {ratio: 1, children: <div className={styles.storyMedia}>1:1</div>}};
export const Widescreen: Story = {args: {ratio: 16 / 9, children: <div className={styles.storyMedia}>16:9 numeric ratio</div>}};
export const Standard: Story = {args: {ratio: 4 / 3, children: <div className={styles.storyMedia}>4:3</div>}};
export const StringRatio: Story = {args: {ratio: "16 / 9", children: <div className={styles.storyMedia}>16 / 9 CSS ratio string</div>}};
export const Video: Story = {
  args: {
    ratio: "16 / 9",
    children: (
      <svg
        className={styles.storyMedia}
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
