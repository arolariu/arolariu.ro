import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {AsyncBoundary} from "./async-boundary";

const pendingPromise = new Promise<never>(() => {});

function ThrowingComponent(): never {
  throw new Error("Async boundary failure");
}

function SuspendingComponent(): React.ReactNode {
  throw pendingPromise;
}

describe("AsyncBoundary", () => {
  it("renders children when no loading or error occurs", () => {
    render(
      <AsyncBoundary>
        <p>Ready</p>
      </AsyncBoundary>,
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders the loading fallback while children are suspended", () => {
    render(
      <AsyncBoundary loadingFallback={<p>Loading boundary</p>}>
        <SuspendingComponent />
      </AsyncBoundary>,
    );

    expect(screen.getByText("Loading boundary")).toBeInTheDocument();
  });

  it("renders the error fallback when a child throws", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AsyncBoundary>
        <ThrowingComponent />
      </AsyncBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Async boundary failure")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
