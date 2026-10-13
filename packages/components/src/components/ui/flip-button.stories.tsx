import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {cn} from "@/lib/utilities";
import {FlipButton} from "./flip-button";
import styles from "./flip-button.module.css";

const meta = {
  title: "Components/Actions/FlipButton",
  component: FlipButton,
  tags: ["autodocs"],
  args: {frontText: "Show details", backText: "Open", from: "top"},
  argTypes: {from: {control: "select", options: ["top", "bottom", "left", "right"]}},
} satisfies Meta<typeof FlipButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FlipFromBottom: Story = {args: {from: "bottom"}};
export const FlipFromLeft: Story = {args: {from: "left"}};
/** Correct spelling; the old `righ` alias is deprecated, not removed. */
export const FlipFromRight: Story = {args: {from: "right"}};
export const CustomStyling: Story = {args: {className: cn(styles.storyLarge), frontClassName: cn(styles.storyFront)}};
export const Disabled: Story = {args: {disabled: true}};
export const CallerLabel: Story = {args: {"aria-label": "Open full documentation", frontText: "Docs", backText: "Read now"}};
