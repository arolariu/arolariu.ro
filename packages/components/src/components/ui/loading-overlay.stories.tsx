import {useEffect, useRef, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {LoadingOverlay, type LoadingOverlayProps} from "./loading-overlay";
const storyStyles = `
.ac-story-loading-overlay-owner {
  position: relative;
  min-block-size: 16rem;
  max-inline-size: 42rem;
  padding: var(--ac-space-6);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-lg);
  background: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-loading-overlay-demo,
.ac-story-loading-overlay-progress {
  display: grid;
  gap: var(--ac-space-4);
  color: var(--ac-foreground);
}

.ac-story-loading-overlay-progress {
  text-align: center;
}

.ac-story-loading-overlay-button {
  padding: var(--ac-space-2) var(--ac-space-4);
  margin-inline-end: var(--ac-space-2);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-sm);
  background: var(--ac-secondary);
  color: var(--ac-secondary-foreground);
  font: inherit;
  cursor: pointer;
}

.ac-story-loading-overlay-button:hover:not(:disabled) {
  background: var(--ac-accent);
  color: var(--ac-accent-foreground);
}

.ac-story-loading-overlay-button:focus-visible {
  outline: 2px solid var(--ac-ring);
  outline-offset: 2px;
}

.ac-story-loading-overlay-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
`;

const storyClasses = {
  owner: "ac-story-loading-overlay-owner",
  demo: "ac-story-loading-overlay-demo",
  progress: "ac-story-loading-overlay-progress",
  button: "ac-story-loading-overlay-button",
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
  title: "Components/Feedback/LoadingOverlay",
  component: LoadingOverlay,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Visual overlay plus a persistent, visually hidden status region: keep it mounted and toggle `visible` so `loadingLabel` is written into the already-present region. Pointer and keyboard input remain available. Blocking requires a caller-owned busy container, inert background content, native disabled controls and focus management.",
      },
    },
  },
  argTypes: {
    visible: {control: "boolean"},
    blur: {control: "boolean"},
    loadingLabel: {control: "text", description: "Localizable text written into the persistent status region while visible"},
  },
} satisfies Meta<typeof LoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

function VisualOwner(props: Readonly<LoadingOverlayProps>): React.JSX.Element {
  const [activations, setActivations] = useState(0);
  return (
    <section
      className={storyClasses.owner}
      aria-label='Visual-only owner'>
      <h2>Visual feedback without blocking</h2>
      <p>Pointer and keyboard activation remain available underneath this overlay.</p>
      <button
        type='button'
        className={storyClasses.button}
        onClick={() => setActivations((count) => count + 1)}>
        Background action
      </button>
      <p>Activations: {activations}</p>
      <LoadingOverlay {...props} />
    </section>
  );
}

/**
 * Toggle `visible` to write `loadingLabel` into the persistent status region; the spinner is decorative and background
 * content is not inerted or disabled.
 */
export const Default: Story = {args: {visible: true, blur: false}, render: (args) => <VisualOwner {...args} />};

/** Blur is a visual option, never a keyboard-blocking mechanism. */
export const WithBlur: Story = {...Default, args: {visible: true, blur: true}};

/** While hidden, only the empty status region stays mounted; the owner and its content are unchanged. */
export const Hidden: Story = {...Default, args: {visible: false}};

/** Custom informative content replaces the decorative spinner visually; `loadingLabel` carries the announcement. */
export const WithProgress: Story = {
  args: {visible: true, blur: true, loadingLabel: "Uploading three of ten items"},
  render: (args) => (
    <VisualOwner {...args}>
      <div className={storyClasses.progress}>
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
    <div className={storyClasses.demo}>
      <button
        type='button'
        ref={finishRef}
        disabled={!busy}
        className={storyClasses.button}
        onClick={() => setBusy(false)}>
        Finish loading and restore focus
      </button>
      <div className={storyClasses.owner}>
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
              className={storyClasses.button}
              onClick={() => setBusy(true)}>
              Start loading
            </button>
            <button
              type='button'
              disabled={busy}
              className={storyClasses.button}
              onClick={() => setActivations((count) => count + 1)}>
              Owned action
            </button>
            <p>Activations: {activations}</p>
          </div>
        </section>
        <LoadingOverlay
          visible={busy}
          loadingLabel='Working'>
          Working; finish loading using the control outside this busy owner.
        </LoadingOverlay>
      </div>
    </div>
  );
}

/** Explicit owner/content busy + inert + native disabled contract, with safe outside focus. */
export const ExplicitBlocking: Story = {render: () => <BlockingOwner />};
