import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Badge, badgeVariants} from "./badge";
import styles from "./badge.module.css";

const badgeVariantsToTest = [
  ["default", styles.default],
  ["secondary", styles.secondary],
  ["destructive", styles.destructive],
  ["outline", styles.outline],
] as const;

describe("Badge", () => {
  it("renders without crashing", () => {
    render(<Badge>Content</Badge>);

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Badge ref={ref}>Content</Badge>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Badge className='custom-badge'>Content</Badge>);

    const badge = screen.getByText("Content");

    expect(badge).toHaveClass("custom-badge");
    expect(badge.className).not.toBe("custom-badge");
  });

  it("renders children", () => {
    render(
      <Badge>
        <span>Beta</span>
      </Badge>,
    );

    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it.each(badgeVariantsToTest)("applies the %s variant styles", (variant, expectedClassName) => {
    render(<Badge variant={variant}>Status</Badge>);

    const badge = screen.getByText("Status");

    expect(badge).toHaveClass(expectedClassName);
    expect(badge.className).toBe(badgeVariants({variant}));
  });

  it("forwards accessibility attributes", () => {
    render(
      <Badge
        aria-label='Status badge'
        aria-live='polite'>
        Online
      </Badge>,
    );

    const badge = screen.getByText("Online");

    expect(badge).toHaveAttribute("aria-label", "Status badge");
    expect(badge).toHaveAttribute("aria-live", "polite");
  });
});
