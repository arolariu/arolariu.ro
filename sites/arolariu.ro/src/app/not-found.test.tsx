import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {GlobalNotFoundContent} from "./_components/GlobalNotFoundContent";
import NotFound from "./not-found";

describe("app/not-found.tsx", () => {
  it("renders the 404 title and subtitle keys", () => {
    render(<NotFound />);
    expect(screen.getByText("app.errors.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("app.errors.notFound.subtitle")).toBeInTheDocument();
  });

  it("renders a link back to the home page", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", {name: "app.errors.notFound.buttons.returnButton"});
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});

describe("GlobalNotFoundContent", () => {
  it("renders request-independent 404 content from typed copy", () => {
    render(
      <GlobalNotFoundContent
        qrCodeData='{"userId":"storybook"}'
        copy={{
          title: "404",
          subtitle: "Page not found",
          additionalInfo: "Additional Information",
          falsePositive: "Think this is an error?",
          submitErrorButton: "Submit Error Report",
          returnButton: "Return to Homepage",
        }}
      />,
    );

    expect(screen.getByRole("heading", {level: 1, name: "404"})).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Return to Homepage"})).toHaveAttribute("href", "https://arolariu.ro/");
  });
});
