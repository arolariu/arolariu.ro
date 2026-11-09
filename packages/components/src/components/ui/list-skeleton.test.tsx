import {fireEvent, render, screen} from "@testing-library/react";
import {createRef} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {ListSkeleton as RootListSkeleton} from "../../index";
import {ListSkeleton} from "./list-skeleton";
import styles from "./list-skeleton.module.css";
import {VisuallyHidden} from "./visually-hidden";

describe("ListSkeleton", () => {
  it("has the same identity at the actual package root", () => {
    expect(RootListSkeleton).toBe(ListSkeleton);
  });

  it("renders the default number of items", () => {
    const {container} = render(<ListSkeleton />);

    expect(container.querySelectorAll(`.${styles.item}`)).toHaveLength(5);
    expect(container.querySelectorAll(`.${styles.avatar}`)).toHaveLength(5);
  });

  it("omits avatars when requested", () => {
    const {container} = render(<ListSkeleton showAvatar={false} />);

    expect(container.querySelectorAll(`.${styles.avatar}`)).toHaveLength(0);
    expect(container.querySelectorAll(`.${styles.primary}`)).toHaveLength(5);
    expect(container.querySelectorAll(`.${styles.secondary}`)).toHaveLength(5);
  });

  it("renders a custom item count with its avatar and text shapes", () => {
    const {container} = render(
      <ListSkeleton
        items={2}
        showAvatar
      />,
    );

    expect(container.querySelectorAll(`.${styles.item}`)).toHaveLength(2);
    expect(container.querySelectorAll(`.${styles.avatar}`)).toHaveLength(2);
    expect(container.querySelectorAll(`.${styles.primary}`)).toHaveLength(2);
    expect(container.querySelectorAll(`.${styles.secondary}`)).toHaveLength(2);
  });

  it.each([true, false])("renders an empty list for zero items with showAvatar=%s", (showAvatar) => {
    const {container} = render(
      <ListSkeleton
        items={0}
        showAvatar={showAvatar}
      />,
    );

    expect(container.firstElementChild).toBeEmptyDOMElement();
  });

  it.each([-1, -0.5, 0.5, NaN, Infinity, -Infinity, 10_001])("rejects invalid items %s before rendering", (items) => {
    expect(() => renderToStaticMarkup(<ListSkeleton items={items} />)).toThrow(RangeError);
    expect(() => renderToStaticMarkup(<ListSkeleton items={items} />)).toThrow(/ListSkeleton.*items.*10,000/);
  });

  it("accepts exactly 10,000 items without constructing a large test DOM", () => {
    expect(() => renderToStaticMarkup(<ListSkeleton items={10_000} />)).not.toThrow();
  });

  it("forwards its actual root ref, caller class and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    let clicks = 0;
    const {container} = render(
      <ListSkeleton
        ref={ref}
        id='list-loading'
        className='caller-list'
        title='List placeholder'
        onClick={() => {
          clicks += 1;
        }}
      />,
    );

    expect(ref.current).toBe(container.firstElementChild);
    expect(container.querySelector(`.${styles.list}`)).toBe(ref.current);
    expect(ref.current).toHaveClass("caller-list");
    expect(ref.current).toHaveAttribute("id", "list-loading");
    expect(ref.current).toHaveAttribute("title", "List placeholder");
    if (!ref.current) throw new Error("ListSkeleton root ref is missing");
    fireEvent.click(ref.current);
    expect(clicks).toBe(1);
  });

  it("keeps avatars and text decorative while a persistent caller-owned region announces loading", () => {
    const view = (loading: boolean): React.JSX.Element => (
      <>
        <VisuallyHidden role='status'>{loading ? "Loading results" : null}</VisuallyHidden>
        {loading ? (
          <ListSkeleton
            data-testid='skeleton'
            animated={false}
          />
        ) : (
          <p>Results ready</p>
        )}
      </>
    );
    const {container, rerender} = render(view(false));
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    rerender(view(true));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Loading results");
    expect(status).not.toHaveAttribute("aria-busy");
    expect(screen.getByTestId("skeleton")).not.toHaveAttribute("role");
    expect(screen.getByTestId("skeleton")).not.toContainElement(status);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    const placeholders = container.querySelectorAll('[data-slot="skeleton"]');
    expect(placeholders).toHaveLength(15);
    for (const placeholder of placeholders) {
      expect(placeholder).toHaveAttribute("aria-hidden", "true");
      expect(placeholder).toHaveAttribute("data-animated", "false");
      expect(placeholder).not.toHaveAttribute("role");
    }
  });

  it("does not invent a loading announcement and keeps default Skeleton motion", () => {
    const {container} = render(<ListSkeleton />);

    expect(container.firstElementChild).not.toHaveAttribute("role");
    expect(container.firstElementChild).not.toHaveAttribute("aria-live");
    for (const placeholder of container.querySelectorAll('[data-slot="skeleton"]')) {
      expect(placeholder).toHaveAttribute("data-animated", "true");
    }
  });
});
