import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {ButtonGroup, ButtonGroupSeparator, ButtonGroupText} from "./button-group";

const meta = {
  title: "Components/Actions/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Horizontal button group with multiple actions.
 */
export const Horizontal: Story = {
  render: () => (
    <ButtonGroup orientation="horizontal">
      <Button variant="outline">Left</Button>
      <Button variant="outline">Center</Button>
      <Button variant="outline">Right</Button>
    </ButtonGroup>
  ),
};

/**
 * Vertical button group with separators.
 */
export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">Option A</Button>
      <ButtonGroupSeparator orientation="horizontal" />
      <Button variant="outline">Option B</Button>
      <ButtonGroupSeparator orientation="horizontal" />
      <Button variant="outline">Option C</Button>
    </ButtonGroup>
  ),
};

/**
 * Button group with text label.
 */
export const WithText: Story = {
  render: () => (
    <ButtonGroup orientation="horizontal">
      <ButtonGroupText>Actions:</ButtonGroupText>
      <Button variant="default" size="sm">
        Save
      </Button>
      <Button variant="outline" size="sm">
        Cancel
      </Button>
    </ButtonGroup>
  ),
};
