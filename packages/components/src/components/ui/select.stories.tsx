import type {Meta, StoryObj} from "storybook-react-rsbuild";
import * as React from "react";
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from "./select";
import styles from "./select.module.css";

const meta = {
  title: "Components/Forms/Select",
  component: Select,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select defaultValue='apple'>
      <SelectTrigger aria-label='Fruit'>
        <SelectValue placeholder='Select a fruit' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem value='banana'>Banana</SelectItem>
        <SelectItem value='orange'>Orange</SelectItem>
        <SelectItem value='grape'>Grape</SelectItem>
        <SelectItem value='mango'>Mango</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithPlaceholder: Story = {
  render: () => (
    <Select>
      <SelectTrigger aria-label='Option'>
        <SelectValue placeholder='Choose an option...' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='option1'>Option 1</SelectItem>
        <SelectItem value='option2'>Option 2</SelectItem>
        <SelectItem value='option3'>Option 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select defaultValue='apple'>
      <SelectTrigger
        aria-label='Fruit'
        disabled>
        <SelectValue placeholder='Select a fruit' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem value='banana'>Banana</SelectItem>
        <SelectItem value='orange'>Orange</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger aria-label='Food'>
        <SelectValue placeholder='Select a food' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value='apple'>Apple</SelectItem>
          <SelectItem value='banana'>Banana</SelectItem>
          <SelectItem value='orange'>Orange</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          <SelectItem value='carrot'>Carrot</SelectItem>
          <SelectItem value='broccoli'>Broccoli</SelectItem>
          <SelectItem value='spinach'>Spinach</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Grains</SelectLabel>
          <SelectItem value='rice'>Rice</SelectItem>
          <SelectItem value='wheat'>Wheat</SelectItem>
          <SelectItem value='oats'>Oats</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const WithScrollButtons: Story = {
  render: () => (
    <Select>
      <SelectTrigger aria-label='Country'>
        <SelectValue placeholder='Select a country' />
      </SelectTrigger>
      <SelectContent listProps={{className: styles.scrollExample}}>
        <SelectItem value='us'>United States</SelectItem>
        <SelectItem value='uk'>United Kingdom</SelectItem>
        <SelectItem value='ca'>Canada</SelectItem>
        <SelectItem value='au'>Australia</SelectItem>
        <SelectItem value='de'>Germany</SelectItem>
        <SelectItem value='fr'>France</SelectItem>
        <SelectItem value='it'>Italy</SelectItem>
        <SelectItem value='es'>Spain</SelectItem>
        <SelectItem value='nl'>Netherlands</SelectItem>
        <SelectItem value='se'>Sweden</SelectItem>
        <SelectItem value='no'>Norway</SelectItem>
        <SelectItem value='dk'>Denmark</SelectItem>
        <SelectItem value='fi'>Finland</SelectItem>
        <SelectItem value='pl'>Poland</SelectItem>
        <SelectItem value='ch'>Switzerland</SelectItem>
        <SelectItem value='at'>Austria</SelectItem>
        <SelectItem value='be'>Belgium</SelectItem>
        <SelectItem value='ie'>Ireland</SelectItem>
        <SelectItem value='nz'>New Zealand</SelectItem>
        <SelectItem value='jp'>Japan</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Placeholder: Story = {
  render: () => (
    <Select>
      <SelectTrigger aria-label='Option'>
        <SelectValue placeholder='Please select an option...' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='one'>Option One</SelectItem>
        <SelectItem value='two'>Option Two</SelectItem>
        <SelectItem value='three'>Option Three</SelectItem>
      </SelectContent>
    </Select>
  ),
};

function MultipleSelectExample(): React.JSX.Element {
  const [value, setValue] = React.useState<readonly string[]>(["apple"]);
  return (
    <form>
      <Select
        multiple
        name='fruits'
        value={value}
        items={{apple: "Apple", banana: "Banana", orange: "Orange"}}
        onValueChange={setValue}>
        <SelectTrigger aria-label='Fruits'>
          <SelectValue placeholder='Choose fruits' />
        </SelectTrigger>
        <SelectContent listProps={{"aria-label": "Available fruits"}}>
          <SelectItem value='apple'>Apple</SelectItem>
          <SelectItem value='banana'>Banana</SelectItem>
          <SelectItem value='orange'>Orange</SelectItem>
        </SelectContent>
      </Select>
      <output
        className={styles.storyOutput}
        aria-live='polite'>
        Selected values: {value.join(", ") || "none"}
      </output>
    </form>
  );
}

export const Multiple: Story = {
  render: () => <MultipleSelectExample />,
};

const objectChoices = [
  {id: "serif", name: "Serif"},
  {id: "sans", name: "Sans-serif"},
  {id: "mono", name: "Monospace"},
];
type ObjectChoice = (typeof objectChoices)[number];

function ObjectSelectExample(): React.JSX.Element {
  const [value, setValue] = React.useState<ObjectChoice | null>({id: "serif", name: "Serif"});
  return (
    <Select
      value={value}
      name='font'
      itemToStringLabel={(item) => item.name}
      itemToStringValue={(item) => item.id}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      onValueChange={setValue}>
      <SelectTrigger aria-label='Font'>
        <SelectValue placeholder='Choose a font' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={null}>No font</SelectItem>
        {objectChoices.map((choice) => (
          <SelectItem
            key={choice.id}
            value={choice}>
            {choice.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const ObjectValuesAndNullClearing: Story = {
  render: () => <ObjectSelectExample />,
};

function FinalFocusExample(): React.JSX.Element {
  const target = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <Select>
        <SelectTrigger aria-label='Focus destination'>
          <SelectValue placeholder='Choose and move focus' />
        </SelectTrigger>
        <SelectContent
          finalFocus={target}
          alignItemWithTrigger={false}
          align='start'>
          <SelectItem value='a'>Alpha</SelectItem>
          <SelectItem value='b'>Beta</SelectItem>
        </SelectContent>
      </Select>
      <button
        className={styles.focusTarget}
        ref={target}>
        Focus returns here after closing
      </button>
    </>
  );
}

export const CustomFinalFocus: Story = {
  render: () => <FinalFocusExample />,
};

export const TriggerSizes: Story = {
  render: () => (
    <div className={styles.storyStack}>
      {(["default", "sm"] as const).map((size) => (
        <Select
          key={size}
          defaultValue='a'>
          <SelectTrigger
            size={size}
            aria-label={`${size} trigger`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='a'>Alpha</SelectItem>
            <SelectItem value='b'>Beta</SelectItem>
          </SelectContent>
        </Select>
      ))}
    </div>
  ),
};

export const PrimitiveStateComposition: Story = {
  render: () => (
    <Select
      defaultValue='a'
      items={{a: "Alpha", b: "Beta"}}>
      <SelectTrigger
        aria-label='Stateful select'
        render={(props, state) => (
          <button
            {...props}
            data-example-open={state.open}
          />
        )}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        render={<section />}
        alignItemWithTrigger={false}
        listProps={{"aria-label": "Stateful choices"}}>
        <SelectGroup render={<section />}>
          <SelectLabel>Examples</SelectLabel>
          <SelectItem
            value='a'
            render={(props, state) => (
              <div
                {...props}
                data-example-selected={state.selected}
              />
            )}>
            Alpha
          </SelectItem>
          <SelectItem
            value='b'
            disabled>
            Beta (disabled)
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
