import {fireEvent, render, screen} from "@testing-library/react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import * as React from "react";
import {describe, expect, expectTypeOf, it} from "vitest";

import {Marker, MarkerContent, MarkerIcon, markerVariants} from "./marker";
import styles from "./marker.module.css";

const css = parse(readFileSync(join(import.meta.dirname, "marker.module.css"), "utf8"));
function cssClass(name: string): string {
  const value = styles[name];
  if (!value) throw new Error(`Missing marker class: ${name}`);
  return value;
}

function declarations(selector: string): Record<string, string> {
  const result: Record<string, string> = {};
  css.walkRules(selector, (rule) => rule.walkDecls((declaration) => void (result[declaration.prop] = declaration.value)));
  return result;
}

describe("Marker", () => {
  it("publishes precise native span refs and an actual rendered root element ref", () => {
    expectTypeOf<React.ComponentRef<typeof Marker>>().toEqualTypeOf<HTMLElement>();
    expectTypeOf<React.ComponentRef<typeof MarkerIcon>>().toEqualTypeOf<HTMLSpanElement>();
    expectTypeOf<React.ComponentRef<typeof MarkerContent>>().toEqualTypeOf<HTMLSpanElement>();
  });

  it.each(["default", "separator", "border"] as const)("supports the %s surface and caller-owned content", (variant) => {
    render(
      <Marker
        variant={variant}
        data-testid='marker'>
        <MarkerContent>Caller boundary</MarkerContent>
      </Marker>,
    );
    expect(screen.getByTestId("marker")).toHaveAttribute("data-slot", "marker");
    expect(screen.getByTestId("marker")).toHaveAttribute("data-variant", variant);
    expect(screen.getByTestId("marker")).toHaveTextContent("Caller boundary");
    expect(screen.getByTestId("marker")).not.toHaveAttribute("role");
  });

  it("defaults its state and hides decorative icon content while forwarding all refs", () => {
    const root = React.createRef<HTMLElement>();
    const icon = React.createRef<HTMLSpanElement>();
    const content = React.createRef<HTMLSpanElement>();
    const {unmount} = render(
      <Marker
        ref={root}
        dir='rtl'
        className='caller'>
        <MarkerIcon ref={icon}>
          <svg data-testid='decoration' />
        </MarkerIcon>
        <MarkerContent ref={content}>اليوم</MarkerContent>
      </Marker>,
    );
    expect(root.current).toHaveAttribute("data-variant", "default");
    expect(root.current).toHaveAttribute("dir", "rtl");
    expect(root.current).toHaveClass(cssClass("marker"), "caller");
    expect(icon.current).toHaveAttribute("data-slot", "marker-icon");
    expect(icon.current).toHaveAttribute("aria-hidden", "true");
    expect(icon.current?.tagName).toBe("SPAN");
    expect(content.current).toHaveAttribute("data-slot", "marker-content");
    expect(content.current?.tagName).toBe("SPAN");
    unmount();
    for (const ref of [root, icon, content]) expect(ref.current).toBeNull();
  });

  it("keeps decorative icons hidden even when a caller passes a contradictory flag", () => {
    render(
      <MarkerIcon
        aria-hidden='false'
        data-testid='icon'>
        ★
      </MarkerIcon>,
    );
    expect(screen.getByTestId("icon")).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes the typed helper without requiring a rendered Marker", () => {
    expect(markerVariants()).toBe(cssClass("marker"));
    expect(markerVariants({variant: "default", className: "caller"})).toContain("caller");
    expect(markerVariants({variant: "separator"})).toContain(cssClass("separator"));
    expect(markerVariants({variant: "border", class: "consumer"})).toContain(cssClass("border"));
    expect(markerVariants({variant: "border", class: "consumer"})).toContain("consumer");
  });

  it("merges rendered link content, ARIA, refs and child-first cancellation", () => {
    const parent = React.createRef<HTMLAnchorElement>();
    const child = React.createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <Marker
        ref={parent}
        variant='border'
        className='parent'
        onClick={(event) => calls.push(`parent:${event.defaultPrevented}`)}
        render={
          <a
            ref={child}
            href='#history'
            className='child'
            aria-label='Earlier messages'
            onClick={(event) => {
              event.preventDefault();
              calls.push("child");
            }}>
            Child history
          </a>
        }>
        Ignored history
      </Marker>,
    );
    const link = screen.getByRole("link", {name: "Earlier messages"});
    expect(fireEvent.click(link)).toBe(false);
    expect(calls).toEqual(["child", "parent:true"]);
    expect(link).toHaveClass(cssClass("marker"), cssClass("border"), "parent", "child");
    expect(link).toHaveTextContent("Child history");
    expect(parent.current).toBe(link);
    expect(child.current).toBe(link);
    unmount();
    expect(parent.current).toBeNull();
    expect(child.current).toBeNull();
  });

  it("honors Base UI event cancellation without eager wrapper rendering", () => {
    const calls: string[] = [];
    render(
      <Marker
        onClick={() => calls.push("wrapper")}
        render={
          <button
            type='button'
            onClick={(event) => {
              if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") event.preventBaseUIHandler();
              calls.push("child");
            }}>
            Boundary
          </button>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "Boundary"}));
    expect(calls).toEqual(["child"]);
  });

  it("preserves a native rendered button's disabled attribute and does not activate its wrapper", () => {
    const calls: string[] = [];
    render(
      <Marker
        onClick={() => calls.push("wrapper")}
        render={
          <button
            type='button'
            disabled
          />
        }>
        Unavailable boundary
      </Marker>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Unavailable boundary"}));
    expect(screen.getByRole("button", {name: "Unavailable boundary"})).toBeDisabled();
    expect(calls).toEqual([]);
  });

  it("updates callback-owned variant state with a real merged ref and caller content", () => {
    const ref = React.createRef<HTMLButtonElement>();
    const fixture: Marker.Props = {
      ref,
      children: "More",
      variant: "separator",
      render: (props, state) => {
        expectTypeOf(state).toEqualTypeOf<Marker.State>();
        expectTypeOf(props.ref).toEqualTypeOf<React.RefCallback<HTMLElement> | null | undefined>();
        return (
          <button
            {...props}
            type='button'
            data-render-variant={state.variant}
          />
        );
      },
    };
    const {rerender} = render(<Marker {...fixture} />);
    expect(ref.current).toHaveAttribute("data-render-variant", "separator");
    expect(ref.current).toHaveTextContent("More");
    rerender(
      <Marker
        {...fixture}
        variant='border'
      />,
    );
    expect(ref.current).toHaveAttribute("data-render-variant", "border");
  });

  it("keeps empty and long content available and binds logical separator/border CSS", () => {
    const text = "LongUnbrokenMarker".repeat(40);
    const {rerender} = render(<MarkerContent data-testid='content' />);
    expect(screen.getByTestId("content")).toBeEmptyDOMElement();
    rerender(
      <Marker variant='separator'>
        <MarkerContent data-testid='content'>{text}</MarkerContent>
      </Marker>,
    );
    expect(screen.getByTestId("content")).toHaveClass(cssClass("content"));
    expect(screen.getByTestId("content").textContent).toBe(text);
    expect(declarations(".content")).toMatchObject({"min-inline-size": "0", "overflow-wrap": "anywhere"});
    expect(declarations(".separator::before")).toHaveProperty("margin-inline-end", "var(--ac-space-1)");
    expect(declarations(".separator::after")).toHaveProperty("margin-inline-start", "var(--ac-space-1)");
    expect(declarations(".border")).toHaveProperty("border-block-end", "1px solid var(--ac-border)");
    expect(declarations(".marker")).toHaveProperty("text-align", "start");
  });
});
