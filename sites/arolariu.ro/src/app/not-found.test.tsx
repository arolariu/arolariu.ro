import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import NotFound from "./not-found";

describe("app/not-found.tsx", () => {
  it("renders the 404 title and subtitle keys", () => {
    render(<NotFound />);
    expect(screen.getByText("Errors.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("Errors.notFound.subtitle")).toBeInTheDocument();
  });

  it("renders a link back to the home page", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", {name: "Errors.notFound.buttons.returnButton"});
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
