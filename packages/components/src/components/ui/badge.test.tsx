import {mergeProps} from "@base-ui/react/merge-props";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef} from "react";
import {describe, expect, it, vi} from "vitest";

import {Badge, badgeVariants} from "./badge";
import styles from "./badge.module.css";
import {CallbackRender, Ghost, Large, Link, WithDot} from "./badge.stories";

const badgeVariantsToTest = [
  ["default", styles.default],
  ["secondary", styles.secondary],
  ["destructive", styles.destructive],
  ["outline", styles.outline],
  ["ghost", styles.ghost],
  ["link", styles.link],
] as const;

describe("Badge", () => {
  it("renders the canonical inline span with slot and variant metadata", () => {
    render(<Badge>Content</Badge>);

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Content").tagName).toBe("SPAN");
    expect(screen.getByText("Content")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByText("Content")).toHaveAttribute("data-variant", "default");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSpanElement>();

    render(<Badge ref={ref}>Content</Badge>);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
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
    expect(badge).toHaveClass(styles.badge);
    expect(badge).toHaveAttribute("data-variant", variant);
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

  it("generates default and customized classes without rendering", () => {
    expect(badgeVariants()).toContain(styles.badge);
    expect(badgeVariants()).toContain(styles.default);
    expect(badgeVariants({variant: "ghost", className: "consumer"})).toContain(styles.ghost);
    expect(badgeVariants({variant: "link", className: "consumer"})).toContain(styles.link);
    expect(badgeVariants({className: "consumer"})).toContain("consumer");
  });

  it("composes navigation, child content, both refs, classes, and event handlers", async () => {
    const user = userEvent.setup();
    const wrapperRef = createRef<HTMLSpanElement>();
    const childRef = createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <Badge
        ref={wrapperRef}
        variant='link'
        className='wrapper'
        onClick={() => calls.push("wrapper")}
        render={
          <a
            href='#release'
            ref={childRef}
            className='child'
            onClick={(event) => {
              event.preventDefault();
              calls.push("child");
            }}>
            Release notes
          </a>
        }>
        Fallback
      </Badge>,
    );
    const link = screen.getByRole("link", {name: "Release notes"});
    expect(link).toHaveAttribute("href", "#release");
    expect(link).toHaveClass(styles.badge, styles.link, "wrapper", "child");
    expect(screen.queryByText("Fallback")).not.toBeInTheDocument();
    expect(wrapperRef.current).toBe(link);
    expect(childRef.current).toBe(link);
    await user.click(link);
    expect(calls).toEqual(["child", "wrapper"]);
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("preserves wrapper content for empty render elements", () => {
    render(<Badge render={<a href='#beta' />}>Beta</Badge>);
    expect(screen.getByRole("link", {name: "Beta"})).toBeInTheDocument();
  });

  it("evaluates callback renders with current badge state and forwarded props", () => {
    const ref = createRef<HTMLSpanElement>();
    const renderBadge: Exclude<React.ComponentProps<typeof Badge>["render"], React.ReactElement | undefined> = (props, state) => (
      <span
        {...props}
        aria-label={`${state.slot}-${state.variant}`}
      />
    );
    const {rerender} = render(
      <Badge
        ref={ref}
        variant='outline'
        render={renderBadge}>
        Preview
      </Badge>,
    );
    expect(screen.getByLabelText("badge-outline")).toHaveTextContent("Preview");
    expect(ref.current).toBe(screen.getByLabelText("badge-outline"));
    rerender(
      <Badge
        ref={ref}
        variant='ghost'
        render={renderBadge}>
        Updated
      </Badge>,
    );
    expect(screen.getByLabelText("badge-ghost")).toHaveTextContent("Updated");
    expect(ref.current).toBe(screen.getByLabelText("badge-ghost"));
  });

  it("allows a rendered child's event to cancel the wrapper handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Badge
        onClick={onClick}
        render={
          <a
            href='#release'
            {...mergeProps<"a">(
              {},
              {
                onClick: (event) => {
                  event.preventDefault();
                  event.preventBaseUIHandler();
                },
              },
            )}
          />
        }>
        Release
      </Badge>,
    );
    await user.click(screen.getByRole("link", {name: "Release"}));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders the real new variant and callback stories", () => {
    render(
      <>
        <Badge {...Ghost.args} />
        <Badge {...Link.args} />
        <Badge {...CallbackRender.args} />
      </>,
    );
    expect(screen.getByText("Ghost")).toHaveClass(styles.ghost);
    expect(screen.getByRole("link", {name: "Release notes"})).toHaveAttribute("href", "#release-notes");
    expect(screen.getByLabelText("outline badge")).toHaveTextContent("Preview");
  });

  it("renders real status and size stories with CSS Module styling", () => {
    render(
      <>
        <WithDot.render />
        <Large.render />
      </>,
    );
    expect(screen.getByText("Active").querySelector("span")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Large Default")).toHaveClass(styles.storyLarge);
  });
});
