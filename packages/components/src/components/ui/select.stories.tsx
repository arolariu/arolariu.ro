import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectTrigger, SelectValue} from "./select";

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
      <SelectTrigger>
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
      <SelectTrigger>
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
      <SelectTrigger disabled>
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
      <SelectTrigger>
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
      <SelectTrigger>
        <SelectValue placeholder='Select a country' />
      </SelectTrigger>
      <SelectContent style={{maxHeight: "200px"}}>
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
      <SelectTrigger>
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
