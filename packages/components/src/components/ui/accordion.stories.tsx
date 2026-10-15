import * as React from "react";
import type {Decorator, Meta, StoryObj} from "storybook-react-rsbuild";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "./accordion";
const storyStyles = `
.ac-story-accordion-demo {
  width: min(100%, 28rem);
}

.ac-story-accordion-demoActions,
.ac-story-accordion-label {
  display: flex;
  align-items: center;
  gap: var(--ac-space-3);
}
`;

const storyClasses = {
  demo: "ac-story-accordion-demo",
  demoActions: "ac-story-accordion-demoActions",
  label: "ac-story-accordion-label",
} as const;

const meta = {
  decorators: [
    (Story: Parameters<Decorator>[0]) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
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
      className={storyClasses.demo}
      defaultValue={["item-1"]}>
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
      multiple
      className={storyClasses.demo}
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
    <Accordion collapsible>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Active Item 1</AccordionTrigger>
        <AccordionContent>This item can be toggled normally.</AccordionContent>
      </AccordionItem>
      <AccordionItem
        value='item-2'
        disabled>
        <AccordionTrigger>Disabled Item 2</AccordionTrigger>
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
    <Accordion collapsible>
      <AccordionItem value='item-1'>
        <AccordionTrigger>
          <span className={storyClasses.label}>
            <span aria-hidden>📦</span>
            <span>Shipping Information</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>Standard shipping takes 3-5 business days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>
          <span className={storyClasses.label}>
            <span aria-hidden>💳</span>
            <span>Payment Methods</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>We accept Visa, MasterCard, and PayPal.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>
          <span className={storyClasses.label}>
            <span aria-hidden>🔒</span>
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
      collapsible
      defaultValue={["item-1"]}>
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

export const NonCollapsible: Story = {
  render: () => (
    <Accordion
      collapsible={false}
      defaultValue={["item-1"]}>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Always keep a section open</AccordionTrigger>
        <AccordionContent>Cancellation prevents closing the last open panel.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Switch to this section</AccordionTrigger>
        <AccordionContent>Switching remains available with pointer and keyboard activation.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const EmptyStringIdentifier: Story = {
  render: () => (
    <Accordion defaultValue={[""]}>
      <AccordionItem value=''>
        <AccordionTrigger>Empty-string identifier</AccordionTrigger>
        <AccordionContent>Canonical arrays distinguish this item from no selection.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

function ControlledEmptyDemo(): React.JSX.Element {
  const [value, setValue] = React.useState<string[]>([]);

  return (
    <div className={storyClasses.demo}>
      <div className={storyClasses.demoActions}>
        <button
          type='button'
          onClick={() => setValue([])}>
          Clear selection
        </button>
        <button
          type='button'
          onClick={() => setValue(["item-1"])}>
          Open section
        </button>
      </div>
      <Accordion
        value={value}
        onValueChange={setValue}>
        <AccordionItem value='item-1'>
          <AccordionTrigger render={<button />}>Controlled section</AccordionTrigger>
          <AccordionContent>An empty array stays controlled on every rerender.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export const ControlledEmpty: Story = {
  render: () => <ControlledEmptyDemo />,
};

export const StateAwareRendering: Story = {
  render: () => (
    <Accordion
      render={(props, state) => (
        <section
          {...props}
          aria-label={`Accordion with ${state.value.length} open sections`}
        />
      )}>
      <AccordionItem value='item-1'>
        <AccordionTrigger
          render={(props, state) => (
            <button
              {...props}
              data-open={state.open}
            />
          )}>
          Live primitive state
        </AccordionTrigger>
        <AccordionContent
          render={(props, state) => (
            <section
              {...props}
              data-transition={state.transitionStatus}
            />
          )}>
          Render callbacks receive the real open and transition state.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
