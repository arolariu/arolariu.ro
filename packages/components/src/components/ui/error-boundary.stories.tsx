import {useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ErrorBoundary} from "./error-boundary";
import styles from "./error-boundary.module.css";

const meta = {
  title: "Components/Utilities/ErrorBoundary",
  component: ErrorBoundary,
  args: {children: null},
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Catches descendant client render/lifecycle errors. Repair the cause before resetting; event-handler and server errors are not caught.",
      },
    },
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

function UnstableContent({shouldThrow = true}: Readonly<{shouldThrow?: boolean}>): React.JSX.Element {
  if (shouldThrow) throw new Error("The example resource is unavailable.");
  return <p className={styles.panel}>Content recovered successfully.</p>;
}

/** Default alert and retry; an unchanged failing condition remains a failure. */
export const DefaultFallback: Story = {
  render: () => (
    <ErrorBoundary>
      <UnstableContent />
    </ErrorBoundary>
  ),
};

/** A static node replaces the default fallback, including its retry control. */
export const CustomNode: Story = {
  render: () => (
    <ErrorBoundary
      fallback={
        <p
          role='alert'
          className={styles.panel}>
          This panel is temporarily unavailable.
        </p>
      }>
      <UnstableContent />
    </ErrorBoundary>
  ),
};

/** Explicit null is supported when an owner deliberately wants no fallback UI. */
export const EmptyFallback: Story = {
  render: () => (
    <section className={styles.demo}>
      <p>The protected panel below is intentionally empty after failure.</p>
      <ErrorBoundary fallback={null}>
        <UnstableContent />
      </ErrorBoundary>
    </section>
  ),
};

/** Healthy content is unaffected by the boundary. */
export const NoError: Story = {
  render: () => (
    <ErrorBoundary>
      <UnstableContent shouldThrow={false} />
    </ErrorBoundary>
  ),
};

function RecoveryDemo(): React.JSX.Element {
  const [shouldThrow, setShouldThrow] = useState(true);
  const [reported, setReported] = useState<string | null>(null);
  return (
    <section className={styles.demo}>
      <p>Retry repairs the parent-owned condition before remounting the failed subtree.</p>
      <ErrorBoundary
        onError={(error) => setReported(error.message)}
        fallback={(error, reset) => (
          <div
            role='alert'
            className={styles.fallback}>
            <h2 className={styles.title}>Unable to load this panel</h2>
            <p className={styles.message}>{error.message}</p>
            <button
              type='button'
              className={styles.retry}
              onClick={() => {
                setShouldThrow(false);
                reset();
              }}>
              Repair and retry
            </button>
          </div>
        )}>
        <UnstableContent shouldThrow={shouldThrow} />
      </ErrorBoundary>
      {reported && <p className={styles.message}>Reported by onError: {reported}</p>}
    </section>
  );
}

/** Function fallback, real reset/recovery and diagnostic reporting. */
export const WithRetry: Story = {render: () => <RecoveryDemo />};

/** A nested boundary limits a failure to its own panel. */
export const NestedBoundaries: Story = {
  render: () => (
    <ErrorBoundary>
      <section className={styles.demo}>
        <h2>Outer content remains available</h2>
        <ErrorBoundary
          fallback={
            <p
              role='alert'
              className={styles.panel}>
              Only the inner panel failed.
            </p>
          }>
          <UnstableContent />
        </ErrorBoundary>
      </section>
    </ErrorBoundary>
  ),
};
