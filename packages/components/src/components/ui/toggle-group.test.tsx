import {ToggleGroup as BaseToggleGroup} from "@base-ui/react/toggle-group";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupProps,
  type ToggleGroupItemProps,
  type ToggleGroupState,
  type ToggleGroupItemState,
} from "./toggle-group";
import type {Toggle} from "./toggle";
import toggleStyles from "./toggle.module.css";
import styles from "./toggle-group.module.css";
import * as stories from "./toggle-group.stories";

describe("ToggleGroup", () => {
  it("keeps React 18-compatible forwarded ref component identities", () => {
    expect(ToggleGroup).toMatchObject({$$typeof: Symbol.for("react.forward_ref")});
    expect(ToggleGroupItem).toMatchObject({$$typeof: Symbol.for("react.forward_ref")});
  });

  it("applies zero-gap and vertical layout through its CSS Module state selectors", () => {
    const rootClass = styles.root;
    if (!rootClass) throw new Error("Expected group CSS class");
    const sheet = document.createElement("style");
    sheet.textContent = readFileSync(join(import.meta.dirname, "toggle-group.module.css"), "utf8").replaceAll(".root", `.${rootClass}`);
    document.head.append(sheet);
    try {
      const {rerender} = render(
        <ToggleGroup
          aria-label='Styled layout'
          spacing={0}
          orientation='vertical'>
          <ToggleGroupItem value='a'>A</ToggleGroupItem>
          <ToggleGroupItem value='b'>B</ToggleGroupItem>
        </ToggleGroup>,
      );
      const group = screen.getByRole("group", {name: "Styled layout"});
      expect(window.getComputedStyle(group).gap).toBe("0");
      expect(window.getComputedStyle(group).flexDirection).toBe("column");
      expect(window.getComputedStyle(group).alignItems).toBe("stretch");
      rerender(
        <ToggleGroup
          aria-label='Styled layout'
          spacing={0}>
          <ToggleGroupItem value='a'>A</ToggleGroupItem>
          <ToggleGroupItem value='b'>B</ToggleGroupItem>
        </ToggleGroup>,
      );
      expect(window.getComputedStyle(group).flexDirection).not.toBe("column");
      expect(window.getComputedStyle(group).alignItems).toBe("center");
    } finally {
      sheet.remove();
    }
  });

  it("applies standalone story layout without requiring a toggle item ancestor", () => {
    const {Controlled} = composeStories(stories);
    const {container, unmount} = render(<Controlled />);
    const layout = screen.getByText("Selected: bold, italic").parentElement;
    expect(layout).toHaveClass("ac-story-toggle-group-storyStack");
    expect(layout?.closest('[data-slot="toggle-group-item"]')).toBeNull();
    expect(window.getComputedStyle(layout as HTMLElement).display).toBe("grid");
    const sheet = container.querySelector("style");
    expect(sheet?.textContent).toContain(".ac-story-toggle-group-storyStack");
    unmount();
    expect(sheet?.isConnected).toBe(false);
  });

  it.each([false, true])("joins outline item borders on the logical axis with render element children=%s", (composed) => {
    const sources = [
      ["toggle-group.module.css", {root: styles.root, item: styles.item}],
      [
        "toggle.module.css",
        {
          root: toggleStyles.root,
          outline: toggleStyles.outline,
          default: toggleStyles.default,
          sizeDefault: toggleStyles.sizeDefault,
          sizeSm: toggleStyles.sizeSm,
          sizeLg: toggleStyles.sizeLg,
        },
      ],
    ] as const;
    const sheet = document.createElement("style");
    sheet.textContent = sources
      .map(([filename, classes]) => {
        let css = readFileSync(join(import.meta.dirname, filename), "utf8");
        for (const [name, scopedClass] of Object.entries(classes)) {
          if (!scopedClass) throw new Error(`Expected ${filename} class ${name}`);
          css = css.replaceAll(`.${name}`, `.${scopedClass}`);
        }
        return css;
      })
      .join("\n");
    document.head.append(sheet);
    try {
      const view = (orientation: "horizontal" | "vertical"): React.JSX.Element => (
        <ToggleGroup
          spacing={0}
          variant='outline'
          orientation={orientation}
          render={
            composed ? (
              <section>
                <ToggleGroupItem value='a'>First joined</ToggleGroupItem>
                <ToggleGroupItem value='b'>Second joined</ToggleGroupItem>
              </section>
            ) : undefined
          }>
          {composed ? undefined : (
            <>
              <ToggleGroupItem value='a'>First joined</ToggleGroupItem>
              <ToggleGroupItem value='b'>Second joined</ToggleGroupItem>
            </>
          )}
        </ToggleGroup>
      );
      const {rerender} = render(view("horizontal"));
      const second = screen.getByRole("button", {name: "Second joined"});
      expect(window.getComputedStyle(second).getPropertyValue("border-inline-start-width")).toMatch(/^0(?:px)?$/);
      rerender(view("vertical"));
      expect(window.getComputedStyle(second).getPropertyValue("border-block-start-width")).toMatch(/^0(?:px)?$/);
    } finally {
      sheet.remove();
    }
  });

  it("inherits group visuals and primitive selection when a render element supplies its own children", async () => {
    const user = userEvent.setup();
    const change = vi.fn<NonNullable<ToggleGroup.Props["onValueChange"]>>();
    render(
      <ToggleGroup
        aria-label='Composed group'
        spacing={0}
        orientation='vertical'
        variant='outline'
        size='lg'
        defaultValue={["a"]}
        onValueChange={change}
        render={
          <section>
            <ToggleGroupItem value='a'>Composed A</ToggleGroupItem>
            <ToggleGroupItem value='b'>Composed B</ToggleGroupItem>
            <ToggleGroupItem
              value='c'
              variant='default'
              size='sm'>
              Explicit C
            </ToggleGroupItem>
          </section>
        }>
        <span>Replaced primitive children</span>
      </ToggleGroup>,
    );
    const group = screen.getByRole("group", {name: "Composed group"});
    expect(group.tagName).toBe("SECTION");
    expect(group).toHaveAttribute("data-spacing", "0");
    expect(group).toHaveAttribute("data-orientation", "vertical");
    expect(screen.queryByText("Replaced primitive children")).not.toBeInTheDocument();
    const first = screen.getByRole("button", {name: "Composed A"});
    const second = screen.getByRole("button", {name: "Composed B"});
    expect(first).toHaveAttribute("aria-pressed", "true");
    for (const item of [first, second]) {
      expect(item).toHaveAttribute("data-spacing", "0");
      expect(item).toHaveAttribute("data-orientation", "vertical");
      expect(item).toHaveAttribute("data-variant", "outline");
      expect(item).toHaveAttribute("data-size", "lg");
    }
    const explicit = screen.getByRole("button", {name: "Explicit C"});
    expect(explicit).toHaveAttribute("data-variant", "default");
    expect(explicit).toHaveAttribute("data-size", "sm");
    expect(explicit).toHaveAttribute("data-spacing", "0");
    await user.click(second);
    expect(change).toHaveBeenCalledWith(["b"], expect.objectContaining({reason: "none"}));
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");
  });

  it("scopes callback-rendered descendants without eagerly evaluating render or losing controlled values", async () => {
    const user = userEvent.setup();
    const change = vi.fn<NonNullable<ToggleGroup.Props<"a" | "b">["onValueChange"]>>();
    const view = (orientation: "horizontal" | "vertical", spacing: number, value: readonly ("a" | "b")[]): React.JSX.Element => (
      <ToggleGroup
        aria-label='Callback composed group'
        value={value}
        multiple
        onValueChange={change}
        orientation={orientation}
        spacing={spacing}
        variant='outline'
        size='lg'
        render={(props, state) => (
          <section
            {...props}
            data-contract-orientation={state.orientation}
            data-contract-multiple={String(state.multiple)}>
            <ToggleGroupItem
              value='a'
              className={(itemState) => (itemState.pressed ? "callback-pressed" : "callback-released")}
              render={(itemProps, itemState) => (
                <button
                  {...itemProps}
                  data-contract-pressed={String(itemState.pressed)}
                />
              )}>
              Callback A
            </ToggleGroupItem>
            <ToggleGroupItem value='b'>Callback B</ToggleGroupItem>
          </section>
        )}>
        <span>Replaced callback children</span>
      </ToggleGroup>
    );
    const {rerender} = render(view("vertical", 0, ["a"]));
    const group = screen.getByRole("group", {name: "Callback composed group"});
    const first = screen.getByRole("button", {name: "Callback A"});
    const second = screen.getByRole("button", {name: "Callback B"});
    expect(group).toHaveAttribute("data-contract-orientation", "vertical");
    expect(group).toHaveAttribute("data-contract-multiple", "true");
    expect(screen.queryByText("Replaced callback children")).not.toBeInTheDocument();
    expect(first).toHaveClass("callback-pressed");
    expect(first).toHaveAttribute("data-contract-pressed", "true");
    expect(first).toHaveAttribute("data-spacing", "0");
    expect(first).toHaveAttribute("data-orientation", "vertical");
    expect(first).toHaveAttribute("data-variant", "outline");
    expect(first).toHaveAttribute("data-size", "lg");
    await user.click(second);
    expect(change).toHaveBeenCalledWith(["a", "b"], expect.objectContaining({reason: "none"}));
    expect(second).toHaveAttribute("aria-pressed", "false");
    rerender(view("horizontal", 3, ["b"]));
    expect(group).toHaveAttribute("data-contract-orientation", "horizontal");
    expect(first).toHaveAttribute("data-spacing", "3");
    expect(first).toHaveAttribute("data-orientation", "horizontal");
    expect(first).toHaveAttribute("data-contract-pressed", "false");
    expect(first).toHaveClass("callback-released");
    expect(second).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps composed nested groups independent with nearest context and explicit item precedence", async () => {
    const user = userEvent.setup();
    const outerChange = vi.fn<NonNullable<ToggleGroup.Props["onValueChange"]>>();
    const innerChange = vi.fn<NonNullable<ToggleGroup.Props["onValueChange"]>>();
    render(
      <ToggleGroup
        aria-label='Outer composed'
        variant='outline'
        size='lg'
        spacing={0}
        orientation='vertical'
        defaultValue={["outer-a"]}
        onValueChange={outerChange}
        render={
          <section>
            <ToggleGroupItem value='outer-a'>Outer A</ToggleGroupItem>
            <ToggleGroupItem
              value='outer-b'
              variant='default'
              size='sm'>
              Outer B
            </ToggleGroupItem>
            <ToggleGroup
              aria-label='Inner composed'
              spacing={3}
              multiple
              defaultValue={["inner-x"]}
              onValueChange={innerChange}
              render={
                <section>
                  <ToggleGroupItem value='inner-x'>Inner X</ToggleGroupItem>
                  <ToggleGroupItem
                    value='inner-y'
                    variant='outline'
                    size='sm'>
                    Inner Y
                  </ToggleGroupItem>
                </section>
              }
            />
          </section>
        }
      />,
    );
    const outerFirst = screen.getByRole("button", {name: "Outer A"});
    const outerSecond = screen.getByRole("button", {name: "Outer B"});
    const innerFirst = screen.getByRole("button", {name: "Inner X"});
    const innerSecond = screen.getByRole("button", {name: "Inner Y"});
    expect(outerFirst).toHaveAttribute("data-variant", "outline");
    expect(outerFirst).toHaveAttribute("data-size", "lg");
    expect(outerFirst).toHaveAttribute("data-spacing", "0");
    expect(outerFirst).toHaveAttribute("data-orientation", "vertical");
    expect(outerSecond).toHaveAttribute("data-variant", "default");
    expect(outerSecond).toHaveAttribute("data-size", "sm");
    expect(innerFirst).toHaveAttribute("data-variant", "default");
    expect(innerFirst).toHaveAttribute("data-size", "default");
    expect(innerFirst).toHaveAttribute("data-spacing", "3");
    expect(innerFirst).toHaveAttribute("data-orientation", "horizontal");
    expect(innerSecond).toHaveAttribute("data-variant", "outline");
    expect(innerSecond).toHaveAttribute("data-size", "sm");
    await user.click(innerSecond);
    expect(innerChange).toHaveBeenCalledWith(["inner-x", "inner-y"], expect.objectContaining({reason: "none"}));
    expect(outerChange).not.toHaveBeenCalled();
    expect(outerFirst).toHaveAttribute("aria-pressed", "true");
    await user.click(outerSecond);
    expect(outerChange).toHaveBeenCalledWith(["outer-b"], expect.objectContaining({reason: "none"}));
    expect(innerFirst).toHaveAttribute("aria-pressed", "true");
    expect(innerSecond).toHaveAttribute("aria-pressed", "true");
  });

  it("exports typed group selection props and item state without independent pressed props", () => {
    expect(ToggleGroup.displayName).toBe("ToggleGroup");
    expect(ToggleGroupItem.displayName).toBe("ToggleGroupItem");
    expectTypeOf<ToggleGroupProps<"a" | "b">>().toEqualTypeOf<ToggleGroup.Props<"a" | "b">>();
    expectTypeOf<ToggleGroupItemProps>().toEqualTypeOf<ToggleGroupItem.Props>();
    expectTypeOf<ToggleGroupState>().toEqualTypeOf<BaseToggleGroup.State>();
    expectTypeOf<ToggleGroup.State>().toEqualTypeOf<ToggleGroupState>();
    expectTypeOf<ToggleGroupItemState>().toEqualTypeOf<Toggle.State>();
    expectTypeOf<ToggleGroupItem.State>().toEqualTypeOf<ToggleGroupItemState>();
    expectTypeOf<Extract<keyof ToggleGroupItemProps, "pressed" | "defaultPressed" | "onPressedChange">>().toEqualTypeOf<never>();
    expectTypeOf<NonNullable<ToggleGroupProps<"a" | "b">["onValueChange"]>>().parameter(0).toEqualTypeOf<("a" | "b")[]>();
  });

  it("passes exact primitive root/item state to render and class callbacks", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup
        aria-label='Live group'
        multiple
        defaultValue={["a"]}
        orientation='vertical'
        className={(state) => (state.multiple ? "multiple-group" : "single-group")}
        render={(props, state) => (
          <section
            {...props}
            data-multiple={String(state.multiple)}
            data-direction={state.orientation}
          />
        )}>
        <ToggleGroupItem
          value='a'
          aria-label='Live A'
          className={(state) => (state.pressed ? "selected-item" : "unselected-item")}
          render={(props, state) => (
            <button
              {...props}
              data-current={String(state.pressed)}
            />
          )}>
          A
        </ToggleGroupItem>
        <ToggleGroupItem
          value='b'
          aria-label='Live B'
          render={(props, state) => (
            <button
              {...props}
              data-current={String(state.pressed)}
            />
          )}>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    const group = screen.getByRole("group", {name: "Live group"});
    const first = screen.getByRole("button", {name: "Live A"});
    expect(group).toHaveClass("multiple-group");
    expect(group).toHaveAttribute("data-multiple", "true");
    expect(group).toHaveAttribute("data-direction", "vertical");
    expect(first).toHaveAttribute("data-current", "true");
    expect(first).toHaveClass("selected-item");
    await user.click(first);
    expect(first).toHaveAttribute("data-current", "false");
    expect(first).toHaveClass("unselected-item");
  });

  it("defaults spacing to two and exposes zero-gap joined styling state without inline styles", () => {
    const view = (spacing?: number): React.JSX.Element => (
      <ToggleGroup
        aria-label='Joined'
        spacing={spacing}
        variant='outline'>
        <ToggleGroupItem
          value='a'
          aria-label='Joined A'>
          A
        </ToggleGroupItem>
        <ToggleGroupItem
          value='b'
          aria-label='Joined B'>
          B
        </ToggleGroupItem>
      </ToggleGroup>
    );
    const {rerender} = render(view());
    const group = screen.getByRole("group", {name: "Joined"});
    expect(group).toHaveAttribute("data-spacing", "2");
    expect(group).toHaveAttribute("data-orientation", "horizontal");
    expect(group).not.toHaveAttribute("style");
    rerender(view(0));
    expect(group).toHaveAttribute("data-spacing", "0");
    const rootClass = styles.root;
    const itemClass = styles.item;
    if (!rootClass || !itemClass) throw new Error("Expected joined group CSS classes");
    expect(group).toHaveClass(rootClass);
    for (const item of screen.getAllByRole("button")) {
      expect(item).toHaveClass(itemClass);
      expect(item).toHaveAttribute("data-spacing", "0");
      expect(item).toHaveAttribute("data-variant", "outline");
    }
    rerender(view(3));
    expect(group).toHaveAttribute("data-spacing", "3");
    rerender(view(7.5));
    expect(group).toHaveAttribute("data-spacing", "7.5");
  });

  it("preserves explicit item variant/size precedence over group context and defaults omitted options", () => {
    render(
      <>
        <ToggleGroup
          aria-label='Shared visuals'
          variant='outline'
          size='lg'>
          <ToggleGroupItem
            value='a'
            aria-label='Inherited'>
            A
          </ToggleGroupItem>
          <ToggleGroupItem
            value='b'
            aria-label='Overridden'
            variant='default'
            size='sm'>
            B
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup aria-label='Default visuals'>
          <ToggleGroupItem
            value='c'
            aria-label='Defaults'>
            C
          </ToggleGroupItem>
        </ToggleGroup>
      </>,
    );
    const inherited = screen.getByRole("button", {name: "Inherited"});
    expect(inherited).toHaveAttribute("data-variant", "outline");
    expect(inherited).toHaveAttribute("data-size", "lg");
    const overridden = screen.getByRole("button", {name: "Overridden"});
    expect(overridden).toHaveAttribute("data-variant", "default");
    expect(overridden).toHaveAttribute("data-size", "sm");
    const defaults = screen.getByRole("button", {name: "Defaults"});
    expect(defaults).toHaveAttribute("data-variant", "default");
    expect(defaults).toHaveAttribute("data-size", "default");
  });

  it("forwards vertical orientation to primitive arrow navigation and skips disabled items", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup
        aria-label='Vertical navigation'
        orientation='vertical'
        spacing={0}>
        <ToggleGroupItem
          value='a'
          aria-label='Vertical A'>
          A
        </ToggleGroupItem>
        <ToggleGroupItem
          value='b'
          aria-label='Vertical B'
          disabled>
          B
        </ToggleGroupItem>
        <ToggleGroupItem
          value='c'
          aria-label='Vertical C'>
          C
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    const first = screen.getByRole("button", {name: "Vertical A"});
    const last = screen.getByRole("button", {name: "Vertical C"});
    await user.tab();
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(last).toHaveFocus();
    await user.keyboard(" ");
    expect(last).toHaveAttribute("aria-pressed", "true");
    expect(first).toHaveAttribute("aria-pressed", "false");
    await user.keyboard("{ArrowDown}");
    expect(first).toHaveFocus();
  });

  it("uses group-owned single selection and original cancellable details", async () => {
    const user = userEvent.setup();
    const change = vi.fn<NonNullable<ToggleGroup.Props["onValueChange"]>>();
    const {rerender} = render(
      <ToggleGroup
        aria-label='Single state'
        defaultValue={["a"]}
        onValueChange={change}>
        <ToggleGroupItem
          value='a'
          aria-label='Single A'>
          A
        </ToggleGroupItem>
        <ToggleGroupItem
          value='b'
          aria-label='Single B'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    const first = screen.getByRole("button", {name: "Single A"});
    const second = screen.getByRole("button", {name: "Single B"});
    await user.click(second);
    expect(change).toHaveBeenCalledWith(["b"], expect.objectContaining({reason: "none"}));
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");
    rerender(
      <ToggleGroup
        aria-label='Single state'
        defaultValue={["a"]}
        onValueChange={(_value, details) => details.cancel()}>
        <ToggleGroupItem
          value='a'
          aria-label='Single A'>
          A
        </ToggleGroupItem>
        <ToggleGroupItem
          value='b'
          aria-label='Single B'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");
  });

  it("passes group disabled state to both callbacks and prevents non-native item activation", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <ToggleGroup
        disabled
        aria-label='Disabled state'
        onValueChange={change}
        render={(props, state) => (
          <div
            {...props}
            data-disabled-state={String(state.disabled)}
          />
        )}>
        <ToggleGroupItem
          nativeButton={false}
          value='a'
          aria-label='Disabled item'
          className={(state) => (state.disabled ? "blocked-item" : "enabled-item")}
          render={(props, state) => (
            <span
              {...props}
              data-disabled-state={String(state.disabled)}
            />
          )}>
          A
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole("group", {name: "Disabled state"})).toHaveAttribute("data-disabled-state", "true");
    const control = screen.getByRole("button", {name: "Disabled item"});
    expect(control).toHaveAttribute("data-disabled-state", "true");
    expect(control).toHaveClass("blocked-item");
    await user.click(control);
    control.focus();
    await user.keyboard("{Enter} ");
    expect(change).not.toHaveBeenCalled();
  });

  it("supports typed controlled group rerenders without item pressed state", async () => {
    const user = userEvent.setup();
    const change = vi.fn<NonNullable<ToggleGroup.Props<"a" | "b">["onValueChange"]>>();
    const view = (value: readonly ("a" | "b")[]): React.JSX.Element => (
      <ToggleGroup
        value={value}
        onValueChange={change}>
        <ToggleGroupItem
          value='a'
          aria-label='Controlled A'
          render={(props, state) => (
            <button
              {...props}
              data-current={String(state.pressed)}
            />
          )}>
          A
        </ToggleGroupItem>
        <ToggleGroupItem
          value='b'
          aria-label='Controlled B'>
          B
        </ToggleGroupItem>
      </ToggleGroup>
    );
    const {rerender} = render(view(["a"]));
    const first = screen.getByRole("button", {name: "Controlled A"});
    await user.click(screen.getByRole("button", {name: "Controlled B"}));
    expect(change).toHaveBeenCalledWith(["b"], expect.objectContaining({reason: "none"}));
    expect(first).toHaveAttribute("data-current", "true");
    rerender(view(["b"]));
    expect(first).toHaveAttribute("data-current", "false");
    expect(screen.getByRole("button", {name: "Controlled B"})).toHaveAttribute("aria-pressed", "true");
  });

  it("preserves non-native item refs, child content/handlers, and consumer cancellation", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLSpanElement>();
    const click = vi.fn();
    const change = vi.fn();
    render(
      <ToggleGroup onValueChange={change}>
        <ToggleGroupItem
          ref={ref}
          nativeButton={false}
          value='a'
          aria-label='Composed item'
          onClick={(event) => event.preventBaseUIHandler()}
          render={
            <span
              ref={childRef}
              onClick={click}
              data-child='kept'
            />
          }>
          Contents
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    const control = screen.getByRole("button", {name: "Composed item"});
    expect(ref.current).toBe(control);
    expect(childRef.current).toBe(control);
    expect(control).toHaveTextContent("Contents");
    expect(control).toHaveAttribute("data-child", "kept");
    await user.click(control);
    expect(click).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled();
  });

  it("renders without crashing", () => {
    // Arrange
    render(
      <ToggleGroup
        role='group'
        aria-label='Text styles'
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold'>
          B
        </ToggleGroupItem>
        <ToggleGroupItem
          value='italic'
          aria-label='Italic'>
          I
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Text styles"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Bold"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Italic"})).toBeInTheDocument();
  });

  it("forwards refs to the group and item DOM elements", () => {
    // Arrange
    const groupRef = React.createRef<HTMLDivElement>();
    const itemRef = React.createRef<HTMLButtonElement>();

    render(
      <ToggleGroup
        ref={groupRef}
        role='group'
        aria-label='Forwarded toggle group'
        multiple>
        <ToggleGroupItem
          ref={itemRef}
          value='bold'
          aria-label='Bold ref'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(groupRef.current).toBe(screen.getByRole("group", {name: "Forwarded toggle group"}));
    expect(itemRef.current).toBe(screen.getByRole("button", {name: "Bold ref"}));
  });

  it("merges custom class names for the group and items", () => {
    // Arrange
    render(
      <ToggleGroup
        role='group'
        aria-label='Styled toggle group'
        className='custom-toggle-group'
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Styled toggle item'
          className='custom-toggle-group-item'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Styled toggle group"})).toHaveClass("custom-toggle-group");
    expect(screen.getByRole("button", {name: "Styled toggle item"})).toHaveClass("custom-toggle-group-item");
  });

  it("updates pressed state when items are toggled", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string[]) => void>();

    render(
      <ToggleGroup
        role='group'
        aria-label='Editor formatting'
        defaultValue={["bold"]}
        multiple
        onValueChange={handleValueChange}>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold format'>
          B
        </ToggleGroupItem>
        <ToggleGroupItem
          value='italic'
          aria-label='Italic format'>
          I
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    const boldToggle = screen.getByRole("button", {name: "Bold format"});
    const italicToggle = screen.getByRole("button", {name: "Italic format"});

    // Assert
    expect(boldToggle).toHaveAttribute("aria-pressed", "true");
    expect(italicToggle).toHaveAttribute("aria-pressed", "false");

    // Act
    await user.click(italicToggle);

    // Assert
    expect(italicToggle).toHaveAttribute("aria-pressed", "true");
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toEqual(expect.arrayContaining(["bold", "italic"]));
  });

  it("marks disabled items with data-disabled", () => {
    // Arrange
    render(
      <ToggleGroup
        role='group'
        aria-label='Disabled formatting'
        multiple>
        <ToggleGroupItem
          value='underline'
          aria-label='Underline format'
          disabled>
          U
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Underline format"})).toHaveAttribute("data-disabled");
  });

  it("supports keyboard toggling with the space key", async () => {
    // Arrange
    const user = userEvent.setup();

    render(
      <ToggleGroup
        role='group'
        aria-label='Keyboard formatting'
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold keyboard format'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    const toggle = screen.getByRole("button", {name: "Bold keyboard format"});
    toggle.focus();

    // Act
    await user.keyboard(" ");

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("exposes accessible group and toggle button semantics", () => {
    // Arrange
    render(
      <ToggleGroup
        role='group'
        aria-label='Accessible formatting'
        defaultValue={["bold"]}
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold accessible format'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Accessible formatting"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Bold accessible format"})).toHaveAttribute("aria-pressed", "true");
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string[]) => void>();

    function ControlledToggleGroup(): React.JSX.Element {
      const [value, setValue] = React.useState<string[]>(["bold"]);

      return (
        <ToggleGroup
          role='group'
          aria-label='Controlled formatting'
          multiple
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            handleValueChange(nextValue);
          }}>
          <ToggleGroupItem
            value='bold'
            aria-label='Bold controlled format'>
            B
          </ToggleGroupItem>
          <ToggleGroupItem
            value='italic'
            aria-label='Italic controlled format'>
            I
          </ToggleGroupItem>
        </ToggleGroup>
      );
    }

    render(<ControlledToggleGroup />);

    const boldToggle = screen.getByRole("button", {name: "Bold controlled format"});
    const italicToggle = screen.getByRole("button", {name: "Italic controlled format"});

    expect(boldToggle).toHaveAttribute("aria-pressed", "true");
    expect(italicToggle).toHaveAttribute("aria-pressed", "false");

    // Act
    await user.click(italicToggle);

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith(["bold", "italic"]);
    expect(boldToggle).toHaveAttribute("aria-pressed", "true");
    expect(italicToggle).toHaveAttribute("aria-pressed", "true");
  });
});
