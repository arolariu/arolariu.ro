import {useId, useRef, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from "./dialog";
import {FocusScope, type FocusScopeProps} from "./focus-scope";
const storyStyles = `
.ac-story-focus-scope-button:focus-visible,
.ac-story-focus-scope-input:focus-visible {
  outline: 2px solid var(--ac-ring);
  outline-offset: 2px;
}

.ac-story-focus-scope-demo,
.ac-story-focus-scope-controls {
  display: grid;
  gap: var(--ac-space-4);
  color: var(--ac-foreground);
}

.ac-story-focus-scope-panel {
  padding: var(--ac-space-6);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-md);
  background: var(--ac-background);
}

.ac-story-focus-scope-input {
  display: block;
  margin-block-start: var(--ac-space-2);
  padding: var(--ac-space-2);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-sm);
  background: var(--ac-background);
  color: var(--ac-foreground);
  font: inherit;
}

.ac-story-focus-scope-button {
  justify-self: start;
  padding: var(--ac-space-2) var(--ac-space-4);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-sm);
  background: var(--ac-secondary);
  color: var(--ac-secondary-foreground);
  font: inherit;
  cursor: pointer;
}

.ac-story-focus-scope-button:hover {
  background: var(--ac-accent);
  color: var(--ac-accent-foreground);
}

.ac-story-focus-scope-hidden {
  display: none;
}
`;

const storyClasses = {
  button: "ac-story-focus-scope-button",
  input: "ac-story-focus-scope-input",
  demo: "ac-story-focus-scope-demo",
  controls: "ac-story-focus-scope-controls",
  panel: "ac-story-focus-scope-panel",
  hidden: "ac-story-focus-scope-hidden",
} as const;

type EscapeExitScopeProps = Omit<FocusScopeProps, "aria-describedby" | "onKeyDown"> & {
  /** Visible name of the control outside the scope that receives focus on Escape. */
  readonly exitLabel: string;
  /** Story explanation rendered before the announced exit instructions. */
  readonly description?: React.ReactNode;
};

/**
 * Story-only consumer pattern for a contained scope: visible instructions referenced by
 * `aria-describedby` announce the exit, and Escape moves focus to a named outside control.
 * Escape pressed inside a nested scope bubbles to this handler as well.
 */
function EscapeExitScope({exitLabel, description, ...scopeProps}: Readonly<EscapeExitScopeProps>): React.JSX.Element {
  const instructionsId = useId();
  const exitRef = useRef<HTMLButtonElement>(null);
  return (
    <section className={storyClasses.demo}>
      {description}
      <p id={instructionsId}>
        Press Escape to leave this scope and move focus to <q>{exitLabel}</q>.
      </p>
      <FocusScope
        {...scopeProps}
        aria-describedby={instructionsId}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.defaultPrevented) return;
          event.preventDefault();
          exitRef.current?.focus();
        }}
      />
      <button
        type='button'
        ref={exitRef}
        className={storyClasses.button}>
        {exitLabel}
      </button>
    </section>
  );
}

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Utilities/FocusScope",
  component: FocusScope,
  args: {children: null as React.ReactNode},
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A local Tab controller for visible, natively enabled, non-inert tab stops (focusable aria-disabled controls included), not a modal. Containment has no built-in exit: like every contained story here, consumers must provide and announce a keyboard exit. Base UI dialogs own their focus; never layer this trap over a modal popup.",
      },
    },
  },
  argTypes: {
    contain: {control: "boolean"},
    autoFocus: {control: "boolean"},
    restoreFocus: {control: "boolean"},
  },
} satisfies Meta<typeof FocusScope>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both Tab directions wrap across the available controls, not the hidden final button; Escape leaves the scope. */
export const Default: Story = {
  args: {
    contain: true,
    autoFocus: true,
    children: (
      <div className={storyClasses.controls}>
        <label>
          First field
          <input className={storyClasses.input} />
        </label>
        <label>
          Second field
          <input className={storyClasses.input} />
        </label>
        <button
          type='button'
          className={storyClasses.button}>
          Final visible action
        </button>
        <button
          type='button'
          hidden>
          Hidden final action
        </button>
      </div>
    ),
  },
  render: (args) => (
    <EscapeExitScope
      {...args}
      aria-label='Local workbench'
      className={storyClasses.panel}
      description={<p>Tab from the final visible action returns to the first field.</p>}
      exitLabel='Outside the scope'
    />
  ),
};

/** The same content allows ordinary focus navigation outside when containment is disabled. */
export const NoContain: Story = {...Default, args: {...Default.args, contain: false}};

/** Hidden, inert, disabled and negative-tab-index descendants do not become edge targets. */
export const UnavailableControls: Story = {
  render: () => (
    <EscapeExitScope
      autoFocus
      aria-label='Available controls'
      className={storyClasses.panel}
      exitLabel='After the available controls'>
      <div className={storyClasses.controls}>
        <div hidden>
          <button type='button'>Hidden ancestor</button>
        </div>
        <div inert>
          <button type='button'>Inert action</button>
        </div>
        <fieldset disabled>
          <button type='button'>Disabled action</button>
        </fieldset>
        <button
          type='button'
          tabIndex={-1}>
          Programmatic-only action
        </button>
        <button
          type='button'
          className={storyClasses.button}>
          First available
        </button>
        <button
          type='button'
          className={storyClasses.button}>
          Last available
        </button>
        <div className={storyClasses.hidden}>
          <button type='button'>CSS-hidden final action</button>
        </div>
      </div>
    </EscapeExitScope>
  ),
};

/** With no tabbable descendants, the container is the focus entry and Tab fallback; Escape still leaves it. */
export const EmptyScope: Story = {
  args: {autoFocus: true, contain: true, children: <p>No available controls; Tab stays on this scope until Escape leaves it.</p>},
  render: (args) => (
    <EscapeExitScope
      {...args}
      aria-label='Empty workbench'
      className={storyClasses.panel}
      exitLabel='After the empty workbench'
    />
  ),
};

function RestoreFocusDemo(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const instructionsId = useId();
  return (
    <section className={storyClasses.demo}>
      <p>The draft's native autofocus takes entry focus. Closing the inline scope still returns focus to its original trigger.</p>
      <p id={instructionsId}>Press Escape or choose Close workbench to leave the inline workbench.</p>
      <button
        type='button'
        className={storyClasses.button}
        onClick={() => setOpen(true)}>
        Open inline workbench
      </button>
      {open && (
        <FocusScope
          aria-label='Inline workbench'
          aria-describedby={instructionsId}
          className={storyClasses.panel}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || event.defaultPrevented) return;
            event.preventDefault();
            setOpen(false);
          }}>
          <div className={storyClasses.controls}>
            <label>
              Draft
              <input
                autoFocus
                className={storyClasses.input}
              />
            </label>
            <button
              type='button'
              className={storyClasses.button}
              onClick={() => setOpen(false)}>
              Close workbench
            </button>
          </div>
        </FocusScope>
      )}
    </section>
  );
}

/** Escape or the close action unmounts the scope; native descendant autofocus does not replace its restoration owner. */
export const WithRestoreFocus: Story = {render: () => <RestoreFocusDemo />};

function UncheckedRadioGroupDemo(): React.JSX.Element {
  const groupName = useId();
  return (
    <EscapeExitScope
      autoFocus
      aria-label='Unchecked radio workbench'
      className={storyClasses.panel}
      description={
        <p>
          Until a choice is checked, this controller uses the first locally eligible radio as one logical stop. Tab from that stop wraps to
          the first action. Reverse wrapping uses the same representative; a different peer reached by native navigation resolves to that
          logical group stop.
        </p>
      }
      exitLabel='Outside the workbench'>
      <div className={storyClasses.controls}>
        <button
          type='button'
          className={storyClasses.button}>
          First workbench action
        </button>
        <label>
          <input
            type='radio'
            name={groupName}
          />
          First unchecked choice
        </label>
        <label>
          <input
            type='radio'
            name={groupName}
          />
          Second unchecked choice
        </label>
      </div>
    </EscapeExitScope>
  );
}

/** Deliberate single-representative radio policy, not a universal native-browser order claim. */
export const UncheckedRadioGroup: Story = {render: () => <UncheckedRadioGroupDemo />};

function NestedScopeOwnershipDemo(): React.JSX.Element {
  const groupName = useId();
  return (
    <EscapeExitScope
      autoFocus
      aria-label='Outer local scope'
      className={storyClasses.panel}
      description={
        <p>
          These radios share one native group across two local scopes. Once focus enters the contained child, its native interior Tab and
          Shift+Tab transitions belong to that child, not the ancestor's radio alias sequence. Pointer focus remains available outside
          because these are local controllers, not modals. Escape inside the contained child bubbles to the outer scope's exit.
        </p>
      }
      exitLabel='Outside both scopes'>
      <div className={storyClasses.controls}>
        <label>
          <input
            type='radio'
            name={groupName}
          />
          Outer unchecked choice
        </label>
        <button
          type='button'
          className={storyClasses.button}>
          Outer intervening action
        </button>
        <FocusScope
          aria-label='Contained child scope'
          className={storyClasses.panel}>
          <div className={storyClasses.controls}>
            <label>
              <input
                type='radio'
                name={groupName}
              />
              Inner unchecked choice
            </label>
            <button
              type='button'
              className={storyClasses.button}>
              Inner next action
            </button>
          </div>
        </FocusScope>
      </div>
    </EscapeExitScope>
  );
}

/** Nested local keyboard ownership without a competing SDK modal trap or altered native group. */
export const NestedScopeOwnership: Story = {render: () => <NestedScopeOwnershipDemo />};

/** SDK modal comparison: Dialog supplies focus ownership without any FocusScope wrapper. */
export const SdkOwnedModal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger>Open SDK-owned modal</DialogTrigger>
      <DialogContent>
        <DialogTitle>SDK focus ownership</DialogTitle>
        <DialogDescription>Base UI handles focus entry, containment and restoration. No manual trap is added.</DialogDescription>
        <label>
          Example field
          <input className={storyClasses.input} />
        </label>
      </DialogContent>
    </Dialog>
  ),
};
