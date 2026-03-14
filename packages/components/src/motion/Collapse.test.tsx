import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Collapse} from "./Collapse";

describe("Collapse", () => {
  it("renders children", () => {
    render(<Collapse open={true}>Content</Collapse>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("sets data-state='open' when open", () => {
    const {container} = render(<Collapse open={true}>Content</Collapse>);
    expect(container.firstChild).toHaveAttribute("data-state", "open");
  });

  it("sets data-state='closed' when closed", () => {
    const {container} = render(<Collapse open={false}>Content</Collapse>);
    expect(container.firstChild).toHaveAttribute("data-state", "closed");
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLDivElement | null};
    render(
      <Collapse
        ref={ref}
        open={true}>
        Content
      </Collapse>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
