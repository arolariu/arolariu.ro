import {useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxItem, ComboboxSeparator, ComboboxTrigger} from "./combobox";

const meta = {
  title: "Components/Forms/Combobox",
  component: Combobox,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    componentSubtitle: "🆕 New in v1.0",
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const frameworks = [
  {value: "next.js", label: "Next.js"},
  {value: "react", label: "React"},
  {value: "vue", label: "Vue"},
  {value: "svelte", label: "Svelte"},
  {value: "angular", label: "Angular"},
  {value: "ember", label: "Ember"},
];

/**
 * Default combobox with searchable select.
 */
export const Default: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState("");

    return (
      <Combobox
        value={value}
        onValueChange={setValue}>
        <ComboboxTrigger />
        <ComboboxContent>
          {frameworks.map((framework) => (
            <ComboboxItem
              key={framework.value}
              value={framework.value}>
              {framework.label}
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>
    );
  },
};

/**
 * Combobox with grouped items.
 */
export const WithGroups: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState("");

    return (
      <Combobox
        value={value}
        onValueChange={setValue}
        placeholder='Select a fruit or vegetable...'>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxGroup heading='Fruits'>
            <ComboboxItem value='apple'>Apple</ComboboxItem>
            <ComboboxItem value='banana'>Banana</ComboboxItem>
            <ComboboxItem value='orange'>Orange</ComboboxItem>
          </ComboboxGroup>
          <ComboboxSeparator />
          <ComboboxGroup heading='Vegetables'>
            <ComboboxItem value='carrot'>Carrot</ComboboxItem>
            <ComboboxItem value='broccoli'>Broccoli</ComboboxItem>
            <ComboboxItem value='spinach'>Spinach</ComboboxItem>
          </ComboboxGroup>
        </ComboboxContent>
      </Combobox>
    );
  },
};

/**
 * Combobox with custom empty state.
 */
export const WithCustomEmpty: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState("");

    return (
      <Combobox
        value={value}
        onValueChange={setValue}
        emptyMessage='No framework found. Try different keywords.'>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxEmpty>No matches found. Try another search term.</ComboboxEmpty>
          {frameworks.map((framework) => (
            <ComboboxItem
              key={framework.value}
              value={framework.value}>
              {framework.label}
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>
    );
  },
};

/**
 * Combobox with many items to demonstrate scrolling.
 */
export const WithManyItems: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState("");

    const items = Array.from({length: 50}, (_, i) => ({
      value: `item-${i + 1}`,
      label: `Item ${i + 1}`,
    }));

    return (
      <Combobox
        value={value}
        onValueChange={setValue}
        placeholder='Select an item...'>
        <ComboboxTrigger />
        <ComboboxContent>
          {items.map((item) => (
            <ComboboxItem
              key={item.value}
              value={item.value}>
              {item.label}
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>
    );
  },
};
