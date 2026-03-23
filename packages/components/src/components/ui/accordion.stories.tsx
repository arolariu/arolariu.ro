import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "./accordion";

const meta = {
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
