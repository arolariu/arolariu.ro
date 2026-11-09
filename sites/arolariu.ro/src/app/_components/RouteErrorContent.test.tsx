import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {RouteErrorContent} from "./RouteErrorContent";

describe("RouteErrorContent", () => {
  it("renders the localized hero inside a scoped alert region", () => {
    render(
      <RouteErrorContent
        error={new Error("boom")}
        reset={vi.fn()}
        scope='domains'
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-scope", "domains");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByRole("heading", {level: 1, name: "app.errors.globalError.hero.title"})).toBeInTheDocument();
    expect(screen.getByText("app.errors.globalError.hero.subtitle")).toBeInTheDocument();
  });

  it("omits the scope attribute when no scope is provided", () => {
    render(
      <RouteErrorContent
        error={new Error("boom")}
        reset={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).not.toHaveAttribute("data-scope");
  });

  it("shows the error digest only when one is available", () => {
    const {rerender} = render(
      <RouteErrorContent
        error={Object.assign(new Error("boom"), {digest: "route-digest"})}
        reset={vi.fn()}
      />,
    );

    expect(screen.getByText("app.errors.globalError.details.errorIdLabel")).toBeInTheDocument();
    expect(screen.getByText("route-digest")).toBeInTheDocument();

    rerender(
      <RouteErrorContent
        error={new Error("boom")}
        reset={vi.fn()}
      />,
    );

    expect(screen.queryByText("app.errors.globalError.details.errorIdLabel")).not.toBeInTheDocument();
  });

  it("runs the reset callback from both recovery actions", () => {
    const reset = vi.fn();
    render(
      <RouteErrorContent
        error={new Error("boom")}
        reset={reset}
      />,
    );

    fireEvent.click(screen.getByRole("button", {name: "app.errors.globalError.buttons.tryAgain"}));
    const homeLink = screen.getByRole("link", {name: "app.errors.globalError.buttons.returnHome"});
    expect(homeLink).toHaveAttribute("href", "/");
    fireEvent.click(homeLink);

    expect(reset).toHaveBeenCalledTimes(2);
  });
});
