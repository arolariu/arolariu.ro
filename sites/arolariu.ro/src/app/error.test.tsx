import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import AppError from "./error";

describe("app/error.tsx", () => {
  it("renders the hero title and subtitle keys", () => {
    render(<AppError error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.getByText("Errors.globalError.hero.title")).toBeInTheDocument();
    expect(screen.getByText("Errors.globalError.hero.subtitle")).toBeInTheDocument();
  });

  it("calls reset when the try-again button is clicked", () => {
    const reset = vi.fn();
    render(<AppError error={new Error("boom")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", {name: "Errors.globalError.buttons.tryAgain"}));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("exposes the error digest when present", () => {
    const err = Object.assign(new Error("boom"), {digest: "abc123"});
    render(<AppError error={err} reset={vi.fn()} />);
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("logs the error to console.error on mount", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AppError error={new Error("boom")} reset={vi.fn()} />);
    expect(spy).toHaveBeenCalledWith("[app/error.tsx]", expect.any(Error));
    spy.mockRestore();
  });
});
