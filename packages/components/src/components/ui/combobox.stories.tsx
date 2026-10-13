import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "./combobox";
import styles from "./combobox.module.css";

const meta = {
  title: "Components/Forms/Combobox",
  component: Combobox,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Fruit {
  readonly value: string;
  readonly label: string;
}

const apple: Fruit = {value: "apple", label: "Apple"};
const pear: Fruit = {value: "pear", label: "Pear"};
const items = [apple, pear];
const groups = [
  {value: "orchard", label: "Orchard", items: [apple]},
  {value: "garden", label: "Garden", items: [pear]},
];

function FruitList(): React.JSX.Element {
  return (
    <ComboboxList>
      {(item: Fruit) => (
        <ComboboxItem
          key={item.value}
          value={item}>
          {item.label}
        </ComboboxItem>
      )}
    </ComboboxList>
  );
}

function DefaultDemo(): React.JSX.Element {
  const [value, setValue] = React.useState<Fruit | null>(null);
  return (
    <div className={styles.story}>
      <Combobox
        items={items}
        value={value}
        onValueChange={setValue}>
        <ComboboxInput
          aria-label='Fruit'
          placeholder='Choose a fruit'
          showClear
        />
        <ComboboxContent>
          <FruitList />
          <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      <output aria-live='polite'>Selected: {value?.label ?? "None"}</output>
    </div>
  );
}

/** Canonical editable object-valued combobox with explicit clear and no-results content. */
export const Default: Story = {render: () => <DefaultDemo />};

/** Root metadata displays Apple immediately, without mounting the option list. */
export const ClosedSelectedValue: Story = {
  render: () => (
    <div className={styles.story}>
      <Combobox
        items={items}
        defaultValue={apple}>
        <ComboboxTrigger
          className={styles.valueTrigger}
          aria-label='Selected fruit'>
          <ComboboxValue placeholder='Choose a fruit' />
        </ComboboxTrigger>
        <ComboboxContent>
          <FruitList />
          <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

function MultipleDemo(): React.JSX.Element {
  const anchor = useComboboxAnchor();
  const [value, setValue] = React.useState<Fruit[]>([apple]);
  return (
    <div className={styles.story}>
      <Combobox
        items={items}
        multiple
        value={value}
        onValueChange={setValue}>
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(selected: readonly Fruit[]) =>
              selected.map((item) => (
                <ComboboxChip
                  key={item.value}
                  removeProps={{"aria-label": `Remove ${item.label}`}}>
                  {item.label}
                </ComboboxChip>
              ))
            }
          </ComboboxValue>
          <ComboboxChipsInput
            aria-label='Fruits'
            placeholder='Add fruit'
          />
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <FruitList />
          <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      <output aria-live='polite'>{value.length} selected</output>
    </div>
  );
}

/** Multiple selection uses real chips, removal controls and an explicit measured anchor. */
export const Multiple: Story = {render: () => <MultipleDemo />};

/** Collection renders only filtered groups/items, with accessible group labels. */
export const WithGroups: Story = {
  render: () => (
    <div className={styles.story}>
      <Combobox items={groups}>
        <ComboboxInput
          aria-label='Grouped fruits'
          placeholder='Search fruit groups'
        />
        <ComboboxContent>
          <ComboboxList>
            {(group: (typeof groups)[number], index: number) => (
              <React.Fragment key={group.value}>
                {index > 0 && <ComboboxSeparator />}
                <ComboboxGroup items={group.items}>
                  <ComboboxLabel>{group.label}</ComboboxLabel>
                  <ComboboxCollection>
                    {(item: Fruit) => (
                      <ComboboxItem
                        key={item.value}
                        value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxGroup>
              </React.Fragment>
            )}
          </ComboboxList>
          <ComboboxEmpty>No matching group.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

/** Root-owned disabled state reaches the editable input, trigger and clear control. */
export const Disabled: Story = {
  render: () => (
    <div className={styles.story}>
      <Combobox
        items={items}
        defaultValue={apple}
        disabled>
        <ComboboxInput
          aria-label='Disabled fruit'
          showClear
        />
        <ComboboxContent>
          <FruitList />
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

/** An input without addons preserves its own native ref, class and render contract. */
export const InputOnly: Story = {
  render: () => (
    <div className={styles.story}>
      <Combobox items={items}>
        <ComboboxInput
          aria-label='Fruit'
          placeholder='Type to search'
          showTrigger={false}
        />
        <ComboboxContent>
          <FruitList />
          <ComboboxEmpty>Try Apple or Pear.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

/** Each option is an object; Base UI serializes its `value` for native form submission. */
export const NativeForm: Story = {
  render: () => (
    <form className={styles.story}>
      <Combobox
        items={items}
        defaultValue={pear}
        name='fruit'>
        <ComboboxInput
          aria-label='Submitted fruit'
          showClear
        />
        <ComboboxContent>
          <FruitList />
          <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      <p>The hidden form value is “pear”; the visible label is “Pear”.</p>
    </form>
  ),
};
