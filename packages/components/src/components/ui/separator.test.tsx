import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Separator} from "./separator";
import styles from "./separator.module.css";

describe("Separator", () => {
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

    expect(separator).toHaveClass(styles.vertical);
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
