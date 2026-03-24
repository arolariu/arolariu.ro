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
function DefaultDemo() {
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
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

/**
 * Combobox with grouped items.
 */
function WithGroupsDemo() {
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
}

export const WithGroups: Story = {
  render: () => <WithGroupsDemo />,
};

/**
 * Combobox with custom empty state.
 */
function WithCustomEmptyDemo() {
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
}

export const WithCustomEmpty: Story = {
  render: () => <WithCustomEmptyDemo />,
};

/**
 * Combobox with many items to demonstrate scrolling.
 */
function WithManyItemsDemo() {
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
}

export const WithManyItems: Story = {
  render: () => <WithManyItemsDemo />,
};

/**
 * Combobox options with leading icons for visual clarity.
 */
function WithIconsDemo() {
  const [value, setValue] = useState("");

  const options = [
    {
      value: "javascript",
      label: "JavaScript",
      icon: (
        <svg
          style={{width: "16px", height: "16px", marginRight: "8px", color: "#f7df1e"}}
          fill='currentColor'
          viewBox='0 0 24 24'>
          <path d='M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z' />
        </svg>
      ),
    },
    {
      value: "typescript",
      label: "TypeScript",
      icon: (
        <svg
          style={{width: "16px", height: "16px", marginRight: "8px", color: "#3178c6"}}
          fill='currentColor'
          viewBox='0 0 24 24'>
          <path d='M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z' />
        </svg>
      ),
    },
    {
      value: "python",
      label: "Python",
      icon: (
        <svg
          style={{width: "16px", height: "16px", marginRight: "8px", color: "#3776ab"}}
          fill='currentColor'
          viewBox='0 0 24 24'>
          <path d='M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z' />
        </svg>
      ),
    },
    {
      value: "rust",
      label: "Rust",
      icon: (
        <svg
          style={{width: "16px", height: "16px", marginRight: "8px", color: "#ce422b"}}
          fill='currentColor'
          viewBox='0 0 24 24'>
          <path d='M23.834 8.101a13.912 13.912 0 0 1-13.643 11.72a10.105 10.105 0 0 1-1.994-.12a6.111 6.111 0 0 1-5.082-5.761a5.934 5.934 0 0 1 11.867-.084c.025.983-.401 1.846-1.277 1.871c-.936 0-1.374-.668-1.374-1.567v-2.5a1.531 1.531 0 0 0-1.52-1.533H8.715a3.648 3.648 0 1 0 2.695 6.08l.073-.11l.074.121a2.58 2.58 0 0 0 2.2 1.048a2.909 2.909 0 0 0 2.695-3.04a7.912 7.912 0 0 0-.217-1.933a7.404 7.404 0 0 0-14.64 1.603a7.497 7.497 0 0 0 7.308 7.405s.549.05 1.167.035a15.803 15.803 0 0 0 8.475-2.528c.036-.025.072.025.048.061a12.44 12.44 0 0 1-9.69 3.963a8.744 8.744 0 0 1-8.9-8.972a9.049 9.049 0 0 1 3.635-7.247a8.863 8.863 0 0 1 5.229-1.726h2.813a7.915 7.915 0 0 0 5.839-2.578a.11.11 0 0 1 .059-.034a.112.112 0 0 1 .12.053a.113.113 0 0 1 .015.067a7.934 7.934 0 0 1-1.227 3.549a.107.107 0 0 0-.014.06a.11.11 0 0 0 .073.095a.109.109 0 0 0 .062.004a8.505 8.505 0 0 0 5.913-4.876a.155.155 0 0 1 .055-.053a.15.15 0 0 1 .147 0a.153.153 0 0 1 .054.053A10.779 10.779 0 0 1 23.834 8.1zM8.895 11.628a2.188 2.188 0 1 0 2.188 2.188v-2.042a.158.158 0 0 0-.15-.15Z' />
        </svg>
      ),
    },
  ];

  return (
    <Combobox
      value={value}
      onValueChange={setValue}
      placeholder='Select a language...'>
      <ComboboxTrigger />
      <ComboboxContent>
        {options.map((option) => (
          <ComboboxItem
            key={option.value}
            value={option.value}>
            <div style={{display: "flex", alignItems: "center"}}>
              {option.icon}
              {option.label}
            </div>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  );
}

export const WithIcons: Story = {
  render: () => <WithIconsDemo />,
};

/**
 * Disabled combobox showing the disabled state.
 */
export const Disabled: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <label style={{fontSize: "14px", fontWeight: 500, color: "#9ca3af"}}>Select Framework</label>
      <Combobox
        value=''
        onValueChange={() => {}}
        placeholder='This combobox is disabled'
        disabled>
        <ComboboxTrigger style={{opacity: 0.5, cursor: "not-allowed"}} />
        <ComboboxContent>
          <ComboboxItem value='next'>Next.js</ComboboxItem>
          <ComboboxItem value='react'>React</ComboboxItem>
        </ComboboxContent>
      </Combobox>
      <p style={{fontSize: "12px", color: "#6b7280"}}>This field is currently disabled and cannot be interacted with.</p>
    </div>
  ),
};
