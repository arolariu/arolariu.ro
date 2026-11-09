import {Mail, Search} from "lucide-react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea} from "./input-group";

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
      <InputGroupAddon align='inline-start'>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        aria-label='Website address'
        placeholder='example.com'
      />
      <InputGroupAddon align='inline-end'>
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
      <InputGroupInput
        aria-label='Search query'
        placeholder='Search...'
      />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton
          size='icon-sm'
          aria-label='Search'>
          <Search aria-hidden='true' />
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
      <InputGroupAddon align='inline-start'>
        <Mail aria-hidden='true' />
      </InputGroupAddon>
      <InputGroupInput
        type='email'
        placeholder='Enter your email'
        aria-label='Email address'
      />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton
          size='xs'
          variant='default'>
          Subscribe
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

/** Block addons focus the native multiline control while button clicks keep button focus. */
export const Multiline: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon align='block-start'>
        <InputGroupText>Message</InputGroupText>
      </InputGroupAddon>
      <InputGroupTextarea
        aria-label='Message'
        placeholder='Write a message...'
        rows={4}
        data-sizing='content'
      />
      <InputGroupAddon align='block-end'>
        <InputGroupButton variant='default'>Send</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const Invalid: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>@</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        aria-label='Invalid username'
        aria-invalid='true'
        defaultValue='Not available'
      />
    </InputGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        aria-label='Disabled website'
        disabled
      />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton disabled>Open</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

/** Actual Button render state, content and navigation semantics inside group chrome. */
export const ComposedButton: Story = {
  render: () => (
    <InputGroup>
      <InputGroupInput
        aria-label='Documentation search'
        placeholder='Search docs'
      />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton
          nativeButton={false}
          size='xs'
          render={(props, state) => (
            <a
              {...props}
              href='#docs'
              data-size={state.size}
            />
          )}>
          Docs
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
