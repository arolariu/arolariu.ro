import {fireEvent, render, screen} from "@testing-library/react";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {parse} from "postcss";
import * as React from "react";
import {describe, expect, expectTypeOf, it} from "vitest";

import {Bubble, BubbleContent, BubbleGroup, BubbleReactions} from "./bubble";
import styles from "./bubble.module.css";

const css = parse(readFileSync(resolve(process.cwd(), "packages/components/src/components/ui/bubble.module.css"), "utf8"));
function cssClass(name: string): string {
  const value = styles[name];
  if (!value) throw new Error(`Missing bubble class: ${name}`);
  return value;
}

function declarations(selector: string): Record<string, string> {
  const result: Record<string, string> = {};
  css.walkRules(selector, (rule) => rule.walkDecls((declaration) => void (result[declaration.prop] = declaration.value)));
  return result;
}

describe("Bubble", () => {
  it("publishes native group/root/reaction refs and the content's actual composed element ref", () => {
    expectTypeOf<React.ComponentRef<typeof Bubble>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof BubbleGroup>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof BubbleReactions>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof BubbleContent>>().toEqualTypeOf<HTMLElement>();
  });

  it.each(["default", "secondary", "muted", "tinted", "outline", "ghost", "destructive"] as const)(
    "preserves %s variant and caller content",
    (variant) => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Bubble
          variant={variant}
          ref={ref}>
          <BubbleContent>Caller message</BubbleContent>
        </Bubble>,
      );
      expect(ref.current).toHaveAttribute("data-slot", "bubble");
      expect(ref.current).toHaveAttribute("data-variant", variant);
      expect(ref.current).toHaveAttribute("data-align", "start");
      expect(ref.current).toHaveTextContent("Caller message");
      expect(ref.current).toHaveClass(cssClass(variant));
    },
  );

  it("supports end alignment and every native slot ref without imposing chat semantics", () => {
    const group = React.createRef<HTMLDivElement>();
    const root = React.createRef<HTMLDivElement>();
    const content = React.createRef<HTMLElement>();
    const reactions = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <BubbleGroup
        ref={group}
        dir='rtl'
        className='caller'>
        <Bubble
          ref={root}
          align='end'>
          <BubbleContent ref={content}>مرحبا</BubbleContent>
          <BubbleReactions ref={reactions}>👍</BubbleReactions>
        </Bubble>
      </BubbleGroup>,
    );
    for (const [ref, slot] of [
      [group, "bubble-group"],
      [root, "bubble"],
      [content, "bubble-content"],
      [reactions, "bubble-reactions"],
    ] as const) {
      expect(ref.current).toHaveAttribute("data-slot", slot);
      expect(ref.current?.tagName).toBe("DIV");
      expect(ref.current).not.toHaveAttribute("role");
    }
    expect(group.current).toHaveAttribute("dir", "rtl");
    expect(group.current).toHaveClass("caller");
    expect(root.current).toHaveAttribute("data-align", "end");
    expect(reactions.current).toHaveAttribute("data-side", "bottom");
    expect(reactions.current).toHaveAttribute("data-align", "end");
    unmount();
    for (const ref of [group, root, content, reactions]) expect(ref.current).toBeNull();
  });

  it.each(["top", "bottom"] as const)("positions caller reactions on the %s side with both alignments", (side) => {
    const {rerender} = render(
      <BubbleReactions
        side={side}
        align='start'
        data-testid='reactions'>
        Reaction
      </BubbleReactions>,
    );
    expect(screen.getByTestId("reactions")).toHaveAttribute("data-side", side);
    expect(screen.getByTestId("reactions")).toHaveAttribute("data-align", "start");
    rerender(
      <BubbleReactions
        side={side}
        align='end'
        data-testid='reactions'
      />,
    );
    expect(screen.getByTestId("reactions")).toHaveAttribute("data-align", "end");
  });

  it("supports empty content and long text without rewriting or truncating its DOM", () => {
    const {rerender} = render(<BubbleContent data-testid='content' />);
    expect(screen.getByTestId("content")).toBeEmptyDOMElement();
    const text = "LongUnbrokenCallerContent".repeat(40);
    rerender(<BubbleContent data-testid='content'>{text}</BubbleContent>);
    expect(screen.getByTestId("content").textContent).toBe(text);
  });

  it("merges composed content, refs, child-first events and native cancellation", () => {
    const parent = React.createRef<HTMLAnchorElement>();
    const child = React.createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <BubbleContent
        ref={parent}
        className='parent'
        onClick={(event) => calls.push(`parent:${event.defaultPrevented}`)}
        render={
          <a
            ref={child}
            href='#message'
            className='child'
            aria-label='Read message'
            onClick={(event) => {
              event.preventDefault();
              calls.push("child");
            }}>
            Child text
          </a>
        }>
        Ignored text
      </BubbleContent>,
    );
    const link = screen.getByRole("link", {name: "Read message"});
    expect(fireEvent.click(link)).toBe(false);
    expect(calls).toEqual(["child", "parent:true"]);
    expect(link).toHaveTextContent("Child text");
    expect(link).toHaveClass(cssClass("content"), "parent", "child");
    expect(link.querySelector("div")).toBeNull();
    expect(parent.current).toBe(link);
    expect(child.current).toBe(link);
    unmount();
    expect(parent.current).toBeNull();
    expect(child.current).toBeNull();
  });

  it("lets composed children suppress the wrapper event", () => {
    const calls: string[] = [];
    render(
      <BubbleContent
        onClick={() => calls.push("wrapper")}
        render={
          <button
            type='button'
            onClick={(event) => {
              if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") event.preventBaseUIHandler();
              calls.push("child");
            }}>
            React
          </button>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "React"}));
    expect(calls).toEqual(["child"]);
  });

  it("preserves composed native submit and disabled attributes without inventing interaction state", () => {
    const calls: string[] = [];
    const {rerender} = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          calls.push("submit");
        }}>
        <BubbleContent render={<button type='submit' />}>Submit message choice</BubbleContent>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Submit message choice"}));
    expect(calls).toEqual(["submit"]);
    rerender(
      <BubbleContent
        onClick={() => calls.push("wrapper")}
        render={
          <button
            type='button'
            disabled
          />
        }>
        Disabled content
      </BubbleContent>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Disabled content"}));
    expect(calls).toEqual(["submit"]);
    expect(screen.getByRole("button", {name: "Disabled content"})).toBeDisabled();
  });

  it("passes owned slot state and a polymorphic ref through callback composition", () => {
    const ref = React.createRef<HTMLButtonElement>();
    const fixture: BubbleContent.Props = {
      ref,
      children: "Native callback",
      render: (props, state) => {
        expectTypeOf(state).toEqualTypeOf<BubbleContent.State>();
        expectTypeOf(props.ref).toEqualTypeOf<React.RefCallback<HTMLElement> | null | undefined>();
        return (
          <button
            {...props}
            type='button'
            data-render-slot={state.slot}
          />
        );
      },
    };
    render(<BubbleContent {...fixture} />);
    expect(ref.current).toBe(screen.getByRole("button", {name: "Native callback"}));
    expect(ref.current).toHaveAttribute("data-render-slot", "bubble-content");
  });

  it("binds wrapping, maximum width and logical RTL reaction positions in the stylesheet", () => {
    render(
      <Bubble align='end'>
        <BubbleContent>UnbrokenContent</BubbleContent>
        <BubbleReactions>👍</BubbleReactions>
      </Bubble>,
    );
    expect(screen.getByText("UnbrokenContent")).toHaveClass(cssClass("content"));
    expect(declarations(".content")).toMatchObject({
      overflow: "hidden",
      "overflow-wrap": "anywhere",
      "max-inline-size": "100%",
      "min-inline-size": "0",
    });
    expect(declarations(".bubble")).toHaveProperty("max-inline-size", "80%");
    expect(declarations('.bubble[data-align="end"]')).toHaveProperty("align-self", "flex-end");
    expect(declarations('.reactions[data-align="start"]')).toHaveProperty("inset-inline-start", "var(--ac-space-3)");
    expect(declarations('.reactions[data-align="end"]')).toHaveProperty("inset-inline-end", "var(--ac-space-3)");
    expect(declarations('.reactions[data-side="top"]')).toMatchObject({top: "0", transform: "translateY(-75%)"});
    expect(declarations('.reactions[data-side="bottom"]')).toMatchObject({bottom: "0", transform: "translateY(75%)"});
  });
});
