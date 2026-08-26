import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {GlobalErrorContent} from "./_components/GlobalErrorContent";
import AppError from "./error";

afterEach(() => {
  vi.useRealTimers();
});

describe("app/error.tsx", () => {
  it("renders the hero title and subtitle keys", () => {
    render(
      <AppError
        error={new Error("boom")}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByText("app.errors.globalError.hero.title")).toBeInTheDocument();
    expect(screen.getByText("app.errors.globalError.hero.subtitle")).toBeInTheDocument();
  });

  it("calls reset when the try-again button is clicked", () => {
    const reset = vi.fn();
    render(
      <AppError
        error={new Error("boom")}
        reset={reset}
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "app.errors.globalError.buttons.tryAgain"}));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("exposes the error digest when present", () => {
    const err = Object.assign(new Error("boom"), {digest: "abc123"});
    render(
      <AppError
        error={err}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("logs the error to console.error on mount", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppError
        error={new Error("boom")}
        reset={vi.fn()}
      />,
    );
    expect(spy).toHaveBeenCalledWith("[app/error.tsx]", expect.any(Error));
    spy.mockRestore();
  });
});

describe("GlobalErrorContent", () => {
  it("renders the Storybook-mountable global error content without a document shell", () => {
    render(
      <GlobalErrorContent
        error={Object.assign(new Error("boom"), {digest: "global-error-digest"})}
        reset={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", {level: 1, name: "app.errors.globalError.hero.title"})).toBeInTheDocument();
    expect(screen.getAllByText("global-error-digest")).not.toHaveLength(0);
    expect(document.querySelector("#tracking-microsoft")).not.toBeInTheDocument();
  });

  it("renders generic copy and hides digest-only details when no digest or stack is available", () => {
    const error = new Error("");
    error.stack = undefined;

    render(
      <GlobalErrorContent
        error={error}
        reset={vi.fn()}
      />,
    );

    expect(screen.getByText("app.errors.globalError.details.genericDescription")).toBeInTheDocument();
    expect(screen.getByText("app.errors.globalError.details.unknownError")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "app.errors.globalError.buttons.copyErrorId"})).not.toBeInTheDocument();
    expect(screen.queryByText("app.errors.globalError.diagnostics.stackTraceLabel")).not.toBeInTheDocument();
  });

  it("runs the reset callback from both recovery actions", () => {
    const reset = vi.fn();

    render(
      <GlobalErrorContent
        error={new Error("boom")}
        reset={reset}
      />,
    );

    fireEvent.click(screen.getByRole("button", {name: "app.errors.globalError.buttons.tryAgain"}));
    fireEvent.click(screen.getByRole("button", {name: "app.errors.globalError.buttons.returnHome"}));

    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("copies the digest and restores the copy action after the feedback timeout", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue();
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText},
    });

    render(
      <GlobalErrorContent
        error={Object.assign(new Error("boom"), {digest: "copy-digest"})}
        reset={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", {name: "app.errors.globalError.buttons.copyErrorId"}));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("copy-digest");
    expect(screen.getByRole("button", {name: "app.errors.globalError.buttons.copied"})).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("button", {name: "app.errors.globalError.buttons.copyErrorId"})).toBeInTheDocument();
  });

  it("copies the fallback identifier if the digest disappears before the action runs", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue();
    const error: Error & {digest?: string} = Object.assign(new Error("boom"), {digest: "initial-digest"});
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText},
    });

    render(
      <GlobalErrorContent
        error={error}
        reset={vi.fn()}
      />,
    );

    error.digest = undefined;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", {name: "app.errors.globalError.buttons.copyErrorId"}));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("NO_ERROR_ID");

    act(() => {
      vi.runAllTimers();
    });
  });

  it("reports clipboard failures without showing copied feedback", async () => {
    const clipboardError = new Error("clipboard unavailable");
    const writeText = vi.fn<(value: string) => Promise<void>>().mockRejectedValue(clipboardError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText},
    });

    render(
      <GlobalErrorContent
        error={Object.assign(new Error("boom"), {digest: "copy-digest"})}
        reset={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", {name: "app.errors.globalError.buttons.copyErrorId"}));
      await Promise.resolve();
    });

    expect(consoleError).toHaveBeenCalledWith("app.errors.globalError.copyErrorConsoleMessage", clipboardError);
    expect(screen.getByRole("button", {name: "app.errors.globalError.buttons.copyErrorId"})).toBeInTheDocument();
  });
});
