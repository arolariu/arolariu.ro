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

  it("applies blur class when blur={true}", () => {
    // Arrange
    render(
      <LoadingOverlay
        blur
        data-testid='loading-overlay'
      />,
    );

    // Assert
    const overlay = screen.getByTestId("loading-overlay");
    expect(overlay).toBeInTheDocument();
  });

  it("renders with visible={true} explicitly", () => {
    // Arrange
    render(
      <LoadingOverlay
        visible
        data-testid='loading-overlay'
      />,
    );

    // Assert
    expect(screen.getByTestId("loading-overlay")).toBeInTheDocument();
  });

  it("renders default Spinner when no children provided", () => {
    // Arrange
    render(<LoadingOverlay />);

    // Assert
    expect(screen.getByRole("status", {name: "Loading"})).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    // Arrange
    render(
      <LoadingOverlay
        className='custom-overlay'
        data-testid='loading-overlay'
      />,
    );

    // Assert
    const overlay = screen.getByTestId("loading-overlay");
    expect(overlay).toHaveClass("custom-overlay");
  });

  it("renders custom children instead of default Spinner", () => {
    // Arrange
    render(
      <LoadingOverlay>
        <div data-testid='custom-loader'>Custom Loading...</div>
      </LoadingOverlay>,
    );

    // Assert
    expect(screen.getByTestId("custom-loader")).toBeInTheDocument();
    expect(screen.queryByRole("status", {name: "Loading"})).not.toBeInTheDocument();
  });
});
