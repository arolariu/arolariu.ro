import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Spinner} from "./spinner";

const meta = {
  component: Spinner,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Spinner className='h-8 w-8' />,
};

export const Small: Story = {
  render: () => <Spinner className='h-4 w-4' />,
};

export const Medium: Story = {
  render: () => <Spinner className='h-8 w-8' />,
};

export const Large: Story = {
  render: () => <Spinner className='h-16 w-16' />,
};
