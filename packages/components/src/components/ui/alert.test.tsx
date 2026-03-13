import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Alert, AlertDescription, AlertTitle} from "./alert";
import styles from "./alert.module.css";

const alertVariantsToTest = [
  ["default", styles.default],
  ["destructive", styles.destructive],
] as const;

describe("Alert", () => {
  it("renders without crashing", () => {
    render(<Alert>Content</Alert>);

    expect(screen.getByRole("alert")).toHaveTextContent("Content");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Alert ref={ref}>Content</Alert>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Alert className='custom-alert'>Content</Alert>);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveClass("custom-alert");
    expect(alert.className).not.toBe("custom-alert");
  });

  it("renders title and description children", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>System maintenance starts soon.</AlertDescription>
      </Alert>,
    );

    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("System maintenance starts soon.")).toBeInTheDocument();
  });

  it.each(alertVariantsToTest)("applies the %s variant styles", (variant, expectedClassName) => {
    render(<Alert variant={variant}>Content</Alert>);

    expect(screen.getByRole("alert")).toHaveClass(expectedClassName);
  });

  it("forwards accessibility attributes", () => {
    render(
      <Alert
        aria-atomic='true'
        aria-live='assertive'>
        Accessible alert
      </Alert>,
    );

    const alert = screen.getByRole("alert");

    expect(alert).toHaveAttribute("aria-atomic", "true");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });
});
