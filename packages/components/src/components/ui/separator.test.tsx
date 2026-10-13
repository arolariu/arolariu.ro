import {fireEvent, render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Separator} from "./separator";
import styles from "./separator.module.css";

describe("Separator", () => {
  it("lets the actual primitive supply orientation to render and class callbacks and merge refs and handlers", () => {
    const ref = createRef<HTMLDivElement>();
    const renderRef = createRef<HTMLDivElement>();
    let clicks = 0;
    const {rerender} = render(
      <Separator
        ref={ref}
        orientation='vertical'
        className={(state) => `axis-${state.orientation}`}
        onClick={() => {
          clicks += 1;
        }}
        render={(props, state) => (
          <div
            {...props}
            data-axis={state.orientation}
            onClick={(event) => {
              props.onClick?.(event);
              clicks += 10;
            }}
          />
        )}
      />,
    );
    expect(ref.current).toBe(screen.getByRole("separator"));
    expect(screen.getByRole("separator")).toHaveAttribute("data-axis", "vertical");
    expect(screen.getByRole("separator")).toHaveClass("axis-vertical");
    fireEvent.click(screen.getByRole("separator"));
    expect(clicks).toBe(11);
    rerender(
      <Separator
        orientation='horizontal'
        className={(state) => `axis-${state.orientation}`}
        render={(props, state) => (
          <div
            {...props}
            data-axis={state.orientation}
          />
        )}
      />,
    );
    expect(screen.getByRole("separator")).toHaveClass("axis-horizontal");
    expect(screen.getByRole("separator")).toHaveAttribute("data-axis", "horizontal");
    rerender(
      <Separator
        ref={ref}
        render={<div ref={renderRef} />}
      />,
    );
    expect(ref.current).toBe(renderRef.current);
  });

  it("consumes the legacy decorative flag without leaking an invalid DOM attribute", () => {
    render(
      <Separator
        decorative
        data-testid='rule'
      />,
    );
    expect(screen.getByTestId("rule")).not.toHaveAttribute("decorative");
  });
  it("renders without crashing", () => {
    render(<Separator />);

    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Separator ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Separator className='custom-separator' />);

    const separator = screen.getByRole("separator");

    expect(separator).toHaveClass("custom-separator");
    expect(separator.className).not.toBe("custom-separator");
  });

  it("applies vertical orientation styles", () => {
    render(
      <Separator
        orientation='vertical'
        data-testid='separator'
      />,
    );

    const separator = screen.getByTestId("separator");
    const verticalClass = styles.vertical;

    if (verticalClass === undefined) throw new Error("Missing Separator vertical CSS Module class");
    expect(separator).toHaveClass(verticalClass);
    expect(separator).toHaveAttribute("data-orientation", "vertical");
  });

  it("exposes separator accessibility semantics", () => {
    render(
      <Separator
        aria-label='Content separator'
        decorative={false}
      />,
    );

    expect(screen.getByRole("separator", {name: "Content separator"})).toBeInTheDocument();
  });
});
