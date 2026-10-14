import {fireEvent, render, screen} from "@testing-library/react";
import {createRef} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {CardSkeleton as RootCardSkeleton} from "../../index";
import {CardSkeleton} from "./card-skeleton";
import styles from "./card-skeleton.module.css";

describe("CardSkeleton", () => {
  it("has the same identity at the actual package root", () => {
    expect(RootCardSkeleton).toBe(CardSkeleton);
  });

  it("renders the default number of skeleton lines", () => {
    const {container} = render(<CardSkeleton />);

    expect(container.querySelectorAll(`.${styles.line}`)).toHaveLength(3);
  });

  it("renders a custom number of skeleton lines", () => {
    const {container} = render(<CardSkeleton lines={5} />);

    expect(container.querySelectorAll(`.${styles.line}`)).toHaveLength(5);
    expect(container.querySelectorAll(`.${styles.lineShort}`)).toHaveLength(1);
  });

  it("preserves header and footer shapes with zero body lines", () => {
    const {container} = render(<CardSkeleton lines={0} />);

    expect(container.querySelectorAll(`.${styles.line}`)).toHaveLength(0);
    expect(container.querySelectorAll(`.${styles.title}`)).toHaveLength(1);
    expect(container.querySelectorAll(`.${styles.subtitle}`)).toHaveLength(1);
    expect(container.querySelectorAll(`.${styles.button}`)).toHaveLength(1);
  });

  it.each([-1, -0.5, 0.5, NaN, Infinity, -Infinity, 10_001])("rejects invalid lines %s before rendering", (lines) => {
    expect(() => renderToStaticMarkup(<CardSkeleton lines={lines} />)).toThrow(RangeError);
    expect(() => renderToStaticMarkup(<CardSkeleton lines={lines} />)).toThrow(/CardSkeleton.*lines.*10,000/);
  });

  it("accepts exactly 10,000 lines without constructing a large test DOM", () => {
    expect(() => renderToStaticMarkup(<CardSkeleton lines={10_000} />)).not.toThrow();
  });

  it("forwards its actual root ref, caller class and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    let clicks = 0;
    const {container} = render(
      <CardSkeleton
        ref={ref}
        id='card-loading'
        className='caller-card'
        title='Summary placeholder'
        onClick={() => {
          clicks += 1;
        }}
      />,
    );

    expect(ref.current).toBe(container.firstElementChild);
    expect(container.querySelector(`.${styles.card}`)).toBe(ref.current);
    expect(ref.current).toHaveClass("caller-card");
    expect(ref.current).toHaveAttribute("id", "card-loading");
    expect(ref.current).toHaveAttribute("title", "Summary placeholder");
    if (!ref.current) throw new Error("CardSkeleton root ref is missing");
    fireEvent.click(ref.current);
    expect(clicks).toBe(1);
  });

  it("keeps every placeholder decorative with one caller-owned loading announcement", () => {
    const {container} = render(
      <CardSkeleton
        role='status'
        aria-label='Loading summary'
        aria-busy
        aria-live='polite'
        animated={false}
      />,
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status", {name: "Loading summary"})).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    const placeholders = container.querySelectorAll('[data-slot="skeleton"]');
    expect(placeholders).toHaveLength(6);
    for (const placeholder of placeholders) {
      expect(placeholder).toHaveAttribute("aria-hidden", "true");
      expect(placeholder).toHaveAttribute("data-animated", "false");
      expect(placeholder).not.toHaveAttribute("role");
    }
  });

  it("does not invent a loading announcement and keeps default Skeleton motion", () => {
    const {container} = render(<CardSkeleton />);

    expect(container.firstElementChild).not.toHaveAttribute("role");
    expect(container.firstElementChild).not.toHaveAttribute("aria-live");
    for (const placeholder of container.querySelectorAll('[data-slot="skeleton"]')) {
      expect(placeholder).toHaveAttribute("data-animated", "true");
    }
  });
});
