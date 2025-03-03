import type { Meta, StoryObj } from "@storybook/react";
import { buildTitleForComponent } from "./utils";

const meta: Meta<typeof Button> = {
  title: buildTitleForComponent(Button),
  component: Button,
};

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export default meta;
