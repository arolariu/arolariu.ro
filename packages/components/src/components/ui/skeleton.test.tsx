import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Skeleton} from "./skeleton";

describe("Skeleton", () => {
  it("renders without crashing", () => {
    render(<Skeleton data-testid='skeleton' />);

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Skeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className alongside default styles", () => {
    render(
      <Skeleton
        className='custom-skeleton'
        data-testid='skeleton'
      />,
    );

    const skeleton = screen.getByTestId("skeleton");

    expect(skeleton).toHaveClass("custom-skeleton");
    expect(skeleton.className).not.toBe("custom-skeleton");
  });

  it("renders children", () => {
    render(
      <Skeleton>
        <span>Loading profile</span>
      </Skeleton>,
    );

    expect(screen.getByText("Loading profile")).toBeInTheDocument();
  });

  it("forwards accessibility attributes", () => {
    render(
      <Skeleton
        role='status'
        aria-label='Loading account summary'
      />,
    );

    expect(screen.getByRole("status", {name: "Loading account summary"})).toBeInTheDocument();
  });
});
