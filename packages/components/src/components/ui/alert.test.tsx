import {fireEvent, render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Alert, AlertAction, AlertDescription, AlertTitle} from "./alert";
import styles from "./alert.module.css";

const alertVariantsToTest = [
  ["default", styles.default],
  ["destructive", styles.destructive],
] as const;

describe("Alert", () => {
  it("preserves heading, rich body and action refs and allows a non-urgent native status role", () => {
    const title = createRef<HTMLHeadingElement>();
    const description = createRef<HTMLDivElement>();
    const action = createRef<HTMLDivElement>();
    render(
      <Alert
        role='status'
        aria-labelledby='notice-title'>
        <AlertTitle
          ref={title}
          id='notice-title'>
          Saved changes
        </AlertTitle>
        <AlertDescription ref={description}>
          <ul>
            <li>Available now</li>
          </ul>
        </AlertDescription>
        <AlertAction
          ref={action}
          className='caller-action'>
          <button
            type='button'
            disabled>
            Undo
          </button>
        </AlertAction>
      </Alert>,
    );
    expect(screen.getByRole("status", {name: "Saved changes"})).toBeInTheDocument();
    expect(title.current?.tagName).toBe("H5");
    expect(description.current?.tagName).toBe("DIV");
    expect(screen.getByRole("list").parentElement).toBe(description.current);
    expect(action.current).toHaveClass("caller-action");
    expect(screen.getByRole("button", {name: "Undo"})).toBeDisabled();
  });
  it("places a native action alongside rich alert content without taking over its icon or click", () => {
    const ref = createRef<HTMLDivElement>();
    let dismissed = false;
    render(
      <Alert>
        <svg
          aria-hidden='true'
          data-testid='leading-icon'
        />
        <AlertTitle>Service unavailable</AlertTitle>
        <AlertDescription>
          <a href='/status'>Read the status</a>
        </AlertDescription>
        <AlertAction ref={ref}>
          <button
            type='button'
            onClick={() => {
              dismissed = true;
            }}>
            <svg aria-hidden='true' />
            Dismiss
          </button>
        </AlertAction>
      </Alert>,
    );
    expect(ref.current).toHaveAttribute("data-slot", "alert-action");
    expect(screen.getByRole("alert")).toHaveAttribute("data-slot", "alert");
    fireEvent.click(screen.getByRole("button", {name: "Dismiss"}));
    expect(dismissed).toBe(true);
    expect(screen.getByRole("link", {name: "Read the status"})).toHaveAttribute("href", "/status");
  });
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
