import {useId, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from "./dialog";
import {FocusScope} from "./focus-scope";
import styles from "./focus-scope.module.css";

const meta = {
  title: "Components/Utilities/FocusScope",
  component: FocusScope,
  args: {children: null},
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A local Tab controller for visible enabled non-inert descendants, not a modal. Base UI dialogs own their focus; never layer this trap over a modal popup.",
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

/** Both Tab directions wrap across the available controls, not the hidden final button. */
export const Default: Story = {
  args: {
    contain: true,
    autoFocus: true,
    children: (
      <div className={styles.controls}>
        <label>
          First field
          <input className={styles.input} />
        </label>
        <label>
          Second field
          <input className={styles.input} />
        </label>
        <button
          type='button'
          className={styles.button}>
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
    <section className={styles.demo}>
      <p>Tab from the final visible action returns to the first field.</p>
      <FocusScope
        {...args}
        aria-label='Local workbench'
        className={styles.panel}
      />
      <button
        type='button'
        className={styles.button}>
        Outside the scope
      </button>
    </section>
  ),
};

/** The same content allows ordinary focus navigation outside when containment is disabled. */
export const NoContain: Story = {...Default, args: {...Default.args, contain: false}};

/** Hidden, inert, disabled and negative-tab-index descendants do not become edge targets. */
export const UnavailableControls: Story = {
  render: () => (
    <FocusScope
      autoFocus
      aria-label='Available controls'
      className={styles.panel}>
      <div className={styles.controls}>
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
          className={styles.button}>
          First available
        </button>
        <button
          type='button'
          className={styles.button}>
          Last available
        </button>
        <div className={styles.hidden}>
          <button type='button'>CSS-hidden final action</button>
        </div>
      </div>
    </FocusScope>
  ),
};

/** With no tabbable descendants, the container is the focus entry and Tab fallback. */
export const EmptyScope: Story = {
  args: {autoFocus: true, contain: true, children: <p>No available controls; focus stays on this scope.</p>},
  render: (args) => (
    <FocusScope
      {...args}
      aria-label='Empty workbench'
      className={styles.panel}
    />
  ),
};

function RestoreFocusDemo(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.demo}>
      <p>The draft's native autofocus takes entry focus. Closing the inline scope still returns focus to its original trigger.</p>
      <button
        type='button'
        className={styles.button}
        onClick={() => setOpen(true)}>
        Open inline workbench
      </button>
      {open && (
        <FocusScope
          aria-label='Inline workbench'
          className={styles.panel}>
          <div className={styles.controls}>
            <label>
              Draft
              <input
                autoFocus
                className={styles.input}
              />
            </label>
            <button
              type='button'
              className={styles.button}
              onClick={() => setOpen(false)}>
              Close workbench
            </button>
          </div>
        </FocusScope>
      )}
    </section>
  );
}

/** Native descendant autofocus does not replace the inline scope's original restoration owner. */
export const WithRestoreFocus: Story = {render: () => <RestoreFocusDemo />};

function UncheckedRadioGroupDemo(): React.JSX.Element {
  const groupName = useId();
  return (
    <section className={styles.demo}>
      <p>
        Until a choice is checked, this controller uses the first locally eligible radio as one logical stop. Tab from that stop wraps to
        the first action. Reverse wrapping uses the same representative; a different peer reached by native navigation resolves to that
        logical group stop.
      </p>
      <FocusScope
        autoFocus
        aria-label='Unchecked radio workbench'
        className={styles.panel}>
        <div className={styles.controls}>
          <button
            type='button'
            className={styles.button}>
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
      </FocusScope>
      <button
        type='button'
        className={styles.button}>
        Outside the workbench
      </button>
    </section>
  );
}

/** Deliberate single-representative radio policy, not a universal native-browser order claim. */
export const UncheckedRadioGroup: Story = {render: () => <UncheckedRadioGroupDemo />};

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
          <input className={styles.input} />
        </label>
      </DialogContent>
    </Dialog>
  ),
};
