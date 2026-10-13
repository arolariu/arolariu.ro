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
    <ButtonGroup orientation='horizontal'>
      <Button variant='outline'>Left</Button>
      <Button variant='outline'>Center</Button>
      <Button variant='outline'>Right</Button>
    </ButtonGroup>
  ),
};

/**
 * Vertical button group with separators.
 */
export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation='vertical'>
      <Button variant='outline'>Option A</Button>
      <ButtonGroupSeparator orientation='horizontal' />
      <Button variant='outline'>Option B</Button>
      <ButtonGroupSeparator orientation='horizontal' />
      <Button variant='outline'>Option C</Button>
    </ButtonGroup>
  ),
};

/**
 * Button group with text label.
 */
export const WithText: Story = {
  render: () => (
    <ButtonGroup orientation='horizontal'>
      <ButtonGroupText>Actions:</ButtonGroupText>
      <Button
        variant='default'
        size='sm'>
        Save
      </Button>
      <Button
        variant='outline'
        size='sm'>
        Cancel
      </Button>
    </ButtonGroup>
  ),
};

/** Composed labels retain their native association with the adjacent input. */
export const RenderedLabel = {
  render: () => (
    <ButtonGroup aria-label='Quantity control'>
      <ButtonGroupText render={<label htmlFor='story-quantity' />}>Quantity</ButtonGroupText>
      <input
        id='story-quantity'
        type='number'
        defaultValue={1}
        min={1}
      />
      <Button variant='outline'>Apply</Button>
    </ButtonGroup>
  ),
} satisfies Story;

/** The text callback receives Base UI slot state rather than an outer placeholder. */
export const CallbackText = {
  render: () => (
    <ButtonGroup aria-label='Page navigation'>
      <ButtonGroupText
        render={(props, state) => (
          <div
            {...props}
            aria-label={state.slot}>
            Page 1 of 5
          </div>
        )}
      />
      <ButtonGroupSeparator />
      <Button
        nativeButton={false}
        render={<div />}
        variant='outline'>
        Next
      </Button>
      <Button
        disabled
        variant='outline'>
        Last page
      </Button>
    </ButtonGroup>
  ),
} satisfies Story;

/** Legacy child composition keeps the rendered child's content and attributes. */
export const LegacyText = {
  render: () => (
    <ButtonGroup aria-label='Display options'>
      <ButtonGroupText asChild>
        <span>Display</span>
      </ButtonGroupText>
      <Button
        size='xs'
        variant='outline'>
        Compact
      </Button>
      <Button
        size='xs'
        variant='outline'>
        Comfortable
      </Button>
    </ButtonGroup>
  ),
} satisfies Story;
