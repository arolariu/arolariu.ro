import {Bold, Italic, TextAlignCenter, TextAlignEnd, TextAlignStart, Underline} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ToggleGroup, ToggleGroupItem} from "./toggle-group";
import styles from "./toggle-group.module.css";

const meta = {
  title: "Components/Actions/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
  argTypes: {
    orientation: {control: "select", options: ["horizontal", "vertical"]},
    spacing: {control: "number"},
    variant: {control: "select", options: ["default", "outline"]},
    size: {control: "select", options: ["sm", "default", "lg"]},
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <ToggleGroup
      aria-label='Text alignment'
      defaultValue={["center"]}>
      <ToggleGroupItem
        value='left'
        aria-label='Align left'>
        <TextAlignStart aria-hidden='true' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='center'
        aria-label='Align center'>
        <TextAlignCenter aria-hidden='true' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='right'
        aria-label='Align right'>
        <TextAlignEnd aria-hidden='true' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Multiple: Story = {
  render: () => (
    <ToggleGroup
      aria-label='Formatting'
      defaultValue={["bold"]}
      multiple>
      <ToggleGroupItem
        value='bold'
        aria-label='Bold'>
        <Bold aria-hidden='true' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='italic'
        aria-label='Italic'>
        <Italic aria-hidden='true' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='underline'
        aria-label='Underline'>
        <Underline aria-hidden='true' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

function ControlledDemo(): React.JSX.Element {
  const [value, setValue] = React.useState<string[]>(["bold", "italic"]);
  return (
    <div className={styles.storyStack}>
      <ToggleGroup
        aria-label='Controlled formatting'
        value={value}
        onValueChange={setValue}
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold'
          render={(props, state) => (
            <button
              {...props}
              data-contract-pressed={String(state.pressed)}
            />
          )}>
          <Bold aria-hidden='true' />
        </ToggleGroupItem>
        <ToggleGroupItem
          value='italic'
          aria-label='Italic'>
          <Italic aria-hidden='true' />
        </ToggleGroupItem>
        <ToggleGroupItem
          value='underline'
          aria-label='Underline'>
          <Underline aria-hidden='true' />
        </ToggleGroupItem>
      </ToggleGroup>
      <output>Selected: {value.join(", ") || "none"}</output>
    </div>
  );
}

export const Controlled: Story = {render: () => <ControlledDemo />};
export const Joined: Story = {
  render: () => (
    <ToggleGroup
      aria-label='Joined outline'
      spacing={0}
      variant='outline'>
      <ToggleGroupItem value='one'>One</ToggleGroupItem>
      <ToggleGroupItem value='two'>Two</ToggleGroupItem>
      <ToggleGroupItem value='three'>Three</ToggleGroupItem>
    </ToggleGroup>
  ),
};
export const Vertical: Story = {
  render: () => (
    <ToggleGroup
      aria-label='Vertical joined'
      orientation='vertical'
      spacing={0}
      variant='outline'>
      <ToggleGroupItem value='one'>One</ToggleGroupItem>
      <ToggleGroupItem
        value='two'
        disabled>
        Two (disabled)
      </ToggleGroupItem>
      <ToggleGroupItem value='three'>Three</ToggleGroupItem>
    </ToggleGroup>
  ),
};
export const ItemOverrides: Story = {
  render: () => (
    <div className={styles.storyStack}>
      <p>Explicit item size and variant take precedence over group defaults.</p>
      <ToggleGroup
        aria-label='Item overrides'
        size='lg'
        variant='outline'
        spacing={3}>
        <ToggleGroupItem value='inherited'>Inherited large outline</ToggleGroupItem>
        <ToggleGroupItem
          value='override'
          size='sm'
          variant='default'>
          Small default override
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  ),
};
export const RightToLeft: Story = {
  render: () => (
    <div dir='rtl'>
      <ToggleGroup
        aria-label='RTL joined'
        spacing={0}
        variant='outline'>
        <ToggleGroupItem value='one'>One</ToggleGroupItem>
        <ToggleGroupItem value='two'>Two</ToggleGroupItem>
      </ToggleGroup>
    </div>
  ),
};
export const Disabled: Story = {
  render: () => (
    <ToggleGroup
      aria-label='Disabled formatting'
      disabled
      defaultValue={["bold"]}
      multiple>
      <ToggleGroupItem value='bold'>Bold</ToggleGroupItem>
      <ToggleGroupItem value='italic'>Italic</ToggleGroupItem>
    </ToggleGroup>
  ),
};
