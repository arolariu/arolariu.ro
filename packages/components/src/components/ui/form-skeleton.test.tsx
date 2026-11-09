import {fireEvent, render, screen} from "@testing-library/react";
import {createRef} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {FormSkeleton as RootFormSkeleton} from "../../index";
import {FormSkeleton} from "./form-skeleton";
import styles from "./form-skeleton.module.css";
import {VisuallyHidden} from "./visually-hidden";

describe("FormSkeleton", () => {
  it("has the same identity at the actual package root", () => {
    expect(RootFormSkeleton).toBe(FormSkeleton);
  });

  it("renders the default four fields and submit shape", () => {
    const {container} = render(<FormSkeleton />);

    expect(container.querySelectorAll(`.${styles.field}`)).toHaveLength(4);
    expect(container.querySelectorAll(`.${styles.label}`)).toHaveLength(4);
    expect(container.querySelectorAll(`.${styles.input}`)).toHaveLength(4);
    expect(container.querySelectorAll(`.${styles.submit}`)).toHaveLength(1);
  });

  it("renders a custom number of fields", () => {
    const {container} = render(<FormSkeleton fields={6} />);

    expect(container.querySelectorAll(`.${styles.field}`)).toHaveLength(6);
  });

  it("preserves the submit shape with zero fields", () => {
    const {container} = render(<FormSkeleton fields={0} />);

    expect(container.querySelectorAll(`.${styles.field}`)).toHaveLength(0);
    expect(container.querySelectorAll(`.${styles.submit}`)).toHaveLength(1);
  });

  it.each([-1, -0.5, 0.5, NaN, Infinity, -Infinity, 10_001])("rejects invalid fields %s before rendering", (fields) => {
    expect(() => renderToStaticMarkup(<FormSkeleton fields={fields} />)).toThrow(RangeError);
    expect(() => renderToStaticMarkup(<FormSkeleton fields={fields} />)).toThrow(/FormSkeleton.*fields.*10,000/);
  });

  it("accepts exactly 10,000 fields without constructing a large test DOM", () => {
    expect(() => renderToStaticMarkup(<FormSkeleton fields={10_000} />)).not.toThrow();
  });

  it("forwards its actual root ref, caller class and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    let clicks = 0;
    const {container} = render(
      <FormSkeleton
        ref={ref}
        id='form-loading'
        className='caller-form'
        title='Form placeholder'
        onClick={() => {
          clicks += 1;
        }}
      />,
    );

    expect(ref.current).toBe(container.firstElementChild);
    expect(container.querySelector(`.${styles.form}`)).toBe(ref.current);
    expect(ref.current).toHaveClass("caller-form");
    expect(ref.current).toHaveAttribute("id", "form-loading");
    expect(ref.current).toHaveAttribute("title", "Form placeholder");
    if (!ref.current) throw new Error("FormSkeleton root ref is missing");
    fireEvent.click(ref.current);
    expect(clicks).toBe(1);
  });

  it("keeps label, input and submit placeholders decorative while a persistent caller-owned region announces loading", () => {
    const view = (loading: boolean): React.JSX.Element => (
      <>
        <VisuallyHidden role='status'>{loading ? "Loading form" : null}</VisuallyHidden>
        {loading ? (
          <FormSkeleton
            data-testid='skeleton'
            animated={false}
          />
        ) : (
          <p>Form ready</p>
        )}
      </>
    );
    const {container, rerender} = render(view(false));
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    rerender(view(true));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Loading form");
    expect(status).not.toHaveAttribute("aria-busy");
    expect(screen.getByTestId("skeleton")).not.toHaveAttribute("role");
    expect(screen.getByTestId("skeleton")).not.toContainElement(status);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const placeholders = container.querySelectorAll('[data-slot="skeleton"]');
    expect(placeholders).toHaveLength(9);
    for (const placeholder of placeholders) {
      expect(placeholder).toHaveAttribute("aria-hidden", "true");
      expect(placeholder).toHaveAttribute("data-animated", "false");
      expect(placeholder).not.toHaveAttribute("role");
    }
  });

  it("does not invent a loading announcement and keeps default Skeleton motion", () => {
    const {container} = render(<FormSkeleton />);

    expect(container.firstElementChild).not.toHaveAttribute("role");
    expect(container.firstElementChild).not.toHaveAttribute("aria-live");
    for (const placeholder of container.querySelectorAll('[data-slot="skeleton"]')) {
      expect(placeholder).toHaveAttribute("data-animated", "true");
    }
  });
});
