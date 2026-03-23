import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ErrorBoundary} from "./error-boundary";

const meta = {
  title: "Components/Utilities/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

const ThrowError = ({message}: {message: string}): never => {
  throw new Error(message);
};

/**
 * Error boundary with default fallback UI.
 */
export const DefaultFallback: Story = {
  render: () => (
    <ErrorBoundary>
      <ThrowError message='Something went wrong in the component!' />
    </ErrorBoundary>
  ),
};

/**
 * Error boundary with custom fallback renderer.
 */
export const CustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div style={{padding: "2rem", background: "#fee", border: "1px solid #fcc", borderRadius: "8px"}}>
          <h3 style={{color: "#c00", marginBottom: "0.5rem"}}>Oops! An error occurred</h3>
          <p style={{color: "#600", marginBottom: "1rem", fontSize: "0.875rem"}}>{error.message}</p>
          <button
            type='button'
            onClick={reset}
            style={{padding: "0.5rem 1rem", background: "#c00", color: "white", border: "none", borderRadius: "4px", cursor: "pointer"}}>
            Retry
          </button>
        </div>
      )}>
      <ThrowError message='Custom fallback error!' />
    </ErrorBoundary>
  ),
};

/**
 * Healthy component tree without errors.
 */
export const NoError: Story = {
  render: () => (
    <ErrorBoundary>
      <div style={{padding: "2rem", background: "#efe", border: "1px solid #cfc", borderRadius: "8px"}}>
        <h3 style={{color: "#060", marginBottom: "0.5rem"}}>✓ Everything is working</h3>
        <p style={{color: "#030", fontSize: "0.875rem"}}>This component rendered successfully without errors.</p>
      </div>
    </ErrorBoundary>
  ),
};
