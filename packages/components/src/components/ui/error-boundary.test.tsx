import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ErrorBoundary} from "./error-boundary";

function ThrowingComponent(): never {
  throw new Error("Test error");
}

describe("ErrorBoundary", () => {
  it("React 19 refresh: localizes built-in error and retry copy, including updates while failed", () => {
    function Failure(): never {
      throw new Error("Network unavailable");
    }
    const {rerender} = render(
      <ErrorBoundary
        errorTitle='Une erreur est survenue'
        errorDescription='Vérifiez votre connexion'
        retryLabel='Réessayer'>
        <Failure />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Une erreur est survenue");
    expect(screen.getByRole("alert")).toHaveTextContent("Vérifiez votre connexion");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Network unavailable");
    expect(screen.getByRole("button", {name: "Réessayer"})).toHaveAttribute("type", "button");
    rerender(
      <ErrorBoundary
        errorTitle='A apărut o eroare'
        retryLabel='Reîncearcă'>
        <Failure />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("A apărut o eroare");
    expect(screen.getByRole("button", {name: "Reîncearcă"})).toBeInTheDocument();
  });

  beforeEach(() => {
    // React's expected error reporting is the only mocked platform boundary.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    {failure: "Literal rendering failure", message: "Literal rendering failure"},
    {failure: null, message: "Unknown rendering failure"},
  ])("normalizes a non-Error throw ($failure) for fallback and reporting", ({failure, message}) => {
    function NonErrorFailure(): never {
      throw failure;
    }
    let reported: Error | undefined;
    render(
      <ErrorBoundary
        onError={(error) => {
          reported = error;
        }}>
        <NonErrorFailure />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(reported).toBeInstanceOf(Error);
    expect(reported?.cause).toBe(failure);
  });

  it("honors a deliberately empty fallback rather than rendering the default error UI", () => {
    const {container} = render(
      <ErrorBoundary fallback={null}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("recovers the real failed subtree through a function fallback reset", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    function RecoverableContent(): React.JSX.Element {
      if (shouldThrow) throw new Error("Temporary failure");
      return <p>Function recovery complete</p>;
    }
    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div role='alert'>
            {error.message}
            <button
              type='button'
              onClick={reset}>
              Retry content
            </button>
          </div>
        )}>
        <RecoverableContent />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Temporary failure");
    shouldThrow = false;

    await user.click(screen.getByRole("button", {name: "Retry content"}));

    expect(screen.getByText("Function recovery complete")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports the captured error and component stack while displaying the actual fallback", () => {
    const failure = new Error("Diagnostic failure");
    function BrokenContent(): never {
      throw failure;
    }
    let reported: Error | undefined;
    let stack: string | null | undefined;
    render(
      <ErrorBoundary
        onError={(error, info) => {
          reported = error;
          stack = info.componentStack;
        }}>
        <BrokenContent />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Diagnostic failure");
    expect(reported).toBe(failure);
    expect(stack).toContain("BrokenContent");
  });

  it("does not turn an unchanged failing condition into success on retry", async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole("button", {name: "Try again"}));

    expect(screen.getByRole("alert")).toHaveTextContent("Test error");
  });

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
