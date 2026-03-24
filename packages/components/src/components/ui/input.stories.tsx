import {Search} from "lucide-react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Input} from "./input";

const meta = {
  title: "Components/Forms/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "tel", "url"],
      description: "The HTML input type",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: "text",
    placeholder: "Enter text...",
  },
};

export const Email: Story = {
  args: {
    type: "email",
    placeholder: "name@example.com",
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter password...",
  },
};

export const WithValue: Story = {
  args: {
    type: "text",
    defaultValue: "Pre-filled value",
  },
};

export const Disabled: Story = {
  args: {
    type: "text",
    placeholder: "Disabled input",
    disabled: true,
  },
};

export const Number: Story = {
  args: {
    type: "number",
    placeholder: "Enter a number...",
  },
};

export const WithError: Story = {
  args: {
    type: "text",
    placeholder: "Enter valid email",
    defaultValue: "invalid-email",
  },
  render: (args) => (
    <div style={{width: "300px"}}>
      <Input
        {...args}
        style={{borderColor: "red", borderWidth: "2px"}}
        aria-invalid='true'
        aria-describedby='error-message'
      />
      <p
        id='error-message'
        style={{color: "red", fontSize: "0.875rem", marginTop: "0.25rem"}}>
        Please enter a valid email address
      </p>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div style={{position: "relative", width: "300px"}}>
      <Search
        style={{
          position: "absolute",
          left: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "16px",
          height: "16px",
          opacity: 0.5,
        }}
      />
      <Input
        type='text'
        placeholder='Search...'
        style={{paddingLeft: "36px"}}
      />
    </div>
  ),
};
