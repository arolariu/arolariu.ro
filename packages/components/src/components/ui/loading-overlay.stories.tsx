import {useEffect, useRef, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {LoadingOverlay, type LoadingOverlayProps} from "./loading-overlay";
import styles from "./loading-overlay.module.css";

const meta = {
  title: "Components/Feedback/LoadingOverlay",
  component: LoadingOverlay,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Visual status overlay by default: pointer and keyboard input remain available. Blocking requires a caller-owned busy container, inert background content, native disabled controls and focus management.",
      },
    },
  },
  argTypes: {
    visible: {control: "boolean"},
    blur: {control: "boolean"},
  },
} satisfies Meta<typeof LoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

function VisualOwner(props: Readonly<LoadingOverlayProps>): React.JSX.Element {
  const [activations, setActivations] = useState(0);
  return (
    <section
      className={styles.owner}
      aria-label='Visual-only owner'>
      <h2>Visual feedback without blocking</h2>
      <p>Pointer and keyboard activation remain available underneath this overlay.</p>
      <button
        type='button'
        className={styles.button}
        onClick={() => setActivations((count) => count + 1)}>
        Background action
      </button>
      <p>Activations: {activations}</p>
      <LoadingOverlay {...props} />
    </section>
  );
}

/** The default Spinner announces loading without inerting or disabling background content. */
export const Default: Story = {args: {visible: true, blur: false}, render: (args) => <VisualOwner {...args} />};

/** Blur is a visual option, never a keyboard-blocking mechanism. */
export const WithBlur: Story = {...Default, args: {visible: true, blur: true}};

/** Hiding the status does not mutate the owner or its content. */
export const Hidden: Story = {...Default, args: {visible: false}};

/** Custom informative content retains the same status semantics. */
export const WithProgress: Story = {
  args: {visible: true, blur: true, "aria-label": "Upload progress"},
  render: (args) => (
    <VisualOwner {...args}>
      <div className={styles.progress}>
        <strong>67%</strong>
        <span>Uploading three of ten items</span>
      </div>
    </VisualOwner>
  ),
};

function BlockingOwner(): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [activations, setActivations] = useState(0);
  const startRef = useRef<HTMLButtonElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const previousBusy = useRef(false);
  useEffect(() => {
    if (busy) finishRef.current?.focus();
    else if (previousBusy.current) startRef.current?.focus();
    previousBusy.current = busy;
  }, [busy]);
  return (
    <div className={styles.demo}>
      <button
        type='button'
        ref={finishRef}
        disabled={!busy}
        className={styles.button}
        onClick={() => setBusy(false)}>
        Finish loading and restore focus
      </button>
      <div className={styles.owner}>
        <section
          aria-label='Explicit blocking owner'
          aria-busy={busy}>
          <div inert={busy}>
            <h2>Owner-controlled blocking</h2>
            <p>The owner marks this content inert and disables its native controls while busy.</p>
            <button
              type='button'
              ref={startRef}
              disabled={busy}
              className={styles.button}
              onClick={() => setBusy(true)}>
              Start loading
            </button>
            <button
              type='button'
              disabled={busy}
              className={styles.button}
              onClick={() => setActivations((count) => count + 1)}>
              Owned action
            </button>
            <p>Activations: {activations}</p>
          </div>
        </section>
        <LoadingOverlay
          visible={busy}
          aria-label='Working'>
          Working; finish loading using the control outside this busy owner.
        </LoadingOverlay>
      </div>
    </div>
  );
}

/** Explicit owner/content busy + inert + native disabled contract, with safe outside focus. */
export const ExplicitBlocking: Story = {render: () => <BlockingOwner />};
