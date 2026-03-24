import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "./accordion";

const meta = {
  title: "Components/Layout/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <Accordion
      type='single'
      collapsible
      defaultValue='item-1'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>Yes. It comes with default styles that can be customized.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>Yes. It uses CSS animations for smooth transitions.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion
      type='multiple'
      defaultValue={["item-1", "item-2"]}>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Feature 1</AccordionTrigger>
        <AccordionContent>Description of feature 1.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Feature 2</AccordionTrigger>
        <AccordionContent>Description of feature 2.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>Feature 3</AccordionTrigger>
        <AccordionContent>Description of feature 3.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const DisabledItems: Story = {
  render: () => (
    <Accordion
      type='single'
      collapsible>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Active Item 1</AccordionTrigger>
        <AccordionContent>This item can be toggled normally.</AccordionContent>
      </AccordionItem>
      <AccordionItem
        value='item-2'
        disabled>
        <AccordionTrigger style={{opacity: 0.5, cursor: "not-allowed"}}>Disabled Item 2</AccordionTrigger>
        <AccordionContent>This content cannot be accessed.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>Active Item 3</AccordionTrigger>
        <AccordionContent>This item can be toggled normally.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Accordion
      type='single'
      collapsible>
      <AccordionItem value='item-1'>
        <AccordionTrigger>
          <span style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <span style={{fontSize: "1.25rem"}}>📦</span>
            <span>Shipping Information</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>Standard shipping takes 3-5 business days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>
          <span style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <span style={{fontSize: "1.25rem"}}>💳</span>
            <span>Payment Methods</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>We accept Visa, MasterCard, and PayPal.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>
          <span style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <span style={{fontSize: "1.25rem"}}>🔒</span>
            <span>Security & Privacy</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>Your data is encrypted and securely stored.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <Accordion
      type='single'
      collapsible
      defaultValue='item-1'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Pre-expanded Section</AccordionTrigger>
        <AccordionContent>This section is open by default when the component mounts.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Collapsed Section</AccordionTrigger>
        <AccordionContent>This section starts collapsed.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>Another Collapsed Section</AccordionTrigger>
        <AccordionContent>This section also starts collapsed.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
