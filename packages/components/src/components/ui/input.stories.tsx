import {Search} from "lucide-react";
import {Field as BaseField} from "@base-ui/react/field";
import {type JSX, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Field, FieldContent, FieldError, FieldLabel} from "./field";
import {Input} from "./input";
import {InputGroup, InputGroupAddon, InputGroupInput} from "./input-group";

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
    "aria-label": "Text",
  },
};

export const Email: Story = {
  args: {
    type: "email",
    placeholder: "name@example.com",
    "aria-label": "Email",
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter password...",
    "aria-label": "Password",
  },
};

export const WithValue: Story = {
  args: {
    type: "text",
    defaultValue: "Pre-filled value",
    "aria-label": "Editable value",
  },
};

export const Disabled: Story = {
  args: {
    type: "text",
    placeholder: "Disabled input",
    disabled: true,
    "aria-label": "Disabled input",
  },
};

export const Number: Story = {
  args: {
    type: "number",
    placeholder: "Enter a number...",
    "aria-label": "Number",
  },
};

export const WithError: Story = {
  args: {
    type: "text",
    placeholder: "Enter valid email",
    defaultValue: "invalid-email",
  },
  render: (args) => (
    <Field data-invalid='true'>
      <FieldLabel htmlFor='error-email'>Email</FieldLabel>
      <FieldContent>
        <Input
          {...args}
          id='error-email'
          aria-invalid='true'
          aria-describedby='error-message'
        />
        <FieldError id='error-message'>Please enter a valid email address</FieldError>
      </FieldContent>
    </Field>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <Search aria-hidden='true' />
      </InputGroupAddon>
      <InputGroupInput
        type='search'
        aria-label='Search'
        placeholder='Search...'
      />
    </InputGroup>
  ),
};

function ControlledDemo(): JSX.Element {
  const [value, setValue] = useState("");
  return (
    <BaseField.Root>
      <BaseField.Label>Controlled name</BaseField.Label>
      <Input
        value={value}
        onValueChange={setValue}
        render={(props, state) => (
          <input
            {...props}
            data-filled={state.filled}
          />
        )}
      />
      <output aria-live='polite'>{value || "Enter a name"}</output>
    </BaseField.Root>
  );
}

/** Primitive-owned render state and controlled value updates without wrapper state. */
export const ControlledComposition: Story = {render: () => <ControlledDemo />};
