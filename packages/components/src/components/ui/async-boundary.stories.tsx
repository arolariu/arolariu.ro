import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {AsyncBoundary} from "./async-boundary";

const meta = {
  title: "Components/Utilities/AsyncBoundary",
  component: AsyncBoundary,
  tags: ["autodocs"],
} satisfies Meta<typeof AsyncBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

const AsyncComponent = ({delay = 2000}: {delay?: number}): JSX.Element => {
  throw new Promise((resolve) => setTimeout(resolve, delay));
};

const ErrorComponent = (): never => {
  throw new Error("Async component failed to load");
};

/**
 * Async boundary with default loading spinner.
 */
export const Loading: Story = {
  render: () => (
    <AsyncBoundary>
      <AsyncComponent delay={3000} />
    </AsyncBoundary>
  ),
};

/**
 * Async boundary with custom loading fallback.
 */
export const CustomLoading: Story = {
  render: () => (
    <AsyncBoundary
      loadingFallback={
        <div style={{padding: "2rem", background: "#f3f4f6", borderRadius: "8px", textAlign: "center"}}>
          <p style={{color: "#6b7280"}}>Loading content...</p>
        </div>
      }>
      <AsyncComponent delay={3000} />
    </AsyncBoundary>
  ),
};

/**
 * Async boundary handling both loading and error states.
 */
export const WithError: Story = {
  render: () => (
    <AsyncBoundary
      loadingFallback={<div style={{padding: "2rem"}}>Loading...</div>}
      fallback={(error, reset) => (
        <div style={{padding: "2rem", background: "#fee", border: "1px solid #fcc", borderRadius: "8px"}}>
          <h3 style={{color: "#c00", marginBottom: "0.5rem"}}>Error loading content</h3>
          <p style={{color: "#600", marginBottom: "1rem", fontSize: "0.875rem"}}>{error.message}</p>
          <button
            type='button'
            onClick={reset}
            style={{padding: "0.5rem 1rem", background: "#c00", color: "white", border: "none", borderRadius: "4px", cursor: "pointer"}}>
            Retry
          </button>
        </div>
      )}>
      <ErrorComponent />
    </AsyncBoundary>
  ),
};
