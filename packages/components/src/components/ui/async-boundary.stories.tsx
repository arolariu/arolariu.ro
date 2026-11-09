import {use, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {AsyncBoundary, type AsyncBoundaryProps} from "./async-boundary";
import {VisuallyHidden} from "./visually-hidden";

const meta = {
  title: "Components/Utilities/AsyncBoundary",
  component: AsyncBoundary,
  args: {children: null as React.ReactNode},
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Style-free native Suspense and ErrorBoundary composition. The example owns a stable real promise; resolve or reject it, then replace it before retrying.",
      },
    },
  },
} satisfies Meta<typeof AsyncBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

function ResourceContent({resource}: Readonly<{resource: Promise<string>}>): React.JSX.Element {
  const message = use(resource);
  return <p>{message}</p>;
}

type ResourceDemoProps = Pick<AsyncBoundaryProps, "loadingFallback" | "loadingLabel"> & {
  /** Text the demo writes into its own persistent status region while the request is pending. */
  readonly pendingAnnouncement?: string;
};

function ResourceDemo({loadingFallback, loadingLabel, pendingAnnouncement}: Readonly<ResourceDemoProps>): React.JSX.Element {
  const [resource, setResource] = useState(() => Promise.withResolvers<string>());
  const [outcome, setOutcome] = useState<"pending" | "resolved" | "rejected">("pending");
  const [reported, setReported] = useState<string | null>(null);
  return (
    <section aria-label='Controlled async resource'>
      <p>Choose how the pending request completes. No promises are created by the suspending child.</p>
      {pendingAnnouncement === undefined ? null : (
        <VisuallyHidden role='status'>{outcome === "pending" ? pendingAnnouncement : null}</VisuallyHidden>
      )}
      <button
        type='button'
        disabled={outcome !== "pending"}
        onClick={() => {
          resource.resolve("The resource resolved successfully.");
          setOutcome("resolved");
        }}>
        Resolve request
      </button>
      <button
        type='button'
        disabled={outcome !== "pending"}
        onClick={() => {
          resource.reject(new Error("The example request failed."));
          setOutcome("rejected");
        }}>
        Reject request
      </button>
      <button
        type='button'
        disabled={outcome === "rejected"}
        onClick={() => {
          setResource(Promise.withResolvers<string>());
          setOutcome("pending");
        }}>
        Start another request
      </button>
      <AsyncBoundary
        loadingFallback={loadingFallback}
        loadingLabel={loadingLabel}
        onError={(error) => setReported(error.message)}
        fallback={(error, reset) => (
          <div role='alert'>
            <p>{error.message}</p>
            <button
              type='button'
              onClick={() => {
                setResource(Promise.withResolvers<string>());
                setOutcome("pending");
                reset();
              }}>
              Replace resource and retry
            </button>
          </div>
        )}>
        <ResourceContent resource={resource.promise} />
      </AsyncBoundary>
      {reported && <p>Last reported failure: {reported}</p>}
    </section>
  );
}

/**
 * Actual resolve, reject and retry paths with the default decorative Spinner while pending. Whenever the fallback mounts,
 * for example after "Start another request", the boundary writes `loadingLabel` into its persistent status region.
 */
export const Loading: Story = {render: () => <ResourceDemo />};

/** The default fallback's announcement is localizable through `loadingLabel`. */
export const LocalizedLoading: Story = {render: () => <ResourceDemo loadingLabel='Se încarcă cererea de exemplu' />};

/**
 * Custom feedback replaces the default Spinner and its announcement, so the caller owns one: this demo writes into its
 * own visually hidden status region, mounted before any later request starts.
 */
export const CustomLoading: Story = {
  render: () => (
    <ResourceDemo
      loadingFallback={<p>Waiting for the example request…</p>}
      pendingAnnouncement='Waiting for the example request'
    />
  ),
};

/** Null is an intentional empty pending state rather than an implicit default: nothing is rendered or announced. */
export const EmptyLoading: Story = {render: () => <ResourceDemo loadingFallback={null} />};

/** Non-suspending children render immediately without additional wrappers or styles. */
export const Ready: Story = {
  render: () => (
    <AsyncBoundary>
      <p>Ready content.</p>
    </AsyncBoundary>
  ),
};
