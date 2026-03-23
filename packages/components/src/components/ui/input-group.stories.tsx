import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Search, Mail} from "lucide-react";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText} from "./input-group";

const meta = {
  title: "Components/Forms/InputGroup",
  component: InputGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Input group with text addon.
 */
export const WithAddon: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>.com</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
};

/**
 * Input group with button.
 */
export const WithButton: Story = {
  render: () => (
    <InputGroup>
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="sm">
          <Search className="h-4 w-4" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

/**
 * Input group with icon and button.
 */
export const WithIconAndButton: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <Mail className="h-4 w-4 text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupInput
        type="email"
        placeholder="Enter your email"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="xs" variant="default">
          Subscribe
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
