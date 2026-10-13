import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./item";
import styles from "./item.module.css";

function ConsumerLink(props: Readonly<React.ComponentPropsWithRef<"a">>): React.ReactElement {
  return <a {...props} />;
}

describe("Item", () => {
  it("preserves child and wrapper handlers under Item asChild", async () => {
    const user = userEvent.setup();
    const childClick = vi.fn();
    const wrapperClick = vi.fn();
    render(
      <Item
        asChild
        onClick={wrapperClick}>
        <a
          href='#details'
          onClick={childClick}>
          Details
        </a>
      </Item>,
    );

    await user.click(screen.getByRole("link", {name: "Details"}));

    expect(childClick).toHaveBeenCalledTimes(1);
    expect(wrapperClick).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("link", {name: "Details"})).toHaveLength(1);
  });

  it("preserves both DOM refs and detaches them under Item asChild", () => {
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const {unmount} = render(
      <Item
        asChild
        ref={wrapperRef}>
        <a
          href='#details'
          ref={childRef}>
          Details
        </a>
      </Item>,
    );
    const link = screen.getByRole("link", {name: "Details"});

    expect(childRef.current).toBe(link);
    expect(wrapperRef.current).toBe(link);
    unmount();
    expect(childRef.current).toBeNull();
    expect(wrapperRef.current).toBeNull();
  });

  it("composes a modern render element without nesting or replacing its own content", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLAnchorElement>();
    render(
      <Item
        render={
          <a
            ref={childRef}
            href='#modern'
            className='child-link'
            aria-label='Modern details'
            onClick={() => calls.push("child")}>
            <span>Child details</span>
          </a>
        }
        ref={wrapperRef}
        className='wrapper-link'
        onClick={() => calls.push("wrapper")}>
        Wrapper fallback
      </Item>,
    );

    const link = screen.getByRole("link", {name: "Modern details"});
    await user.click(link);

    expect(calls).toEqual(["child", "wrapper"]);
    expect(link).toHaveClass("child-link", "wrapper-link");
    expect(link).toHaveTextContent("Child details");
    expect(screen.queryByText("Wrapper fallback")).not.toBeInTheDocument();
    expect(link.querySelector("a")).toBeNull();
    expect(childRef.current).toBe(link);
    expect(wrapperRef.current).toBe(link);
  });

  it("supplies owned namespace state and a polymorphic merged callback ref to render functions", () => {
    const wrapperRef = React.createRef<HTMLAnchorElement>();
    const fixture: Item.Props = {
      variant: "outline",
      size: "xs",
      ref: wrapperRef,
      children: <span>Callback details</span>,
      render: (props, state): React.ReactElement => {
        expectTypeOf(state).toEqualTypeOf<Item.State>();
        expectTypeOf(props.ref).toEqualTypeOf<React.RefCallback<HTMLElement> | null | undefined>();
        return (
          <a
            {...props}
            href='#callback'
            data-state={`${state.slot}/${state.variant}/${state.size}`}
          />
        );
      },
    };
    render(<Item {...fixture} />);

    const link = screen.getByRole("link", {name: "Callback details"});
    expect(link).toHaveAttribute("data-state", "item/outline/xs");
    expect(link).toHaveAttribute("data-size", "xs");
    expect(link).toHaveAttribute("data-variant", "outline");
    expect(wrapperRef.current).toBe(link);
  });

  it("passes wrapper content, events and refs through a real custom render link", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLAnchorElement>();
    const fixture: Item.Props = {
      ref: wrapperRef,
      onClick: () => calls.push("wrapper"),
      render: (
        <ConsumerLink
          href='#custom'
          ref={childRef}
          onClick={() => calls.push("child")}
        />
      ),
      children: <span>Custom item link</span>,
    };
    render(<Item {...fixture} />);
    const link = screen.getByRole("link", {name: "Custom item link"});
    await user.click(link);

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("data-slot", "item");
    expect(link.querySelector("a")).toBeNull();
    expect(childRef.current).toBe(link);
    expect(wrapperRef.current).toBe(link);
    expect(calls).toEqual(["child", "wrapper"]);
  });

  it("supports label render callbacks and their actual label refs", async () => {
    const user = userEvent.setup();
    const labelRef = React.createRef<HTMLLabelElement>();
    const fixture: Item.Props = {
      ref: labelRef,
      children: <span>Select document</span>,
      render: (props): React.ReactElement => (
        <label
          {...props}
          htmlFor='document-choice'
        />
      ),
    };
    render(
      <>
        <Item {...fixture} />
        <input
          id='document-choice'
          type='checkbox'
        />
      </>,
    );

    const label = screen.getByText("Select document").closest("label");
    await user.click(screen.getByText("Select document"));

    expect(labelRef.current).toBe(label);
    expect(screen.getByRole("checkbox", {name: "Select document"})).toBeChecked();
  });

  it.each(["asChild", "render"] as const)("preserves native cancellation and child-first order with %s", (composition) => {
    const calls: string[] = [];
    const child = (
      <a
        href='#cancelled'
        onClick={(event) => {
          calls.push(`child:${event.defaultPrevented}`);
          event.preventDefault();
        }}>
        Cancel navigation
      </a>
    );
    const onClick: React.MouseEventHandler<HTMLDivElement> = (event) => calls.push(`wrapper:${event.defaultPrevented}`);
    render(
      composition === "asChild" ? (
        <Item
          asChild
          onClick={onClick}>
          {child}
        </Item>
      ) : (
        <Item
          render={child}
          onClick={onClick}
        />
      ),
    );

    expect(fireEvent.click(screen.getByRole("link", {name: "Cancel navigation"}))).toBe(false);
    expect(calls).toEqual(["child:false", "wrapper:true"]);
  });

  it("allows a composed child to explicitly prevent the earlier Base UI handler", () => {
    const wrapperClick = vi.fn();
    render(
      <Item
        asChild
        onClick={wrapperClick}>
        <a
          href='#prevented'
          onClick={(event) => {
            event.preventDefault();
            if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") {
              event.preventBaseUIHandler();
            }
          }}>
          Prevent wrapper
        </a>
      </Item>,
    );

    expect(fireEvent.click(screen.getByRole("link", {name: "Prevent wrapper"}))).toBe(false);
    expect(wrapperClick).not.toHaveBeenCalled();
  });

  it("lets the wrapper cancel native navigation after the child handler", () => {
    const calls: string[] = [];
    render(
      <Item
        asChild
        onClick={(event) => {
          calls.push("wrapper");
          event.preventDefault();
        }}>
        <a
          href='#cancelled-by-wrapper'
          onClick={() => calls.push("child")}>
          Wrapper cancellation
        </a>
      </Item>,
    );

    expect(fireEvent.click(screen.getByRole("link", {name: "Wrapper cancellation"}))).toBe(false);
    expect(calls).toEqual(["child", "wrapper"]);
  });

  it("runs cleanup for both composed callback refs without losing either ref", () => {
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
      <Item
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

  it("keeps the default div inert rather than pretending to be a keyboard button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Item
          data-testid='inert-item'
          onClick={onClick}>
          Static details
        </Item>
        <button type='button'>Next focus target</button>
      </>,
    );
    const item = screen.getByTestId("inert-item");
    await user.tab();
    await user.keyboard("{Enter} ");

    expect(item.tagName).toBe("DIV");
    expect(item).not.toHaveAttribute("role");
    expect(item).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("button", {name: "Static details"})).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Next focus target"})).toHaveFocus();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("retains ordinary content when legacy asChild receives text or a fragment", () => {
    render(
      <>
        <Item asChild>Text item</Item>
        <Item asChild>
          <>Fragment item</>
        </Item>
      </>,
    );

    expect(screen.getByText("Text item").tagName).toBe("DIV");
    expect(screen.getByText("Fragment item").tagName).toBe("DIV");
  });

  it("prefers a valid legacy child over render and preserves empty child content", () => {
    render(
      <Item
        asChild
        render={<a href='#unused'>Unused render target</a>}>
        <article aria-label='Empty details' />
      </Item>,
    );

    expect(screen.getByRole("article", {name: "Empty details"})).toBeEmptyDOMElement();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("applies the xs layout alongside its owned size and surface attributes", () => {
    render(
      <Item
        size='xs'
        variant='muted'
        data-testid='extra-small'>
        <ItemMedia variant='icon'>★</ItemMedia>
        <ItemContent>
          <ItemTitle>Compact details</ItemTitle>
          <ItemDescription>Compact description</ItemDescription>
        </ItemContent>
      </Item>,
    );

    expect(screen.getByTestId("extra-small")).toHaveAttribute("data-size", "xs");
    expect(screen.getByTestId("extra-small").className).toContain(styles.sizeXs);
    expect(screen.getByTestId("extra-small")).toHaveAttribute("data-variant", "muted");
  });

  it("preserves rich title and description content with valid native paragraph semantics", () => {
    const titleRef = React.createRef<HTMLDivElement>();
    const descriptionRef = React.createRef<HTMLParagraphElement>();
    render(
      <Item>
        <ItemContent>
          <ItemTitle ref={titleRef}>
            <span>Long title with inline details</span>
          </ItemTitle>
          <ItemDescription ref={descriptionRef}>
            Complete description with <strong>important information</strong> and <a href='#learn-more'>Learn more</a>.
          </ItemDescription>
        </ItemContent>
      </Item>,
    );

    const link = screen.getByRole("link", {name: "Learn more"});
    expect(descriptionRef.current?.tagName).toBe("P");
    expect(descriptionRef.current).toHaveTextContent("Complete description with important information and Learn more.");
    expect(descriptionRef.current).toContainElement(link);
    expect(titleRef.current).toHaveTextContent("Long title with inline details");
    expect(titleRef.current?.className).toContain(styles.title);
    expect(descriptionRef.current?.className).toContain(styles.description);
  });

  it("forwards all native part refs, classes and slots while consuming the stable separator API", () => {
    const groupRef = React.createRef<HTMLDivElement>();
    const mediaRef = React.createRef<HTMLDivElement>();
    const contentRef = React.createRef<HTMLDivElement>();
    const actionsRef = React.createRef<HTMLDivElement>();
    const headerRef = React.createRef<HTMLDivElement>();
    const footerRef = React.createRef<HTMLDivElement>();
    const separatorRef = React.createRef<HTMLDivElement>();
    render(
      <ItemGroup
        ref={groupRef}
        className='custom-group'>
        <Item role='listitem'>
          <ItemHeader
            ref={headerRef}
            className='custom-header'>
            Header
          </ItemHeader>
          <ItemMedia
            ref={mediaRef}
            className='custom-media'>
            Media
          </ItemMedia>
          <ItemContent
            ref={contentRef}
            className='custom-content'>
            Content
          </ItemContent>
          <ItemActions
            ref={actionsRef}
            className='custom-actions'>
            Actions
          </ItemActions>
          <ItemFooter
            ref={footerRef}
            className='custom-footer'>
            Footer
          </ItemFooter>
        </Item>
        <ItemSeparator
          ref={separatorRef}
          className='custom-separator'
          data-testid='stable-separator'
        />
      </ItemGroup>,
    );

    expect(groupRef.current).toBe(screen.getByRole("list"));
    expect(groupRef.current).toHaveAttribute("data-slot", "item-group");
    expect(groupRef.current).toHaveClass("custom-group");
    expect(screen.getByRole("listitem")).toHaveAttribute("data-slot", "item");
    for (const [ref, name, slot, className] of [
      [headerRef, "Header", "item-header", "custom-header"],
      [mediaRef, "Media", "item-media", "custom-media"],
      [contentRef, "Content", "item-content", "custom-content"],
      [actionsRef, "Actions", "item-actions", "custom-actions"],
      [footerRef, "Footer", "item-footer", "custom-footer"],
    ] as const) {
      expect(ref.current).toBe(screen.getByText(name));
      expect(ref.current).toHaveAttribute("data-slot", slot);
      expect(ref.current).toHaveClass(className);
    }
    expect(separatorRef.current).toBe(screen.getByTestId("stable-separator"));
    expect(separatorRef.current).toHaveAttribute("data-slot", "item-separator");
    expect(separatorRef.current).toHaveAttribute("data-orientation", "horizontal");
    expect(separatorRef.current).toHaveAttribute("role", "separator");
    expect(separatorRef.current).toHaveClass("custom-separator");
  });

  it("renders Item compound components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const itemGroupRef = React.createRef<HTMLDivElement>();
    const itemRef = React.createRef<HTMLDivElement>();

    // Act
    render(
      <ItemGroup
        ref={itemGroupRef}
        className='item-group-class'
        data-testid='item-group'>
        <Item
          ref={itemRef}
          className='item-class'
          data-testid='item'>
          <ItemMedia>👤</ItemMedia>
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Alex Olariu</ItemTitle>
            </ItemHeader>
            <ItemDescription>Frontend Engineer</ItemDescription>
          </ItemContent>
          <ItemActions>
            <button type='button'>Invite</button>
          </ItemActions>
        </Item>
      </ItemGroup>,
    );

    // Assert
    const itemGroup = screen.getByTestId("item-group");
    const item = screen.getByTestId("item");

    expect(itemGroup).toHaveClass("item-group-class");
    expect(item).toHaveClass("item-class");
    expect(item.className).toContain(styles.sizeDefault);
    expect(screen.getByText("Alex Olariu")).toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Invite"})).toBeInTheDocument();
    expect(itemGroupRef.current).toBe(itemGroup);
    expect(itemRef.current).toBe(item);
  });

  it("renders Item with asChild prop, cloning child element with merged props", () => {
    // Arrange & Act
    render(
      <Item
        asChild
        className='custom-item'
        data-testid='item-wrapper'>
        <article className='child-class'>
          <span>Child content</span>
        </article>
      </Item>,
    );

    // Assert
    const article = screen.getByText("Child content").closest("article");
    expect(article).toHaveClass("custom-item");
    expect(article).toHaveClass("child-class");
    expect(article).toHaveAttribute("data-testid", "item-wrapper");
    expect(article).toHaveAttribute("data-slot", "item");
    expect(article).toHaveAttribute("data-variant", "default");
    expect(article).toHaveAttribute("data-size", "default");
  });

  it("renders Item with outline variant", () => {
    // Arrange & Act
    render(
      <Item
        variant='outline'
        data-testid='item-outline'>
        Outline Item
      </Item>,
    );

    // Assert
    expect(screen.getByTestId("item-outline")).toHaveAttribute("data-variant", "outline");
    expect(screen.getByTestId("item-outline").className).toContain(styles.outline);
  });

  it("renders Item with muted variant", () => {
    // Arrange & Act
    render(
      <Item
        variant='muted'
        data-testid='item-muted'>
        Muted Item
      </Item>,
    );

    // Assert
    expect(screen.getByTestId("item-muted")).toHaveAttribute("data-variant", "muted");
    expect(screen.getByTestId("item-muted").className).toContain(styles.muted);
  });

  it("renders Item with sm size", () => {
    // Arrange & Act
    render(
      <Item
        size='sm'
        data-testid='item-sm'>
        Small Item
      </Item>,
    );

    // Assert
    expect(screen.getByTestId("item-sm")).toHaveAttribute("data-size", "sm");
    expect(screen.getByTestId("item-sm").className).toContain(styles.sizeSm);
  });

  it("renders ItemFooter component", () => {
    // Arrange & Act
    render(
      <Item>
        <ItemContent>
          <ItemHeader>
            <ItemTitle>Title</ItemTitle>
          </ItemHeader>
          <ItemFooter data-testid='item-footer'>Footer content</ItemFooter>
        </ItemContent>
      </Item>,
    );

    // Assert
    const footer = screen.getByTestId("item-footer");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute("data-slot", "item-footer");
    expect(footer).toHaveTextContent("Footer content");
  });

  it("renders ItemSeparator component", () => {
    // Arrange & Act
    render(
      <ItemGroup>
        <Item>Item 1</Item>
        <ItemSeparator data-testid='item-separator' />
        <Item>Item 2</Item>
      </ItemGroup>,
    );

    // Assert
    const separator = screen.getByTestId("item-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("data-slot", "item-separator");
  });

  it("renders ItemMedia with icon variant", () => {
    // Arrange & Act
    render(
      <Item>
        <ItemMedia
          variant='icon'
          data-testid='item-media-icon'>
          ⭐
        </ItemMedia>
        <ItemContent>Content</ItemContent>
      </Item>,
    );

    // Assert
    const media = screen.getByTestId("item-media-icon");
    expect(media).toHaveAttribute("data-variant", "icon");
    expect(media.className).toContain(styles.mediaIcon);
  });

  it("renders ItemMedia with image variant", () => {
    // Arrange & Act
    render(
      <Item>
        <ItemMedia
          variant='image'
          data-testid='item-media-image'>
          <img
            src='/avatar.png'
            alt='Avatar'
          />
        </ItemMedia>
        <ItemContent>Content</ItemContent>
      </Item>,
    );

    // Assert
    const media = screen.getByTestId("item-media-image");
    expect(media).toHaveAttribute("data-variant", "image");
    expect(media.className).toContain(styles.mediaImage);
  });
});
