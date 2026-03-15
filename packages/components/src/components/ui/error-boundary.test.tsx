import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

import {ErrorBoundary} from "./error-boundary";

function ThrowingComponent(): never {
  throw new Error("Test error");
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <p>OK</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("renders the default fallback when a child throws", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("calls onError when an error is caught", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));

    consoleErrorSpy.mockRestore();
  });

  it("renders a custom fallback node when provided", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("renders a custom fallback function when provided", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={(error) => <p>Handled: {error.message}</p>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Handled: Test error")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("resets when the retry button is clicked", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;

    function ConditionalComponent(): React.JSX.Element {
      if (shouldThrow) {
        throw new Error("fail");
      }

      return <p>Recovered</p>;
    }

    render(
      <ErrorBoundary>
        <ConditionalComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", {name: "Try again"}));

    expect(screen.getByText("Recovered")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
