import type {Meta, StoryObj} from "@storybook/react-vite";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "./card";

const meta = {
  component: Card,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the card content area where you can put any content.</p>
      </CardContent>
      <CardFooter>
        <p className='text-sm text-gray-500'>Card footer</p>
      </CardFooter>
    </Card>
  ),
};

export const WithoutFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
        <CardDescription>A card without a footer</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content without footer section.</p>
      </CardContent>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card>
      <CardContent>
        <p>A minimal card with just content.</p>
      </CardContent>
    </Card>
  ),
};
