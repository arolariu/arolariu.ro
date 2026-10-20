import {fireEvent, render, screen} from "@testing-library/react";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type Node as CssNode, type Root, type Rule} from "postcss";
import * as React from "react";
import {describe, expect, expectTypeOf, it} from "vitest";

import {buttonVariants} from "./button";
import buttonStyles from "./button.module.css";
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

type Specificity = readonly [ids: number, classes: number, types: number];
type CompiledSheet = Readonly<{root: Root; classes: Readonly<Record<string, string>>}>;
/** The modelled user: a hover-capable pointer that may be hovering. */
type CascadeState = Readonly<{hover?: boolean}>;

// Lower real native CSS nesting so every compiled rule carries its effective selector and media.
function compileSheet(filename: string, code: Buffer | string, classes: Readonly<Record<string, string>>): CompiledSheet {
  return {
    root: parse(transform({filename, code: Buffer.from(code), include: Features.Nesting, targets: {chrome: 100 << 16}}).code.toString()),
    classes,
  };
}

const compiledMarker = compileSheet("marker.module.css", readFileSync(join(import.meta.dirname, "marker.module.css")), styles);
const compiledButton = compileSheet("button.module.css", readFileSync(join(import.meta.dirname, "button.module.css")), buttonStyles);
// An element-only consumer reset, as in `sites/arolariu.ro/src/styles/base/_reset.scss`, plus a competing link colour.
const elementReset = compileSheet("element-reset.css", "a { color: #0000ee; text-decoration: none; }", {});

/** Splits a selector list at top-level commas; commas inside `:is()`/`:where()`/`:not()` arguments stay together. */
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

/** Hover-capability rules always apply; forced-colors, reduced-motion and other media are separate contracts. */
function appliesInState(rule: Rule): boolean {
  for (let ancestor: CssNode | undefined = rule.parent; ancestor; ancestor = ancestor.parent) {
    if (!(ancestor instanceof AtRule)) continue;
    if (ancestor.name === "media" && ancestor.params === "(hover: hover)") continue;
    return false;
  }
  return true;
}

/** Declarations cascaded across compiled stylesheets in the given order: specificity, then order, decide each property. */
function cascaded(element: Element, sheets: readonly CompiledSheet[], state: CascadeState = {}): Record<string, string> {
  const winners = new Map<string, Readonly<{value: string; specificity: Specificity}>>();
  for (const sheet of sheets) {
    sheet.root.walkRules((rule) => {
      if (!appliesInState(rule)) return;
      const strongest = selectorList(rule.selector)
        .filter((selector) => !selector.includes("::"))
        .filter((selector) =>
          element.matches(
            selector
              .replace(/\.([a-z][\w-]*)/giu, (_, name: string) => {
                const className = sheet.classes[name];
                if (!className) throw new Error(`Missing CSS Module class: ${name}`);
                return `.${CSS.escape(className)}`;
              })
              // Resolve the user-action pseudo-class for matching; specificity still comes from the authored selector.
              .replace(/:where\(:hover\)|:hover\b/gu, state.hover === true ? "" : ":not(*)"),
          ),
        )
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
function usedColor(element: Element, sheets: readonly CompiledSheet[], state: CascadeState = {}): string {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const color = cascaded(current, sheets, state)["color"];
    if (color && color !== "inherit") return color;
  }
  throw new Error("No cascaded text colour");
}

describe.each([
  ["reset, Marker, Button", [elementReset, compiledMarker, compiledButton]],
  ["reset, Button, Marker", [elementReset, compiledButton, compiledMarker]],
  ["Marker, Button, reset", [compiledMarker, compiledButton, elementReset]],
  ["Button, Marker, reset", [compiledButton, compiledMarker, elementReset]],
] as const)("review correction: compiled MarkerContent nested-link rules with %s stylesheet order", (_, sheets) => {
  function renderLinks(): Readonly<{plain: HTMLElement; outline: HTMLElement; filled: HTMLElement}> {
    render(
      <Marker>
        <MarkerContent>
          Earlier messages are in the <a href='#archive'>archive</a>;{" "}
          <a
            href='#load'
            className={buttonVariants({variant: "outline", size: "sm"})}>
            load them
          </a>{" "}
          or{" "}
          <a
            href='#jump'
            className={buttonVariants()}>
            jump to the latest
          </a>
          .
        </MarkerContent>
      </Marker>,
    );
    return {
      plain: screen.getByRole("link", {name: "archive"}),
      outline: screen.getByRole("link", {name: "load them"}),
      filled: screen.getByRole("link", {name: "jump to the latest"}),
    };
  }

  it("keeps plain links inheriting and underlined over an element-only reset while class-styled anchors keep their paint", () => {
    const {plain, outline} = renderLinks();
    expect(plain.parentElement).toHaveClass(cssClass("content"));
    expect(cascaded(plain, sheets)).toMatchObject({
      color: "inherit",
      "text-decoration": "underline",
      "text-underline-offset": "var(--ac-space-3)",
    });
    expect(usedColor(plain, sheets)).toBe("var(--ac-muted-foreground)");
    expect(cascaded(outline, sheets)).toMatchObject({"background-color": "var(--ac-background)", "text-decoration": "none"});
    expect(usedColor(outline, sheets)).toBe("var(--ac-foreground)");
  });

  it("darkens only plain links on hover, so a filled class-styled anchor keeps its own text colour", () => {
    const {plain, filled} = renderLinks();
    expect(usedColor(plain, sheets, {hover: true})).toBe("var(--ac-foreground)");
    // Taking the plain-link hover colour would put foreground text on the primary fill.
    expect(usedColor(filled, sheets, {hover: true})).toBe("var(--ac-primary-foreground)");
    expect(cascaded(filled, sheets, {hover: true})).toMatchObject({"text-decoration": "none"});
  });

  it("keeps a link-rendered Marker's own underline and inherited colour over an element-only reset", () => {
    render(<Marker render={<a href='#history' />}>Earlier messages</Marker>);
    const link = screen.getByRole("link", {name: "Earlier messages"});
    expect(cascaded(link, sheets)).toMatchObject({color: "inherit", "text-decoration": "underline"});
    expect(cascaded(link, sheets, {hover: true})).toMatchObject({color: "var(--ac-foreground)"});
  });
});

describe("Marker", () => {
  it("React 19 refresh: authors a minimum target for standalone rendered controls", () => {
    expect(declarations(":is(a, button).marker")).toMatchObject({"min-inline-size": "24px", "min-block-size": "24px"});
  });

  it("React 19 refresh: allows a meaningful localized icon instead of forcing it hidden", () => {
    render(
      <MarkerIcon
        role='img'
        aria-label='Livré'
        aria-hidden={false}>
        ✓
      </MarkerIcon>,
    );
    expect(screen.getByRole("img", {name: "Livré"})).toHaveAttribute("aria-hidden", "false");
  });

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

  it("honors caller ownership of icon exposure", () => {
    render(
      <MarkerIcon
        aria-hidden='false'
        data-testid='icon'>
        ★
      </MarkerIcon>,
    );
    expect(screen.getByTestId("icon")).toHaveAttribute("aria-hidden", "false");
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
