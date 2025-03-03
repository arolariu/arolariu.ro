import type { Meta, StoryObj } from "@storybook/react";
import { buildTitleForComponent } from "./utils";
import { Dialog } from "@/index";

const meta: Meta<typeof Dialog> = {
  title: buildTitleForComponent(Dialog),
  component: Dialog,
};

type Story = StoryObj<typeof Dialog>;

export const Primary: Story = {};

export default meta;
