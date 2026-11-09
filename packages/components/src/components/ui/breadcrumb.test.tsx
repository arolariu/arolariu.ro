import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
import styles from "./breadcrumb.module.css";

describe("React 19 refresh", () => {
  it("exposes current page text without inventing a disabled link", () => {
    render(<BreadcrumbPage>Current page</BreadcrumbPage>);
    const page = screen.getByText("Current page");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).not.toHaveAttribute("role");
    expect(page).not.toHaveAttribute("aria-disabled");
    expect(typeof BreadcrumbLink).toBe("function");
    expectTypeOf<React.ComponentProps<typeof Breadcrumb>>().not.toHaveProperty("separator");
    expectTypeOf<React.ComponentProps<typeof BreadcrumbLink>>().not.toHaveProperty("asChild");
  });
});

function ConsumerLink(props: Readonly<React.ComponentPropsWithRef<"a">>): React.ReactElement {
  return <a {...props} />;
}

describe("Breadcrumb", () => {
  it("preserves child and wrapper handlers under BreadcrumbLink render", async () => {
    const user = userEvent.setup();
    const childClick = vi.fn();
    const wrapperClick = vi.fn();
    render(
      <BreadcrumbLink
        onClick={wrapperClick}
        render={
          <a
            href='#details'
            onClick={childClick}>
            Details
          </a>
        }
      />,
    );

    await user.click(screen.getByRole("link", {name: "Details"}));

    expect(childClick).toHaveBeenCalledTimes(1);
    expect(wrapperClick).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("link", {name: "Details"})).toHaveLength(1);
  });

  it("preserves both DOM refs and detaches them under BreadcrumbLink render", () => {
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLAnchorElement>();
    const {unmount} = render(
      <BreadcrumbLink
        ref={wrapperRef}
        render={
          <a
            href='#details'
            ref={childRef}>
            Details
          </a>
        }
      />,
    );
    const link = screen.getByRole("link", {name: "Details"});

    expect(childRef.current).toBe(link);
    expect(wrapperRef.current).toBe(link);
    unmount();
    expect(childRef.current).toBeNull();
    expect(wrapperRef.current).toBeNull();
  });

  it("composes modern render elements with both refs, events, classes and original content", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLAnchorElement>();
    render(
      <BreadcrumbLink
        ref={wrapperRef}
        className='wrapper-link'
        onClick={() => calls.push("wrapper")}
        render={
          <a
            ref={childRef}
            href='#modern'
            className='child-link'
            onClick={() => calls.push("child")}>
            <span>Modern breadcrumb</span>
          </a>
        }>
        Wrapper fallback
      </BreadcrumbLink>,
    );
    const link = screen.getByRole("link", {name: "Modern breadcrumb"});
    await user.click(link);

    expect(calls).toEqual(["child", "wrapper"]);
    expect(link).toHaveClass("child-link", "wrapper-link");
    expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
    expect(link.querySelector("a")).toBeNull();
    expect(screen.queryByText("Wrapper fallback")).not.toBeInTheDocument();
    expect(childRef.current).toBe(link);
    expect(wrapperRef.current).toBe(link);
  });

  it("supplies owned namespace state, anchor attributes and a polymorphic merged callback ref", () => {
    const anchorRef = React.createRef<HTMLAnchorElement>();
    const fixture: BreadcrumbLink.Props = {
      href: "#callback",
      ref: anchorRef,
      children: <span>Callback breadcrumb</span>,
      render: (props, state): React.ReactElement => {
        expectTypeOf(state).toEqualTypeOf<BreadcrumbLink.State>();
        expectTypeOf(props.ref).toEqualTypeOf<React.RefCallback<HTMLElement> | null | undefined>();
        expectTypeOf(props.href).toEqualTypeOf<string | undefined>();
        return (
          <a
            {...props}
            data-state={state.slot}
          />
        );
      },
    };
    render(<BreadcrumbLink {...fixture} />);

    const link = screen.getByRole("link", {name: "Callback breadcrumb"});
    expect(link).toHaveAttribute("href", "#callback");
    expect(link).toHaveAttribute("data-state", "breadcrumb-link");
    expect(anchorRef.current).toBe(link);
  });

  it("passes wrapper content, events and refs through a real custom render link", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLAnchorElement>();
    const fixture: BreadcrumbLink.Props = {
      href: "#custom",
      ref: wrapperRef,
      onClick: () => calls.push("wrapper"),
      render: (
        <ConsumerLink
          ref={childRef}
          onClick={() => calls.push("child")}
        />
      ),
      children: <span>Custom breadcrumb link</span>,
    };
    render(<BreadcrumbLink {...fixture} />);
    const link = screen.getByRole("link", {name: "Custom breadcrumb link"});
    await user.click(link);

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "#custom");
    expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
    expect(link.querySelector("a")).toBeNull();
    expect(childRef.current).toBe(link);
    expect(wrapperRef.current).toBe(link);
    expect(calls).toEqual(["child", "wrapper"]);
  });

  it("allows a render callback to use its actual label target and ref without anchor-only ref assumptions", async () => {
    const user = userEvent.setup();
    const labelRef = React.createRef<HTMLLabelElement>();
    const fixture: BreadcrumbLink.Props = {
      ref: labelRef,
      children: "Select location",
      render: (props): React.ReactElement => (
        <label
          {...props}
          htmlFor='location-choice'
        />
      ),
    };
    render(
      <>
        <BreadcrumbLink {...fixture} />
        <input
          id='location-choice'
          type='checkbox'
        />
      </>,
    );
    await user.click(screen.getByText("Select location"));

    expect(labelRef.current).toBe(screen.getByText("Select location"));
    expect(labelRef.current?.tagName).toBe("LABEL");
    expect(screen.getByRole("checkbox", {name: "Select location"})).toBeChecked();
  });

  it("preserves native cancellation and child-first precedence with render", () => {
    const calls: string[] = [];
    const child = (
      <a
        href='#cancelled'
        onClick={(event) => {
          calls.push(`child:${event.defaultPrevented}`);
          event.preventDefault();
        }}>
        Cancel breadcrumb navigation
      </a>
    );
    const onClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => calls.push(`wrapper:${event.defaultPrevented}`);
    render(
      <BreadcrumbLink
        render={child}
        onClick={onClick}
      />,
    );

    expect(fireEvent.click(screen.getByRole("link", {name: "Cancel breadcrumb navigation"}))).toBe(false);
    expect(calls).toEqual(["child:false", "wrapper:true"]);
  });

  it("allows explicit Base UI cancellation to suppress the wrapper without suppressing native cancellation", () => {
    const wrapperClick = vi.fn();
    render(
      <BreadcrumbLink
        onClick={wrapperClick}
        render={
          <a
            href='#prevented'
            onClick={(event) => {
              event.preventDefault();
              if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") {
                event.preventBaseUIHandler();
              }
            }}>
            Prevent breadcrumb wrapper
          </a>
        }
      />,
    );

    expect(fireEvent.click(screen.getByRole("link", {name: "Prevent breadcrumb wrapper"}))).toBe(false);
    expect(wrapperClick).not.toHaveBeenCalled();
  });

  it("lets a wrapper cancel native navigation after preserving the child handler", () => {
    const calls: string[] = [];
    render(
      <BreadcrumbLink
        onClick={(event) => {
          calls.push("wrapper");
          event.preventDefault();
        }}
        render={
          <a
            href='#cancelled-by-wrapper'
            onClick={() => calls.push("child")}>
            Wrapper cancellation
          </a>
        }
      />,
    );

    expect(fireEvent.click(screen.getByRole("link", {name: "Wrapper cancellation"}))).toBe(false);
    expect(calls).toEqual(["child", "wrapper"]);
  });

  it("runs cleanup for both composed callback refs", () => {
    const attached: (HTMLElement | null)[] = [];
    const childCleanup = vi.fn();
    const wrapperCleanup = vi.fn();
    const childRef: React.RefCallback<HTMLAnchorElement> = (node) => {
      attached.push(node);
      return childCleanup;
    };
    const wrapperRef: React.RefCallback<HTMLAnchorElement> = (node) => {
      attached.push(node);
      return wrapperCleanup;
    };
    const {unmount} = render(
      <BreadcrumbLink
        ref={wrapperRef}
        render={
          <a
            ref={childRef}
            href='#cleanup'>
            Cleanup
          </a>
        }
      />,
    );
    const link = screen.getByRole("link", {name: "Cleanup"});

    expect(attached).toEqual([link, link]);
    unmount();
    expect(childCleanup).toHaveBeenCalledTimes(1);
    expect(wrapperCleanup).toHaveBeenCalledTimes(1);
  });

  it("preserves native nav, ordered-list, list-item and current-page semantics with refs and slots", async () => {
    const user = userEvent.setup();
    const navRef = React.createRef<HTMLElement>();
    const listRef = React.createRef<HTMLOListElement>();
    const itemRef = React.createRef<HTMLLIElement>();
    const pageRef = React.createRef<HTMLSpanElement>();
    const separatorRef = React.createRef<HTMLLIElement>();
    const ellipsisRef = React.createRef<HTMLSpanElement>();
    render(
      <Breadcrumb
        ref={navRef}
        aria-label='Location'>
        <BreadcrumbList ref={listRef}>
          <BreadcrumbItem ref={itemRef}>
            <BreadcrumbLink href='#home'>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator ref={separatorRef} />
          <BreadcrumbItem>
            <BreadcrumbEllipsis
              ref={ellipsisRef}
              className='custom-ellipsis'
            />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage ref={pageRef}>Current location</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(navRef.current).toBe(screen.getByRole("navigation", {name: "Location"}));
    expect(navRef.current?.tagName).toBe("NAV");
    expect(listRef.current).toBe(screen.getByRole("list"));
    expect(listRef.current?.tagName).toBe("OL");
    expect(itemRef.current?.tagName).toBe("LI");
    expect(pageRef.current?.tagName).toBe("SPAN");
    expect(pageRef.current).toHaveAttribute("aria-current", "page");
    expect(pageRef.current).not.toHaveAttribute("aria-disabled");
    expect(pageRef.current).not.toHaveAttribute("tabindex");
    expect(separatorRef.current?.tagName).toBe("LI");
    expect(separatorRef.current).toHaveAttribute("role", "presentation");
    expect(separatorRef.current).toHaveAttribute("aria-hidden", "true");
    expect(ellipsisRef.current).toHaveAttribute("role", "presentation");
    expect(ellipsisRef.current).toHaveAttribute("aria-hidden", "true");
    expect(ellipsisRef.current).toHaveClass("custom-ellipsis");
    for (const [ref, slot] of [
      [navRef, "breadcrumb"],
      [listRef, "breadcrumb-list"],
      [itemRef, "breadcrumb-item"],
      [pageRef, "breadcrumb-page"],
      [separatorRef, "breadcrumb-separator"],
      [ellipsisRef, "breadcrumb-ellipsis"],
    ] as const) {
      expect(ref.current).toHaveAttribute("data-slot", slot);
    }
    await user.tab();
    expect(screen.getByRole("link", {name: "Home"})).toHaveFocus();
    await user.tab();
    expect(pageRef.current).not.toHaveFocus();
  });

  it("only marks the default decorative chevron for RTL", () => {
    const chevronClass = styles.chevron;
    if (chevronClass === undefined) {
      throw new Error("Missing default chevron CSS class");
    }
    render(
      <Breadcrumb dir='rtl'>
        <BreadcrumbList>
          <BreadcrumbSeparator data-testid='default-chevron' />
          <BreadcrumbSeparator data-testid='custom-chevron'>
            <svg aria-label='Custom symbol' />
          </BreadcrumbSeparator>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(screen.getByRole("navigation")).not.toHaveAttribute("separator");
    expect(screen.getByTestId("default-chevron").querySelector("svg")?.classList.contains(chevronClass)).toBe(true);
    expect(screen.getByTestId("custom-chevron").querySelector("svg")?.classList.contains(chevronClass)).toBe(false);
  });

  it("supports fragment content and empty render targets without nested anchors", () => {
    render(
      <>
        <BreadcrumbLink href='#fragment'>
          <>Fragment breadcrumb</>
        </BreadcrumbLink>
        <BreadcrumbLink
          render={
            <a
              href='#empty'
              aria-label='Empty breadcrumb'
            />
          }
        />
      </>,
    );

    expect(screen.getByRole("link", {name: "Fragment breadcrumb"}).tagName).toBe("A");
    expect(screen.getByRole("link", {name: "Empty breadcrumb"})).toBeEmptyDOMElement();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders the breadcrumb structure, merges class names, renders children, and exposes accessibility attributes", () => {
    // Arrange
    render(
      <Breadcrumb
        className='custom-root'
        data-testid='breadcrumb-root'>
        <BreadcrumbList
          className='custom-list'
          data-testid='breadcrumb-list'>
          <BreadcrumbItem className='custom-item'>
            <BreadcrumbLink
              href='/dashboard'
              className='custom-link'>
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator
            className='custom-separator'
            data-testid='breadcrumb-separator'>
            /
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage
              className='custom-page'
              data-testid='breadcrumb-page'>
              Settings
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid='breadcrumb-ellipsis' />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    expect(screen.getByRole("navigation", {name: /breadcrumb/i})).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumb-root")).toHaveClass("custom-root");
    expect(screen.getByTestId("breadcrumb-list")).toHaveClass("custom-list");
    expect(screen.getByText("Dashboard").closest("a")).toHaveClass("custom-link");
    expect(screen.getByText("Dashboard").closest("li")).toHaveClass("custom-item");
    expect(screen.getByTestId("breadcrumb-separator")).toHaveClass("custom-separator");
    expect(screen.getByTestId("breadcrumb-page")).toHaveClass("custom-page");
    expect(screen.getByRole("link", {name: "Dashboard"})).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Settings")).not.toHaveAttribute("aria-disabled");
    expect(screen.getByTestId("breadcrumb-ellipsis")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders BreadcrumbLink with href", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/home'>Home</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const link = screen.getByRole("link", {name: "Home"});
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/home");
  });

  it("renders BreadcrumbPage as current page", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Current Page</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const page = screen.getByText("Current Page");
    expect(page).toBeInTheDocument();
    expect(page).not.toHaveAttribute("role");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).not.toHaveAttribute("aria-disabled");
  });

  it("renders BreadcrumbEllipsis with default icon", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid='ellipsis' />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const ellipsis = screen.getByTestId("ellipsis");
    expect(ellipsis).toBeInTheDocument();
    expect(ellipsis).toHaveAttribute("role", "presentation");
    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
    expect(ellipsis.querySelector("svg")).toHaveAttribute("focusable", "false");
  });

  it("renders BreadcrumbSeparator with custom separator", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/'>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid='custom-separator'>→</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href='/products'>Products</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const separator = screen.getByTestId("custom-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveTextContent("→");
    expect(separator).toHaveAttribute("role", "presentation");
    expect(separator).toHaveAttribute("aria-hidden", "true");
  });

  it("renders BreadcrumbSeparator with default ChevronRight icon when no children", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/'>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid='default-separator' />
          <BreadcrumbItem>
            <BreadcrumbLink href='/products'>Products</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const separator = screen.getByTestId("default-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("role", "presentation");
  });

  it("renders BreadcrumbLink with a custom render target", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href='/dashboard'
              render={
                <a
                  className='custom-child-link'
                  data-testid='child-link'>
                  Dashboard
                </a>
              }
            />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const link = screen.getByTestId("child-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass("custom-child-link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders BreadcrumbLink with a default anchor tag", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href='/about'
              data-testid='standard-link'>
              About
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const link = screen.getByTestId("standard-link");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/about");
  });

  it("merges className from the render target", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              className='parent-class'
              render={
                <a
                  className='child-class'
                  href='/link'>
                  Link
                </a>
              }
            />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const link = screen.getByRole("link", {name: "Link"});
    expect(link).toHaveClass("parent-class");
    expect(link).toHaveClass("child-class");
  });

  it("renders multiple breadcrumb items in sequence", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/'>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href='/category'>Category</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href='/subcategory'>Subcategory</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    expect(screen.getByRole("link", {name: "Home"})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Category"})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Subcategory"})).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("applies custom className to all breadcrumb components", () => {
    // Arrange & Act
    render(
      <Breadcrumb className='custom-breadcrumb'>
        <BreadcrumbList className='custom-list'>
          <BreadcrumbItem className='custom-item'>
            <BreadcrumbLink
              className='custom-link'
              href='/'>
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className='custom-separator' />
          <BreadcrumbItem className='custom-item-2'>
            <BreadcrumbPage className='custom-page'>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    expect(screen.getByRole("navigation")).toHaveClass("custom-breadcrumb");
    expect(screen.getByRole("list")).toHaveClass("custom-list");
    expect(screen.getByRole("link", {name: "Home"})).toHaveClass("custom-link");
    expect(screen.getByText("Current")).toHaveClass("custom-page");
  });
});
