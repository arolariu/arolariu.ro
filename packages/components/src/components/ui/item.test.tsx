import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {AtRule, parse, type Root, type Rule} from "postcss";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {buttonVariants} from "./button";
import buttonStyles from "./button.module.css";
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
  it("React 19 refresh: lets the real Separator own class and render callback state", () => {
    const className = vi.fn((state: {orientation: "horizontal" | "vertical"}) => `axis-${state.orientation}`);
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ItemSeparator
        ref={ref}
        orientation='vertical'
        className={className}
        render={(props, state) => (
          <div
            {...props}
            data-axis={state.orientation}
          />
        )}
      />,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveClass("axis-vertical");
    expect(separator).toHaveAttribute("data-axis", "vertical");
    expect(className).toHaveBeenCalledWith(expect.objectContaining({orientation: "vertical"}));
    expect(ref.current).toBe(separator);
  });

  it("React 19 refresh: keeps full title/description content and descendant focus outlines unclipped", () => {
    const css = parse(readFileSync(resolve(import.meta.dirname, "item.module.css"), "utf8"));
    for (const selector of [".title", ".description"]) {
      const values: Record<string, string> = {};
      css.walkRules(selector, (rule) =>
        rule.walkDecls((decl) => {
          values[decl.prop] = decl.value;
        }),
      );
      expect(values["display"]).toBe("block");
      expect(values).not.toHaveProperty("-webkit-line-clamp");
      expect(values["overflow"]).not.toBe("hidden");
    }
  });

  it("React 19 refresh: keeps a generic item group free of an incomplete list role", () => {
    render(
      <ItemGroup data-testid='group'>
        <Item>Plain content</Item>
      </ItemGroup>,
    );
    expect(screen.getByTestId("group")).not.toHaveAttribute("role");
    expectTypeOf<React.ComponentProps<typeof Item>>().not.toHaveProperty("asChild");
    expect(typeof Item).toBe("function");
  });

  it("preserves child and wrapper handlers under Item render", async () => {
    const user = userEvent.setup();
    const childClick = vi.fn();
    const wrapperClick = vi.fn();
    render(
      <Item
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

  it("preserves both DOM refs and detaches them under Item render", () => {
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const {unmount} = render(
      <Item
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

  it("preserves native cancellation and child-first order with render", () => {
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
      <Item
        render={child}
        onClick={onClick}
      />,
    );

    expect(fireEvent.click(screen.getByRole("link", {name: "Cancel navigation"}))).toBe(false);
    expect(calls).toEqual(["child:false", "wrapper:true"]);
  });

  it("allows a composed child to explicitly prevent the earlier Base UI handler", () => {
    const wrapperClick = vi.fn();
    render(
      <Item
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
            Prevent wrapper
          </a>
        }
      />,
    );

    expect(fireEvent.click(screen.getByRole("link", {name: "Prevent wrapper"}))).toBe(false);
    expect(wrapperClick).not.toHaveBeenCalled();
  });

  it("lets the wrapper cancel native navigation after the child handler", () => {
    const calls: string[] = [];
    render(
      <Item
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

  it.each(["link", "button"] as const)("authors a forced-colors outline for a keyboard-focused native %s Item", async (role) => {
    const user = userEvent.setup();
    const rootClass = styles.item;
    if (rootClass === undefined) {
      throw new Error("Missing Item CSS class");
    }
    render(
      <>
        <Item
          variant='outline'
          render={role === "link" ? <a href='#contrast-details' /> : <button type='button' />}>
          Contrast details
        </Item>
        <button type='button'>Next focus target</button>
      </>,
    );
    const target = screen.getByRole(role, {name: "Contrast details"});
    expect(target.tagName).toBe(role === "link" ? "A" : "BUTTON");
    expect(target).toHaveClass(rootClass);
    expect(target).not.toHaveFocus();

    await user.tab();
    expect(target).toHaveFocus();

    const stylesheet = parse(readFileSync(resolve(import.meta.dirname, "item.module.css"), "utf8"));
    const forcedColorRules: Rule[] = [];
    stylesheet.walkAtRules("media", (media) => {
      if (media.params === "(forced-colors: active)") {
        media.walkRules((rule) => {
          forcedColorRules.push(rule);
        });
      }
    });
    const scopedSelector = (rule: Readonly<Rule>): string => rule.selector.replace(/\.item(?![\w-])/g, `.${CSS.escape(rootClass)}`);
    const focusRule = forcedColorRules.find((rule) => target.matches(scopedSelector(rule)));
    expect(focusRule).toBeDefined();
    if (focusRule === undefined) {
      throw new Error("No authored forced-colors focus rule matches the emitted Item");
    }
    const declarations = new Map<string, string>();
    focusRule.walkDecls((declaration) => {
      declarations.set(declaration.prop, declaration.value);
    });
    expect(declarations.get("outline-width")).toBe("2px");
    expect(declarations.get("outline-style")).toBe("solid");
    expect(["highlight", "canvastext"]).toContain(declarations.get("outline-color")?.toLowerCase());
    expect(declarations.get("outline-offset")).toBe("2px");
    expect(declarations.get("forced-color-adjust")).not.toBe("none");

    await user.tab();
    expect(screen.getByRole("button", {name: "Next focus target"})).toHaveFocus();
    expect(target.matches(scopedSelector(focusRule))).toBe(false);
  });

  it("retains ordinary text and fragment content", () => {
    render(
      <>
        <Item>Text item</Item>
        <Item>
          <>Fragment item</>
        </Item>
      </>,
    );

    expect(screen.getByText("Text item").tagName).toBe("DIV");
    expect(screen.getByText("Fragment item").tagName).toBe("DIV");
  });

  it("preserves empty composed render content", () => {
    render(<Item render={<article aria-label='Empty details' />} />);

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
        role='list'
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

  it("renders Item with a render target and merged props", () => {
    // Arrange & Act
    render(
      <Item
        className='custom-item'
        data-testid='item-wrapper'
        render={
          <article className='child-class'>
            <span>Child content</span>
          </article>
        }
      />,
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

type Specificity = readonly [ids: number, classes: number, types: number];
type CompiledSheet = Readonly<{root: Root; classes: Readonly<Record<string, string>>}>;
type PointerState = "rest" | "hover";

// Lower real native CSS nesting so every compiled rule carries its effective selector and media.
function compileSheet(filename: string, code: Buffer | string, classes: Readonly<Record<string, string>>): CompiledSheet {
  return {
    root: parse(transform({filename, code: Buffer.from(code), include: Features.Nesting, targets: {chrome: 100 << 16}}).code.toString()),
    classes,
  };
}

const compiledItem = compileSheet("item.module.css", readFileSync(resolve(import.meta.dirname, "item.module.css")), styles);
const compiledButton = compileSheet("button.module.css", readFileSync(resolve(import.meta.dirname, "button.module.css")), buttonStyles);
// An element-only consumer reset, as in `sites/arolariu.ro/src/styles/base/_reset.scss:90-92`, plus a competing link colour.
const elementReset = compileSheet("element-reset.css", "a { color: #0000ee; text-decoration: none; }", {});

/** Splits a selector list at top-level commas; commas inside `:is()` arguments stay together. */
function selectorList(list: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (const [index, character] of [...list].entries()) {
    if (character === "(" || character === "[") depth += 1;
    else if (character === ")" || character === "]") depth -= 1;
    else if (character === "," && depth === 0) {
      selectors.push(list.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(list.slice(start).trim());
  return selectors;
}

function compareSpecificity(first: Specificity, second: Specificity): number {
  return first[0] - second[0] || first[1] - second[1] || first[2] - second[2];
}

/** Selectors Level 4 specificity for the selector forms these stylesheets use. */
function specificity(selector: string): Specificity {
  const counts: [number, number, number] = [0, 0, 0];
  const nameEnd = (from: number): number => {
    let end = from;
    while (end < selector.length && /[\w-]/u.test(selector.charAt(end))) end += 1;
    return end;
  };
  let index = 0;
  while (index < selector.length) {
    const character = selector.charAt(index);
    if (character === "#" || character === ".") {
      counts[character === "#" ? 0 : 1] += 1;
      index = nameEnd(index + 1);
    } else if (character === "[") {
      const close = selector.indexOf("]", index);
      if (close < 0) throw new Error(`Unterminated attribute selector: ${selector}`);
      counts[1] += 1;
      index = close + 1;
    } else if (selector.startsWith("::", index)) {
      counts[2] += 1;
      index = nameEnd(index + 2);
    } else if (character === ":") {
      const end = nameEnd(index + 1);
      const name = selector.slice(index + 1, end);
      if (selector.charAt(end) !== "(") {
        counts[1] += 1;
        index = end;
        continue;
      }
      let depth = 0;
      let close = end;
      do {
        if (selector.charAt(close) === "(") depth += 1;
        if (selector.charAt(close) === ")") depth -= 1;
        close += 1;
      } while (depth > 0 && close < selector.length);
      // :is()/:not()/:has() take their most specific argument, :where() adds nothing, other functions count once.
      if (name === "is" || name === "not" || name === "has") {
        const strongest = selectorList(selector.slice(end + 1, close - 1))
          .map(specificity)
          .sort(compareSpecificity)
          .at(-1);
        counts[0] += strongest?.[0] ?? 0;
        counts[1] += strongest?.[1] ?? 0;
        counts[2] += strongest?.[2] ?? 0;
      } else if (name !== "where") counts[1] += 1;
      index = close;
    } else if (/[a-z]/iu.test(character)) {
      counts[2] += 1;
      index = nameEnd(index);
    } else {
      index += 1; // Whitespace, combinators and the universal selector add nothing.
    }
  }
  return counts;
}

/** Maps CSS Module names to emitted classes and resolves `:hover` for the pointed element and its ancestors. */
function matchable(selector: string, classes: Readonly<Record<string, string>>, state: PointerState): string {
  const pointer = state === "hover" ? "" : ":not(*)";
  return selector
    .replace(/:where\(:hover\)/gu, pointer)
    .replace(/:hover\b/gu, pointer)
    .replace(/\.([a-z][\w-]*)/giu, (_, name: string) => {
      const className = classes[name];
      if (!className) throw new Error(`Missing CSS Module class: ${name}`);
      return `.${CSS.escape(className)}`;
    });
}

/**
 * Declarations cascaded across compiled stylesheets in the given order: specificity (of the authored selector, so
 * `:hover` still counts), then order, decide each property. The hover state adds `(hover: hover)` rules; forced-colors
 * and reduced-motion rules are separate contracts.
 */
function cascadedPaint(element: Element, sheets: readonly CompiledSheet[], state: PointerState = "rest"): Record<string, string> {
  const winners = new Map<string, Readonly<{value: string; specificity: Specificity}>>();
  for (const sheet of sheets) {
    sheet.root.walkRules((rule) => {
      const media = rule.parent instanceof AtRule ? rule.parent : undefined;
      if (media && !(state === "hover" && media.name === "media" && media.params === "(hover: hover)")) return;
      const strongest = selectorList(rule.selector)
        // CSS Modules emit `:global(X)` as X; pseudo-elements never match an element.
        .map((selector) => selector.replace(/:global\(([^)]+)\)/gu, "$1"))
        .filter((selector) => !selector.includes("::"))
        .filter((selector) => element.matches(matchable(selector, sheet.classes, state)))
        .map(specificity)
        .sort(compareSpecificity)
        .at(-1);
      if (!strongest) return;
      rule.walkDecls((declaration) => {
        const current = winners.get(declaration.prop);
        if (!current || compareSpecificity(strongest, current.specificity) >= 0) {
          winners.set(declaration.prop, {value: declaration.value, specificity: strongest});
        }
      });
    });
  }
  return Object.fromEntries([...winners].map(([property, {value}]) => [property, value]));
}

/** The used text colour: an `inherit` or unset cascaded colour resolves through the ancestors. */
function usedColor(element: Element, sheets: readonly CompiledSheet[], state: PointerState = "rest"): string {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const color = cascadedPaint(current, sheets, state)["color"];
    if (color && color !== "inherit") return color;
  }
  throw new Error("No cascaded text colour");
}

describe.each([
  ["reset, Item, Button", [elementReset, compiledItem, compiledButton]],
  ["reset, Button, Item", [elementReset, compiledButton, compiledItem]],
  ["Item, Button, reset", [compiledItem, compiledButton, elementReset]],
  ["Button, Item, reset", [compiledButton, compiledItem, elementReset]],
] as const)("review correction: compiled ItemDescription nested-link rules with %s stylesheet order", (_, sheets) => {
  function renderDescriptionLinks(): Readonly<{plain: HTMLElement; outline: HTMLElement; primary: HTMLElement}> {
    render(
      <Item>
        <ItemContent>
          <ItemDescription>
            Read the <a href='#setup'>setup guide</a>,{" "}
            <a
              href='#retry'
              className={buttonVariants({variant: "outline", size: "sm"})}>
              retry
            </a>{" "}
            or{" "}
            <a
              href='#upgrade'
              className={buttonVariants()}>
              upgrade
            </a>
            .
          </ItemDescription>
        </ItemContent>
      </Item>,
    );
    return {
      plain: screen.getByRole("link", {name: "setup guide"}),
      outline: screen.getByRole("link", {name: "retry"}),
      primary: screen.getByRole("link", {name: "upgrade"}),
    };
  }

  it("keeps plain links inheriting and underlined over an element-only reset while class-styled anchors keep their paint", () => {
    const {plain, outline, primary} = renderDescriptionLinks();

    expect(cascadedPaint(plain, sheets)).toMatchObject({color: "inherit", "text-decoration": "underline"});
    expect(usedColor(plain, sheets)).toBe("var(--ac-muted-foreground)");

    expect(cascadedPaint(outline, sheets)).toMatchObject({"background-color": "var(--ac-background)", "text-decoration": "none"});
    expect(usedColor(outline, sheets)).toBe("var(--ac-foreground)");
    expect(cascadedPaint(primary, sheets)).toMatchObject({"background-color": "var(--ac-primary)", "text-decoration": "none"});
    expect(usedColor(primary, sheets)).toBe("var(--ac-primary-foreground)");
  });

  it("raises only plain links to the foreground colour on hover, never a class-styled anchor's text", () => {
    const {plain, outline, primary} = renderDescriptionLinks();

    expect(cascadedPaint(plain, sheets, "hover")).toMatchObject({color: "var(--ac-foreground)", "text-decoration": "underline"});
    // Button's own hover rules stay in charge; the default variant keeps its primary-foreground text on the primary fill.
    expect(usedColor(outline, sheets, "hover")).toBe("var(--ac-accent-foreground)");
    expect(usedColor(primary, sheets, "hover")).toBe("var(--ac-primary-foreground)");
  });
});
