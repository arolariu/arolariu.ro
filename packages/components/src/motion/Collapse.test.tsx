import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Collapse} from "./Collapse";

describe("Collapse", () => {
  it("keeps collapsed content mounted without exposing its controls to assistive navigation", () => {
    const {container, rerender} = render(
      <Collapse open={false}>
        <button type='button'>Panel action</button>
      </Collapse>,
    );

    expect(screen.getByText("Panel action")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Panel action"})).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("inert");
    rerender(
      <Collapse open>
        <button type='button'>Panel action</button>
      </Collapse>,
    );
    expect(screen.getByRole("button", {name: "Panel action"})).toBeInTheDocument();
    expect(container.firstChild).not.toHaveAttribute("inert");
  });

  it("renders children and forwards refs", () => {
    const ref = {current: null as HTMLDivElement | null};

    render(
      <Collapse
        ref={ref}
        open={true}>
        Content
      </Collapse>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("toggles the rendered state when the open prop changes", () => {
    const {rerender, container} = render(<Collapse open={false}>Content</Collapse>);

    expect(container.firstChild).toHaveAttribute("data-state", "closed");

    rerender(<Collapse open={true}>Content</Collapse>);

    expect(container.firstChild).toHaveAttribute("data-state", "open");
  });

  it("keeps children mounted when closed", () => {
    const {container} = render(<Collapse open={false}>Persistent content</Collapse>);

    expect(screen.getByText("Persistent content")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-state", "closed");
  });

  it("merges custom class names", () => {
    const {container} = render(
      <Collapse
        open={true}
        className='custom-collapse'>
        Content
      </Collapse>,
    );

    expect(container.firstChild).toHaveClass("custom-collapse");
  });
});
