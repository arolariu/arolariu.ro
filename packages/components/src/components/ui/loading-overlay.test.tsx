import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {LoadingOverlay} from "./loading-overlay";

describe("LoadingOverlay", () => {
  it("renders without crashing", () => {
    render(<LoadingOverlay />);

    expect(screen.getByRole("status", {name: "Loading"})).toBeInTheDocument();
  });

  it("returns null when not visible", () => {
    const {container} = render(<LoadingOverlay visible={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders custom children when provided", () => {
    render(
      <LoadingOverlay>
        <span>Loading content</span>
      </LoadingOverlay>,
    );

    expect(screen.getByText("Loading content")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<LoadingOverlay ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
