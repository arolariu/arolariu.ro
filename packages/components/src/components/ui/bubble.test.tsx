import {fireEvent, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type Node as CssNode} from "postcss";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, expectTypeOf, it} from "vitest";

import {Bubble, BubbleContent, BubbleGroup, BubbleReactions} from "./bubble";
import styles from "./bubble.module.css";
import * as stories from "./bubble.stories";

const {ErrorStates} = composeStories(stories);

const css = parse(readFileSync(join(import.meta.dirname, "bubble.module.css"), "utf8"));
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

type Theme = "light" | "dark";
type Rgba = readonly [number, number, number, number];
const themeTokens: Record<Theme, Record<string, string>> = {light: {}, dark: {}};
parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
  const theme = rule.selector === ":root" ? "light" : rule.selector.includes('[data-theme="dark"]') ? "dark" : undefined;
  if (theme) rule.walkDecls((decl) => void (themeTokens[theme][decl.prop] = decl.value));
});

function authoredPaint(target: HTMLElement, hover: boolean): Record<string, string> {
  const result: Record<string, string> = {};
  css.walkRules((rule) => {
    for (let ancestor: CssNode | undefined = rule.parent; ancestor; ancestor = ancestor.parent) {
      if (!(ancestor instanceof AtRule)) continue;
      if (ancestor.name !== "media" || ancestor.params !== "(hover: hover)" || !hover) return;
    }
    const selector = rule.selector
      .replace(/:global\(([^)]+)\)/gu, "$1")
      .replace(/\.([a-z][\w-]*)/giu, (_, name: string) => `.${CSS.escape(cssClass(name))}`)
      .replace(/:hover\b/gu, hover ? "" : ":not(*)");
    if (target.matches(selector)) rule.walkDecls((decl) => void (result[decl.prop] = decl.value));
  });
  return result;
}

// Use the real compiler to evaluate authored OKLCH mixes with live default
// tokens. Its sRGB fallback is a deterministic model, not native pixel proof.
function recipeColor(value: string | undefined, theme: Theme): Rgba {
  if (!value) throw new Error("Missing authored Bubble paint");
  const resolved = value.replace(/var\((--ac-[\w-]+)\)/gu, (_, token: string): string => {
    const color = themeTokens[theme][token];
    if (!color) throw new Error(`Missing ${theme} token ${token}`);
    return color;
  });
  const output = transform({
    filename: "bubble-contrast.css",
    code: Buffer.from(`.paint { color: ${resolved}; }`),
    targets: {chrome: 100 << 16},
  }).code.toString();
  const hex = /color:\s*#([\da-f]+);/iu.exec(output)?.[1];
  if (!hex) throw new Error(`Missing compiled sRGB paint: ${output}`);
  const expanded = hex.length <= 4 ? [...hex].map((digit) => digit.repeat(2)).join("") : hex;
  if (expanded.length !== 6 && expanded.length !== 8) throw new Error(`Unexpected sRGB paint: ${hex}`);
  const channel = (offset: number): number => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255;
  return [channel(0), channel(2), channel(4), expanded.length === 8 ? channel(6) : 1];
}

function composite(paint: Rgba, canvas: Rgba): Rgba {
  const alpha = paint[3];
  return [
    paint[0] * alpha + canvas[0] * (1 - alpha),
    paint[1] * alpha + canvas[1] * (1 - alpha),
    paint[2] * alpha + canvas[2] * (1 - alpha),
    1,
  ];
}

function textContrast(first: Rgba, second: Rgba): number {
  const luminance = ([red, green, blue]: Rgba): number => {
    const linear = (channel: number): number => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each(["light", "dark"] as const)("authored destructive Bubble in %s defaults", (theme) => {
  it.each([
    ["text", false],
    ["text", true],
    ["button", false],
    ["button", true],
    ["link", false],
    ["link", true],
  ] as const)("keeps ordinary %s text at 4.5:1 with hover=%s", (kind, hover) => {
    render(
      <Bubble variant='destructive'>
        <BubbleContent render={kind === "button" ? <button type='button' /> : kind === "link" ? <a href='#details' /> : undefined}>
          Message could not be sent
        </BubbleContent>
      </Bubble>,
    );
    const target = screen.getByText("Message could not be sent");
    const state = authoredPaint(target, hover);
    const background = composite(recipeColor(state["background-color"], theme), recipeColor("var(--ac-background)", theme));
    const foreground = composite(recipeColor(state["color"], theme), background);
    expect(textContrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Bubble", () => {
  it("makes authored idle and interactive error stories reachable in both themes", async () => {
    const user = userEvent.setup();
    const {container} = render(<ErrorStates />);
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-bubble-errorSurface");
    for (const theme of ["light", "dark"]) {
      const region = screen.getByRole("region", {name: `${theme} destructive states`});
      expect(region).toHaveAttribute("data-theme", theme);
      const text = within(region).getByText("Message could not be sent.");
      const button = within(region).getByRole("button", {name: "Retry sending message"});
      const link = within(region).getByRole("link", {name: "Review delivery error"});
      for (const target of [text, button, link]) {
        expect(target).toHaveClass(cssClass("content"));
        expect(target.parentElement).toHaveClass(cssClass("destructive"));
      }
      await user.hover(button);
      await user.click(button);
      expect(within(region).getByLabelText("Retry attempts")).toHaveTextContent("1");
      await user.hover(link);
      expect(link).toHaveAttribute("href", "#delivery-details");
    }
  });

  it("lets native rest props override preset slot and alignment attributes", () => {
    render(
      <Bubble
        align='start'
        {...{"data-slot": "caller-bubble", "data-align": "end"}}>
        Caller surface
      </Bubble>,
    );
    expect(screen.getByText("Caller surface")).toHaveAttribute("data-slot", "caller-bubble");
    expect(screen.getByText("Caller surface")).toHaveAttribute("data-align", "end");
  });

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
      "overflow-wrap": "anywhere",
      "max-inline-size": "100%",
      "min-inline-size": "0",
    });
    expect(declarations(".content").overflow).not.toBe("hidden");
    expect(declarations(".bubble")).toHaveProperty("max-inline-size", "80%");
    expect(declarations('.bubble[data-align="end"]')).toHaveProperty("align-self", "flex-end");
    expect(declarations('.reactions[data-align="start"]')).toHaveProperty("inset-inline-start", "var(--ac-space-3)");
    expect(declarations('.reactions[data-align="end"]')).toHaveProperty("inset-inline-end", "var(--ac-space-3)");
    expect(declarations('.reactions[data-side="top"]')).toMatchObject({top: "0", transform: "translateY(-75%)"});
    expect(declarations('.reactions[data-side="bottom"]')).toMatchObject({bottom: "0", transform: "translateY(75%)"});
  });
});
