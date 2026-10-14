import {ChevronDown} from "lucide-react";
import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "./collapsible";
const storyStyles = `
.ac-story-collapsible-demo {
  width: min(100%, 22rem);
}

.ac-story-collapsible-demoTrigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--ac-space-3);
  padding: var(--ac-space-3);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-sm);
  background: transparent;
  color: var(--ac-foreground);
  cursor: pointer;

  &[data-panel-open] .ac-story-collapsible-icon {
    transform: rotate(180deg);
  }
}

.ac-story-collapsible-demoContent {
  padding: var(--ac-space-3);
  color: var(--ac-muted-foreground);
  font-size: var(--ac-text-sm);
}

.ac-story-collapsible-icon {
  width: 1rem;
  height: 1rem;
  transition: transform var(--ac-transition-normal);
}

@media (prefers-reduced-motion: reduce) {
  .ac-story-collapsible-icon {
    transition: none;
  }
}
`;

const storyClasses = {
  demo: "ac-story-collapsible-demo",
  demoTrigger: "ac-story-collapsible-demoTrigger",
  icon: "ac-story-collapsible-icon",
  demoContent: "ac-story-collapsible-demoContent",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
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
    <Collapsible className={storyClasses.demo}>
      <CollapsibleTrigger
        className={storyClasses.demoTrigger}
        render={<button />}>
        Show details
        <ChevronDown
          aria-hidden
          className={storyClasses.icon}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={storyClasses.demoContent}>
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
      className={storyClasses.demo}>
      <CollapsibleTrigger
        asChild
        className={storyClasses.demoTrigger}>
        <button type='button'>
          Additional information
          <ChevronDown
            aria-hidden
            className={storyClasses.icon}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className={storyClasses.demoContent}>
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
    <div className={storyClasses.demo}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={storyClasses.demo}>
        <CollapsibleTrigger className={storyClasses.demoTrigger}>
          Toggle content
          <ChevronDown
            aria-hidden
            className={storyClasses.icon}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className={storyClasses.demoContent}>
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
    <Collapsible className={storyClasses.demo}>
      <CollapsibleTrigger className={storyClasses.demoTrigger}>
        Animated details
        <ChevronDown
          aria-hidden
          className={storyClasses.icon}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={storyClasses.demoContent}>
        <p>Opacity uses component CSS; icon transitions use mounted story CSS and existing design tokens.</p>
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
    <Collapsible className={storyClasses.demo}>
      <CollapsibleTrigger className={storyClasses.demoTrigger}>Parent Section</CollapsibleTrigger>
      <CollapsibleContent className={storyClasses.demoContent}>
        <p>This is the parent content area.</p>
        <Collapsible>
          <CollapsibleTrigger className={storyClasses.demoTrigger}>Nested Section</CollapsibleTrigger>
          <CollapsibleContent className={storyClasses.demoContent}>
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
      className={storyClasses.demo}>
      <CollapsibleTrigger
        className={storyClasses.demoTrigger}
        render={<button />}>
        Disabled details
      </CollapsibleTrigger>
      <CollapsibleContent>Disabled triggers cannot open the panel.</CollapsibleContent>
    </Collapsible>
  ),
};

export const StateAwareRendering: Story = {
  render: () => (
    <Collapsible className={storyClasses.demo}>
      <CollapsibleTrigger
        className={storyClasses.demoTrigger}
        render={(props, state) => (
          <button {...props}>
            {state.open ? "Hide details" : "Show details"}
            <ChevronDown
              aria-hidden
              className={storyClasses.icon}
            />
          </button>
        )}
      />
      <CollapsibleContent
        className={storyClasses.demoContent}
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
