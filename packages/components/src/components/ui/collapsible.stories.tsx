import {ChevronDown} from "lucide-react";
import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "./collapsible";
import styles from "./collapsible.module.css";

const meta = {
  title: "Components/Layout/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic collapsible panel.
 */
export const Default: Story = {
  render: () => (
    <Collapsible className={styles.demo}>
      <CollapsibleTrigger
        className={styles.demoTrigger}
        render={<button />}>
        Show details
        <ChevronDown
          aria-hidden
          className={styles.icon}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={styles.demoContent}>
        <p>This is the collapsible content. It can contain any type of content including text, images, or other components.</p>
      </CollapsibleContent>
    </Collapsible>
  ),
};

/**
 * Collapsible with default open state.
 */
export const DefaultOpen: Story = {
  render: () => (
    <Collapsible
      defaultOpen
      className={styles.demo}>
      <CollapsibleTrigger
        asChild
        className={styles.demoTrigger}>
        <button type='button'>
          Additional information
          <ChevronDown
            aria-hidden
            className={styles.icon}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className={styles.demoContent}>
        <p>Item 1: First piece of information</p>
        <p>Item 2: Second piece of information</p>
        <p>Item 3: Third piece of information</p>
      </CollapsibleContent>
    </Collapsible>
  ),
};

/**
 * Controlled collapsible.
 */
function ControlledDemo(): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={styles.demo}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={styles.demo}>
        <CollapsibleTrigger className={styles.demoTrigger}>
          Toggle content
          <ChevronDown
            aria-hidden
            className={styles.icon}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className={styles.demoContent}>
          <p>This collapsible is controlled. The state is managed externally and displayed below.</p>
        </CollapsibleContent>
      </Collapsible>
      <p>Status: {isOpen ? "Open" : "Closed"}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

/**
 * Primitive transitions and chevron motion honor reduced-motion preferences.
 */
export const Animated: Story = {
  render: () => (
    <Collapsible className={styles.demo}>
      <CollapsibleTrigger className={styles.demoTrigger}>
        Animated details
        <ChevronDown
          aria-hidden
          className={styles.icon}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={styles.demoContent}>
        <p>Opacity and icon transitions use CSS Modules and existing design tokens.</p>
        <p>Both transitions are disabled when reduced motion is requested.</p>
      </CollapsibleContent>
    </Collapsible>
  ),
};

/**
 * Nested collapsible panels.
 */
export const Nested: Story = {
  render: () => (
    <Collapsible className={styles.demo}>
      <CollapsibleTrigger className={styles.demoTrigger}>Parent Section</CollapsibleTrigger>
      <CollapsibleContent className={styles.demoContent}>
        <p>This is the parent content area.</p>
        <Collapsible>
          <CollapsibleTrigger className={styles.demoTrigger}>Nested Section</CollapsibleTrigger>
          <CollapsibleContent className={styles.demoContent}>
            <p>This is nested content inside the parent collapsible.</p>
          </CollapsibleContent>
        </Collapsible>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Collapsible
      disabled
      className={styles.demo}>
      <CollapsibleTrigger
        className={styles.demoTrigger}
        render={<button />}>
        Disabled details
      </CollapsibleTrigger>
      <CollapsibleContent>Disabled triggers cannot open the panel.</CollapsibleContent>
    </Collapsible>
  ),
};

export const StateAwareRendering: Story = {
  render: () => (
    <Collapsible className={styles.demo}>
      <CollapsibleTrigger
        className={styles.demoTrigger}
        render={(props, state) => (
          <button {...props}>
            {state.open ? "Hide details" : "Show details"}
            <ChevronDown
              aria-hidden
              className={styles.icon}
            />
          </button>
        )}
      />
      <CollapsibleContent
        className={styles.demoContent}
        render={(props, state) => (
          <section
            {...props}
            data-open={state.open}
            data-transition={state.transitionStatus}
          />
        )}>
        Render callbacks observe the primitive's live open and transition state.
      </CollapsibleContent>
    </Collapsible>
  ),
};
