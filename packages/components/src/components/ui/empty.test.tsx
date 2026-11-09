import {render, screen} from "@testing-library/react";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type Node as CssNode, type Root, type Rule} from "postcss";
import {createRef, type ComponentRef} from "react";
import {describe, expect, expectTypeOf, it} from "vitest";

import {buttonVariants} from "./button";
import buttonStyles from "./button.module.css";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "./empty";
import styles from "./empty.module.css";

type Specificity = readonly [ids: number, classes: number, types: number];
type CompiledSheet = Readonly<{root: Root; classes: Readonly<Record<string, string>>}>;
/** The modelled user: a hover-capable pointer that may be hovering, keyboard focus, and optionally forced colors. */
type CascadeState = Readonly<{hover?: boolean; focusVisible?: boolean; forcedColors?: boolean}>;

// Lower real native CSS nesting so every compiled rule carries its effective selector and media.
function compileSheet(filename: string, code: Buffer | string, classes: Readonly<Record<string, string>>): CompiledSheet {
  return {
    root: parse(transform({filename, code: Buffer.from(code), include: Features.Nesting, targets: {chrome: 100 << 16}}).code.toString()),
    classes,
  };
}

const compiledEmpty = compileSheet("empty.module.css", readFileSync(join(import.meta.dirname, "empty.module.css")), styles);
const compiledButton = compileSheet("button.module.css", readFileSync(join(import.meta.dirname, "button.module.css")), buttonStyles);
// An element-only consumer reset, as in `sites/arolariu.ro/src/styles/base/_reset.scss`, plus a competing link colour.
const elementReset = compileSheet("element-reset.css", "a { color: #0000ee; text-decoration: none; }", {});

function cssClass(name: string): string {
  const value = styles[name];
  if (!value) throw new Error(`Missing empty class: ${name}`);
  return value;
}

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

/** Hover-capability rules always apply; forced-colors rules only when modelled; other media are separate contracts. */
function appliesInState(rule: Rule, state: CascadeState): boolean {
  for (let ancestor: CssNode | undefined = rule.parent; ancestor; ancestor = ancestor.parent) {
    if (!(ancestor instanceof AtRule)) continue;
    if (ancestor.name === "media" && ancestor.params === "(hover: hover)") continue;
    if (ancestor.name === "media" && ancestor.params === "(forced-colors: active)" && state.forcedColors === true) continue;
    return false;
  }
  return true;
}

/** Resolves user-action pseudo-classes for matching; specificity still comes from the authored selector. */
function inState(selector: string, state: CascadeState): string {
  return selector
    .replace(/:where\(:hover\)|:hover\b/gu, state.hover === true ? "" : ":not(*)")
    .replace(/:focus-visible\b/gu, state.focusVisible === true ? "" : ":not(*)");
}

/** Declarations cascaded across compiled stylesheets in the given order: specificity, then order, decide each property. */
function cascaded(element: Element, sheets: readonly CompiledSheet[], state: CascadeState = {}): Record<string, string> {
  const winners = new Map<string, Readonly<{value: string; specificity: Specificity}>>();
  for (const sheet of sheets) {
    sheet.root.walkRules((rule) => {
      if (!appliesInState(rule, state)) return;
      const strongest = selectorList(rule.selector)
        .filter((selector) => !selector.includes("::"))
        .filter((selector) =>
          element.matches(
            inState(
              selector.replace(/\.([a-z][\w-]*)/giu, (_, name: string) => {
                const className = sheet.classes[name];
                if (!className) throw new Error(`Missing CSS Module class: ${name}`);
                return `.${CSS.escape(className)}`;
              }),
              state,
            ),
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

describe("review correction: EmptyDescription render composition", () => {
  it("renders a paragraph by default and composes a caller element through Base UI render", () => {
    const ref = createRef<HTMLElement>();
    const {rerender} = render(<EmptyDescription ref={ref}>Try adjusting your filters.</EmptyDescription>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    expect(ref.current).toHaveAttribute("data-slot", "empty-description");

    rerender(
      <EmptyDescription
        ref={ref}
        className='caller'
        render={<div />}>
        <p>Save something to get started.</p>
        <ul>
          <li>Import an existing collection.</li>
        </ul>
      </EmptyDescription>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute("data-slot", "empty-description");
    expect(ref.current).toHaveClass(cssClass("description"), "caller");
    expect(screen.getByRole("list").parentElement).toBe(ref.current);
  });

  it("lets caller props, including data-slot, override the preset attributes", () => {
    render(<EmptyDescription {...{"data-slot": "caller-description"}}>Caller-owned slot</EmptyDescription>);
    expect(screen.getByText("Caller-owned slot")).toHaveAttribute("data-slot", "caller-description");
  });

  it("preserves React 19 ref-callback cleanup on the rendered element", () => {
    const calls: string[] = [];
    const {unmount} = render(
      <EmptyDescription
        ref={(node) => {
          calls.push(`attach:${node?.tagName ?? "null"}`);
          return () => {
            calls.push("cleanup");
          };
        }}>
        Cleanup
      </EmptyDescription>,
    );
    unmount();
    expect(calls).toEqual(["attach:P", "cleanup"]);
  });

  it("passes its slot state to a render callback with merged classes", () => {
    render(
      <EmptyDescription
        className='caller'
        render={(props, state) => (
          <section
            data-state-slot={state.slot}
            {...props}
          />
        )}>
        Callback composition
      </EmptyDescription>,
    );
    const section = screen.getByText("Callback composition");
    expect(section.tagName).toBe("SECTION");
    expect(section).toHaveAttribute("data-state-slot", "empty-description");
    expect(section).toHaveClass(cssClass("description"), "caller");
  });

  it("exposes canonical render composition instead of an `as` prop", () => {
    expectTypeOf<EmptyDescription.Props>().toHaveProperty("render");
    expectTypeOf<EmptyDescription.Props>().not.toHaveProperty("as");
    expectTypeOf<EmptyDescription.State>().toEqualTypeOf<Readonly<{slot: "empty-description"}>>();
    expectTypeOf<ComponentRef<typeof EmptyDescription>>().toEqualTypeOf<HTMLElement>();
  });
});

describe.each([
  ["reset, Empty, Button", [elementReset, compiledEmpty, compiledButton]],
  ["reset, Button, Empty", [elementReset, compiledButton, compiledEmpty]],
  ["Empty, Button, reset", [compiledEmpty, compiledButton, elementReset]],
  ["Button, Empty, reset", [compiledButton, compiledEmpty, elementReset]],
] as const)("review correction: compiled nested-link rules with %s stylesheet order", (_, sheets) => {
  function renderLinks(): Readonly<{plain: HTMLElement; outline: HTMLElement; filled: HTMLElement}> {
    render(
      <EmptyDescription>
        Adjust your filters, <a href='#guide'>read the guide</a>,{" "}
        <a
          href='#import'
          className={buttonVariants({variant: "outline", size: "sm"})}>
          import items
        </a>{" "}
        or{" "}
        <a
          href='#create'
          className={buttonVariants()}>
          create one
        </a>
        .
      </EmptyDescription>,
    );
    return {
      plain: screen.getByRole("link", {name: "read the guide"}),
      outline: screen.getByRole("link", {name: "import items"}),
      filled: screen.getByRole("link", {name: "create one"}),
    };
  }

  it("keeps plain links inheriting and underlined over an element-only reset while class-styled anchors keep their paint", () => {
    const {plain, outline} = renderLinks();
    expect(cascaded(plain, sheets)).toMatchObject({color: "inherit", "text-decoration": "underline", "text-underline-offset": "4px"});
    expect(usedColor(plain, sheets)).toBe("var(--ac-muted-foreground)");
    expect(cascaded(outline, sheets)).toMatchObject({"background-color": "var(--ac-background)", "text-decoration": "none"});
    expect(usedColor(outline, sheets)).toBe("var(--ac-foreground)");
  });

  it("darkens only plain links on hover, so a filled class-styled anchor keeps its own text colour", () => {
    const {plain, filled} = renderLinks();
    expect(usedColor(plain, sheets, {hover: true})).toBe("var(--ac-foreground)");
    // Taking the plain-link hover colour would put foreground text on the primary fill.
    expect(usedColor(filled, sheets, {hover: true})).toBe("var(--ac-primary-foreground)");
  });

  it("adds the link focus ring without replacing a class-styled anchor's own focus offset", () => {
    const {plain, filled} = renderLinks();
    expect(cascaded(plain, sheets, {focusVisible: true})).toMatchObject({outline: "2px solid var(--ac-ring)", "outline-offset": "2px"});
    expect(cascaded(filled, sheets, {focusVisible: true})).toMatchObject({outline: "2px solid var(--ac-ring)", "outline-offset": "-1px"});
  });

  it("uses LinkText for plain links in forced colors while class-styled anchors keep their system button colour", () => {
    const {plain, filled} = renderLinks();
    expect(usedColor(plain, sheets, {forcedColors: true}).toLowerCase()).toBe("linktext");
    expect(usedColor(filled, sheets, {forcedColors: true}).toLowerCase()).toBe("buttontext");
  });
});

describe("Empty", () => {
  it("supports a correctly typed rich description while keeping paragraph defaults", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <img
              src='/empty.svg'
              alt='Empty library'
            />
          </EmptyMedia>
          <EmptyTitle>
            <h2>No saved items</h2>
          </EmptyTitle>
          <EmptyDescription
            render={<div />}
            ref={ref}>
            <p>Save something to get started.</p>
            <ul>
              <li>
                <a href='/help'>Read the guide</a>
              </li>
            </ul>
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type='button'>Create item</button>
        </EmptyContent>
      </Empty>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(screen.getByRole("link", {name: "Read the guide"})).toHaveAttribute("href", "/help");
    expect(screen.getByRole("list").parentElement).toBe(ref.current);
    expect(screen.getByRole("img", {name: "Empty library"})).toHaveAttribute("src", "/empty.svg");
    expect(screen.getByRole("button", {name: "Create item"})).toHaveAttribute("type", "button");
  });
  it("renders Empty compound components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const emptyRef = createRef<HTMLDivElement>();
    const contentRef = createRef<HTMLDivElement>();

    // Act
    render(
      <Empty
        ref={emptyRef}
        className='empty-class'
        data-testid='empty-root'>
        <EmptyHeader data-testid='empty-header'>
          <EmptyMedia data-testid='empty-media'>📦</EmptyMedia>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>Add your first item to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent
          ref={contentRef}
          className='empty-content-class'
          data-testid='empty-content'>
          Action area
        </EmptyContent>
      </Empty>,
    );

    // Assert
    const emptyRoot = screen.getByTestId("empty-root");
    const emptyContent = screen.getByTestId("empty-content");

    expect(emptyRoot).toHaveClass("empty-class");
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first item to get started.")).toBeInTheDocument();
    expect(emptyContent).toHaveTextContent("Action area");
    expect(emptyContent).toHaveClass("empty-content-class");
    expect(emptyRef.current).toBe(emptyRoot);
    expect(contentRef.current).toBe(emptyContent);
  });

  it("renders EmptyMedia with the default variant", () => {
    // Arrange
    render(<EmptyMedia data-testid='empty-media-default'>📦</EmptyMedia>);

    // Assert
    const media = screen.getByTestId("empty-media-default");
    expect(media).toHaveTextContent("📦");
    expect(media).toHaveAttribute("data-variant", "default");
    expect(media).toHaveAttribute("data-slot", "empty-icon");
  });

  it("renders EmptyMedia with the icon variant", () => {
    // Arrange
    render(
      <EmptyMedia
        variant='icon'
        data-testid='empty-media-icon'>
        📭
      </EmptyMedia>,
    );

    // Assert
    const media = screen.getByTestId("empty-media-icon");
    expect(media).toHaveTextContent("📭");
    expect(media).toHaveAttribute("data-variant", "icon");
    expect(media).toHaveAttribute("data-slot", "empty-icon");
  });

  it("applies distinct styling for default and icon media variants", () => {
    // Arrange
    render(
      <>
        <EmptyMedia data-testid='empty-media-default-variant'>📦</EmptyMedia>
        <EmptyMedia
          variant='icon'
          data-testid='empty-media-icon-variant'>
          📭
        </EmptyMedia>
      </>,
    );

    // Assert
    expect(screen.getByTestId("empty-media-default-variant").className).not.toBe(screen.getByTestId("empty-media-icon-variant").className);
  });

  it("forwards ref to EmptyMedia", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(<EmptyMedia ref={ref}>📦</EmptyMedia>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className to EmptyMedia alongside default styles", () => {
    // Arrange
    render(
      <EmptyMedia
        className='custom-media'
        data-testid='empty-media-custom'>
        📦
      </EmptyMedia>,
    );

    // Assert
    const media = screen.getByTestId("empty-media-custom");
    expect(media).toHaveClass("custom-media");
    expect(media.className).not.toBe("custom-media");
  });

  it("renders EmptyTitle without crashing", () => {
    // Arrange
    render(<EmptyTitle>Nothing here yet</EmptyTitle>);

    // Assert
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("forwards ref to EmptyTitle", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(<EmptyTitle ref={ref}>Nothing here yet</EmptyTitle>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className to EmptyTitle alongside default styles", () => {
    // Arrange
    render(
      <EmptyTitle
        className='custom-title'
        data-testid='empty-title'>
        Nothing here yet
      </EmptyTitle>,
    );

    // Assert
    const title = screen.getByTestId("empty-title");
    expect(title).toHaveClass("custom-title");
    expect(title.className).not.toBe("custom-title");
  });

  it("renders EmptyHeader without crashing", () => {
    // Arrange
    render(<EmptyHeader>Header content</EmptyHeader>);

    // Assert
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("forwards ref to EmptyHeader", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(<EmptyHeader ref={ref}>Header content</EmptyHeader>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className to EmptyHeader alongside default styles", () => {
    // Arrange
    render(
      <EmptyHeader
        className='custom-header'
        data-testid='empty-header-custom'>
        Header content
      </EmptyHeader>,
    );

    // Assert
    const header = screen.getByTestId("empty-header-custom");
    expect(header).toHaveClass("custom-header");
    expect(header.className).not.toBe("custom-header");
  });

  it("renders EmptyDescription as a paragraph", () => {
    // Arrange
    render(<EmptyDescription>Try adjusting your filters.</EmptyDescription>);

    // Assert
    const description = screen.getByText("Try adjusting your filters.");
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe("P");
  });

  it("forwards ref to EmptyDescription", () => {
    // Arrange
    const ref = createRef<HTMLParagraphElement>();

    render(<EmptyDescription ref={ref}>Try adjusting your filters.</EmptyDescription>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it("applies custom className to EmptyDescription alongside default styles", () => {
    // Arrange
    render(
      <EmptyDescription
        className='custom-description'
        data-testid='empty-description'>
        Try adjusting your filters.
      </EmptyDescription>,
    );

    // Assert
    const description = screen.getByTestId("empty-description");
    expect(description).toHaveClass("custom-description");
    expect(description.className).not.toBe("custom-description");
  });
});
