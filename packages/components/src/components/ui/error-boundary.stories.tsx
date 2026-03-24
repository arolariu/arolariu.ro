import {useState} from "react";
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

/**
 * Error boundary with retry functionality.
 */
function ComponentWithRetry(): React.JSX.Element {
  const [shouldError, setShouldError] = useState(true);

  if (shouldError) {
    throw new Error("Temporary failure - click retry to fix");
  }

  return (
    <div style={{padding: "2rem", background: "#efe", border: "1px solid #cfc", borderRadius: "8px"}}>
      <h3 style={{color: "#060", marginBottom: "0.5rem"}}>✓ Successfully recovered!</h3>
      <p style={{color: "#030", fontSize: "0.875rem"}}>The component is now working after retry.</p>
    </div>
  );
}

export const WithRetry: Story = {
  render: function WithRetryStory() {
    const [key, setKey] = useState(0);

    return (
      <ErrorBoundary
        key={key}
        fallback={(error, reset) => (
          <div style={{padding: "2rem", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "8px"}}>
            <h3 style={{color: "#92400e", marginBottom: "0.5rem"}}>⚠️ Component Error</h3>
            <p style={{color: "#78350f", marginBottom: "1rem", fontSize: "0.875rem"}}>{error.message}</p>
            <button
              type='button'
              onClick={() => {
                setKey((prev) => prev + 1);
                reset();
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}>
              Retry
            </button>
          </div>
        )}>
        <ComponentWithRetry />
      </ErrorBoundary>
    );
  },
};

/**
 * Error boundary with custom branded fallback UI.
 */
export const CustomFallbackBranded: Story = {
  render: () => (
    <ErrorBoundary
      fallback={(error) => (
        <div
          style={{
            padding: "3rem",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "12px",
            color: "white",
            textAlign: "center",
            maxWidth: "500px",
          }}>
          <div style={{fontSize: "64px", marginBottom: "16px"}}>😔</div>
          <h2 style={{fontSize: "24px", fontWeight: "bold", marginBottom: "8px"}}>Something went wrong</h2>
          <p style={{fontSize: "14px", opacity: 0.9, marginBottom: "24px"}}>
            We apologize for the inconvenience. Our team has been notified.
          </p>
          <details style={{textAlign: "left", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "6px", fontSize: "12px"}}>
            <summary style={{cursor: "pointer", marginBottom: "8px"}}>Technical Details</summary>
            <code style={{display: "block", marginTop: "8px", wordBreak: "break-word"}}>{error.message}</code>
          </details>
          <button
            type='button'
            onClick={() => window.location.reload()}
            style={{
              marginTop: "24px",
              padding: "12px 24px",
              background: "white",
              color: "#667eea",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}>
            Reload Page
          </button>
        </div>
      )}>
      <ThrowError message='Critical system failure detected!' />
    </ErrorBoundary>
  ),
};

/**
 * Nested error boundaries catching errors at different levels.
 */
function InnerComponent(): never {
  throw new Error("Inner component crashed");
}

function MiddleComponent(): React.JSX.Element {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div style={{padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", margin: "1rem 0"}}>
          <h4 style={{color: "#991b1b", fontSize: "14px", marginBottom: "4px"}}>Inner Boundary Caught:</h4>
          <p style={{color: "#7f1d1d", fontSize: "12px"}}>{error.message}</p>
        </div>
      )}>
      <div style={{padding: "1rem", background: "#e0e7ff", border: "1px dashed #818cf8", borderRadius: "6px"}}>
        <p style={{fontSize: "14px", marginBottom: "8px"}}>Inner protected area</p>
        <InnerComponent />
      </div>
    </ErrorBoundary>
  );
}

export const NestedBoundaries: Story = {
  render: () => (
    <ErrorBoundary
      fallback={(error) => (
        <div style={{padding: "2rem", background: "#fee", border: "2px solid #fcc", borderRadius: "8px"}}>
          <h3 style={{color: "#c00", marginBottom: "0.5rem"}}>Outer Boundary Caught:</h3>
          <p style={{color: "#600", fontSize: "0.875rem"}}>{error.message}</p>
        </div>
      )}>
      <div style={{padding: "1.5rem", background: "#f3f4f6", borderRadius: "8px"}}>
        <h3 style={{marginBottom: "1rem"}}>Outer Protected Area</h3>
        <p style={{fontSize: "14px", marginBottom: "1rem"}}>
          The outer boundary protects the entire component tree. The inner boundary catches errors from nested components.
        </p>
        <MiddleComponent />
      </div>
    </ErrorBoundary>
  ),
};
