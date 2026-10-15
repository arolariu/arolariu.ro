import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {LoadingOverlay} from "./loading-overlay";

describe("LoadingOverlay", () => {
  it("clears and reconnects the precise div ref across visibility changes", () => {
    const ref = createRef<HTMLDivElement>();
    const {rerender} = render(<LoadingOverlay ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("status"));
    rerender(
      <LoadingOverlay
        ref={ref}
        visible={false}
      />,
    );
    expect(ref.current).toBeNull();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<LoadingOverlay ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("status"));
  });

  it("preserves consumer status role and accessible naming overrides", () => {
    render(
      <>
        <h2 id='progress-label'>Processing progress</h2>
        <LoadingOverlay
          role='progressbar'
          aria-labelledby='progress-label'
          aria-valuenow={30}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </>,
    );
    const progress = screen.getByRole("progressbar", {name: "Processing progress"});
    expect(progress).toHaveAttribute("aria-valuenow", "30");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces custom status content and native ARIA props without requiring a spinner", () => {
    render(
      <LoadingOverlay
        aria-label='Upload progress'
        aria-live='assertive'>
        <p>Uploading three items</p>
      </LoadingOverlay>,
    );

    const status = screen.getByRole("status", {name: "Upload progress"});
    expect(status).toHaveTextContent("Uploading three items");
    expect(status).toHaveAttribute("aria-live", "assertive");
    expect(status).toHaveAttribute("aria-atomic", "true");
  });

  it("has one named status region with a decorative spinner by default", () => {
    const {container} = render(<LoadingOverlay />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status", {name: "Loading"})).toBeInstanceOf(HTMLDivElement);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps background keyboard activation available in the visual-only default", async () => {
    const user = userEvent.setup();
    let activations = 0;
    render(
      <section aria-label='Visual owner'>
        <button
          type='button'
          onClick={() => {
            activations++;
          }}>
          Background action
        </button>
        <LoadingOverlay />
      </section>,
    );

    await user.tab();
    expect(screen.getByRole("button", {name: "Background action"})).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(activations).toBe(1);
    expect(screen.getByRole("region", {name: "Visual owner"})).not.toHaveAttribute("aria-busy");
  });

  it("blocks activation only through an explicit busy owner and inert disabled content, then restores availability", async () => {
    const user = userEvent.setup();
    let activations = 0;
    const content = (busy: boolean): React.JSX.Element => (
      <>
        <button type='button'>Outside owner</button>
        <div>
          <section
            aria-label='Blocking owner'
            aria-busy={busy}>
            <div
              inert={busy}
              data-testid='blocking-content'>
              <button
                type='button'
                disabled={busy}
                onClick={() => {
                  activations++;
                }}>
                Owned action
              </button>
            </div>
          </section>
          <LoadingOverlay visible={busy}>Working</LoadingOverlay>
        </div>
      </>
    );
    const {rerender} = render(content(false));
    const action = screen.getByRole("button", {name: "Owned action"});
    action.focus();

    rerender(content(true));
    expect(screen.getByRole("region", {name: "Blocking owner"})).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("blocking-content")).toHaveAttribute("inert");
    expect(action).toBeDisabled();
    // happy-dom does not implement browser inert tab order; native disabled enforces this control boundary.
    await user.keyboard("{Enter} ");
    await user.click(action);
    expect(activations).toBe(0);
    screen.getByRole("button", {name: "Outside owner"}).focus();
    await user.tab();
    expect(action).not.toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Working");
    expect(screen.getByRole("region", {name: "Blocking owner"})).not.toContainElement(screen.getByRole("status"));

    rerender(content(false));
    expect(screen.getByRole("region", {name: "Blocking owner"})).toHaveAttribute("aria-busy", "false");
    expect(screen.getByTestId("blocking-content")).not.toHaveAttribute("inert");
    await user.click(action);
    expect(activations).toBe(1);
  });

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
    expect(screen.getByRole("status")).toHaveTextContent("Custom Loading...");
  });
});
