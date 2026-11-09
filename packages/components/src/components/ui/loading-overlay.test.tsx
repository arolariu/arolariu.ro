import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import {createRef} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {LoadingOverlay} from "./loading-overlay";
import styles from "./loading-overlay.module.css";

function requiredClass(name: string): string {
  const className = styles[name];
  if (typeof className !== "string" || className.trim().length === 0) {
    throw new Error(`Missing CSS Module class: ${name}`);
  }
  return className;
}

/** Authored CSS contract for one root-level rule; not browser rendering or assistive-technology proof. */
function declarations(selector: string): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  parse(readFileSync(join(import.meta.dirname, "loading-overlay.module.css"), "utf8")).walkRules((rule) => {
    if (rule.parent?.type !== "root" || rule.selector !== selector) return;
    rule.walkDecls((declaration) => {
      result.set(declaration.prop, declaration.value);
    });
  });
  return result;
}

describe("LoadingOverlay", () => {
  it("keeps one persistent status region mounted before, while and after the overlay is visible", () => {
    const {rerender} = render(<LoadingOverlay visible={false} />);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).not.toHaveAttribute("aria-busy");

    rerender(<LoadingOverlay />);
    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe("Loading");

    rerender(<LoadingOverlay visible={false} />);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toBeEmptyDOMElement();
  });

  it("writes a localized loadingLabel into the region while custom children stay visual overlay content", () => {
    const {rerender} = render(
      <LoadingOverlay
        visible={false}
        loadingLabel='Se încarcă fișierele'
        data-testid='overlay'>
        <p>Încărcăm trei fișiere</p>
      </LoadingOverlay>,
    );
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    rerender(
      <LoadingOverlay
        loadingLabel='Se încarcă fișierele'
        data-testid='overlay'>
        <p>Încărcăm trei fișiere</p>
      </LoadingOverlay>,
    );
    expect(status.textContent).toBe("Se încarcă fișierele");
    const overlay = screen.getByTestId("overlay");
    expect(overlay).toHaveTextContent("Încărcăm trei fișiere");
    expect(overlay).not.toContainElement(status);
    expect(status).not.toContainElement(screen.getByText("Încărcăm trei fișiere"));

    rerender(
      <LoadingOverlay
        loadingLabel='Încă două fișiere'
        data-testid='overlay'>
        <p>Încărcăm trei fișiere</p>
      </LoadingOverlay>,
    );
    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe("Încă două fișiere");
  });

  it("renders the visual overlay only while visible, without a role, name or live region of its own", () => {
    const {container, rerender} = render(
      <LoadingOverlay
        visible={false}
        data-testid='overlay'
      />,
    );
    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();

    rerender(<LoadingOverlay data-testid='overlay' />);
    const overlay = screen.getByTestId("overlay");
    expect(overlay).toHaveClass(requiredClass("overlay"));
    expect(overlay).not.toHaveAttribute("role");
    expect(overlay).not.toHaveAttribute("aria-label");
    expect(overlay).not.toHaveAttribute("aria-live");
    expect(overlay).not.toHaveAttribute("aria-atomic");
    expect(overlay.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).not.toContainElement(overlay);
  });

  it("keeps the status region visually hidden through its CSS Module rule", () => {
    render(<LoadingOverlay />);
    expect(screen.getByRole("status")).toHaveClass(requiredClass("status"));
    const rule = declarations(".status");
    expect(rule.get("position")).toBe("absolute");
    expect(rule.get("width")).toBe("1px");
    expect(rule.get("height")).toBe("1px");
    expect(rule.get("overflow")).toBe("hidden");
    expect(rule.get("clip-path")).toBe("inset(50%)");
    expect(rule.get("white-space")).toBe("nowrap");
  });

  it("keeps the region mounted but silent for an empty loadingLabel", () => {
    render(
      <LoadingOverlay
        loadingLabel=''
        data-testid='overlay'
      />,
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("server-renders the empty persistent region while hidden", () => {
    const hidden = renderToStaticMarkup(<LoadingOverlay visible={false} />);
    expect(hidden).toContain('role="status"');
    expect(hidden).not.toContain("Loading");
    expect(hidden).not.toContain("<svg");
    expect(renderToStaticMarkup(<LoadingOverlay loadingLabel='Chargement' />)).toContain(">Chargement</span>");
  });

  it("clears and reconnects the precise div ref across visibility changes", () => {
    const ref = createRef<HTMLDivElement>();
    const {rerender} = render(
      <LoadingOverlay
        ref={ref}
        data-testid='overlay'
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("overlay"));
    rerender(
      <LoadingOverlay
        ref={ref}
        data-testid='overlay'
        visible={false}
      />,
    );
    expect(ref.current).toBeNull();
    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    rerender(
      <LoadingOverlay
        ref={ref}
        data-testid='overlay'
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("overlay"));
  });

  it("applies consumer roles and naming to the visual overlay while the separate region holds the loading text", () => {
    render(
      <>
        <h2 id='progress-label'>Processing progress</h2>
        <LoadingOverlay
          role='progressbar'
          aria-labelledby='progress-label'
          aria-valuenow={30}
          aria-valuemin={0}
          aria-valuemax={100}
          loadingLabel='Processing'
        />
      </>,
    );
    const progress = screen.getByRole("progressbar", {name: "Processing progress"});
    expect(progress).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toBe("Processing");
    expect(progress).not.toContainElement(screen.getByRole("status"));
  });

  it("has one persistent status region and a decorative spinner by default", () => {
    const {container} = render(<LoadingOverlay />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toBeInstanceOf(HTMLSpanElement);
    expect(screen.getByRole("status").textContent).toBe("Loading");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).toHaveAttribute("role", "presentation");
    expect(container.querySelector("svg")).not.toHaveAttribute("aria-label");
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
          <LoadingOverlay
            visible={busy}
            loadingLabel='Working'>
            Working on the owned content
          </LoadingOverlay>
        </div>
      </>
    );
    const {rerender} = render(content(false));
    const action = screen.getByRole("button", {name: "Owned action"});
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
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
    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe("Working");
    expect(screen.getByText("Working on the owned content")).toBeInTheDocument();
    expect(screen.getByRole("region", {name: "Blocking owner"})).not.toContainElement(status);

    rerender(content(false));
    expect(screen.getByRole("region", {name: "Blocking owner"})).toHaveAttribute("aria-busy", "false");
    expect(screen.getByTestId("blocking-content")).not.toHaveAttribute("inert");
    expect(status).toBeEmptyDOMElement();
    await user.click(action);
    expect(activations).toBe(1);
  });

  it("renders without crashing", () => {
    render(<LoadingOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("renders only the empty persistent status region when not visible", () => {
    const {container} = render(<LoadingOverlay visible={false} />);

    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild).toBe(screen.getByRole("status"));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
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
    expect(overlay).toHaveClass(requiredClass("overlay"), requiredClass("blur"));
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
    render(<LoadingOverlay data-testid='loading-overlay' />);

    // Assert
    expect(screen.getByTestId("loading-overlay").querySelector('[data-slot="spinner"]')).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
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
    const {container} = render(
      <LoadingOverlay>
        <div data-testid='custom-loader'>Custom Loading...</div>
      </LoadingOverlay>,
    );

    // Assert
    expect(screen.getByTestId("custom-loader")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="spinner"]')).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Loading");
  });
});
