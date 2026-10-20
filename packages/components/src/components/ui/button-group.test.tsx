import {mergeProps} from "@base-ui/react/merge-props";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type Node as CssNode, type Root, type Rule} from "postcss";
import {createRef} from "react";
import {describe, expect, it, vi} from "vitest";

import {Button} from "./button";
import {ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants} from "./button-group";
import styles from "./button-group.module.css";
import {CallbackText, RenderedText, RenderedLabel} from "./button-group.stories";
import separatorStyles from "./separator.module.css";

function requiredClass(name: string): string {
  const className = styles[name];
  if (typeof className !== "string" || className.trim().length === 0) {
    throw new Error(`Missing CSS Module class: ${name}`);
  }
  return className;
}

type Specificity = readonly [ids: number, classes: number, types: number];
type CompiledSheet = Readonly<{root: Root; classes: Readonly<Record<string, string>>}>;

// Lower real native CSS nesting so every compiled rule carries its effective selector and media.
function compileSheet(filename: string, classes: Readonly<Record<string, string>>): CompiledSheet {
  const code = readFileSync(join(import.meta.dirname, filename));
  return {
    root: parse(transform({filename, code, include: Features.Nesting, targets: {chrome: 100 << 16}}).code.toString()),
    classes,
  };
}

const compiledSeparator = compileSheet("separator.module.css", separatorStyles);
const compiledGroup = compileSheet("button-group.module.css", styles);

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

/** Unconditional rules always apply; `(forced-colors: active)` rules only when modelled; other media are separate contracts. */
function appliesIn(rule: Rule, forcedColors: boolean): boolean {
  for (let ancestor: CssNode | undefined = rule.parent; ancestor; ancestor = ancestor.parent) {
    if (!(ancestor instanceof AtRule)) continue;
    if (forcedColors && ancestor.name === "media" && ancestor.params === "(forced-colors: active)") continue;
    return false;
  }
  return true;
}

/**
 * Rest-state declarations cascaded across compiled stylesheets in the given order: specificity, then order, decide each
 * property. User-action states (`:hover`, `:focus-visible`) and `!important` are separate contracts.
 */
function cascaded(element: Element, sheets: readonly CompiledSheet[], forcedColors = false): Record<string, string> {
  const winners = new Map<string, Readonly<{value: string; specificity: Specificity}>>();
  for (const sheet of sheets) {
    sheet.root.walkRules((rule) => {
      if (!appliesIn(rule, forcedColors)) return;
      const strongest = selectorList(rule.selector)
        .filter((selector) => !selector.includes("::") && !/:hover|:focus-visible/u.test(selector))
        .filter((selector) =>
          element.matches(
            selector.replace(/\.([a-z][\w-]*)/giu, (_, name: string) => {
              const className = sheet.classes[name];
              if (!className) throw new Error(`Missing CSS Module class: ${name}`);
              return `.${CSS.escape(className)}`;
            }),
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

// Consumer fixtures: labels accept both callback props and label-specific refs.
function GroupTextLabelCallbackConsumer({labelRef}: Readonly<{labelRef: React.Ref<HTMLLabelElement>}>): React.ReactElement {
  return (
    <ButtonGroupText
      ref={labelRef}
      render={(props, state) => (
        <label
          {...props}
          htmlFor='callback-quantity'
          data-composition-slot={state.slot}
        />
      )}>
      Callback quantity
    </ButtonGroupText>
  );
}

function GroupTextLabelElementConsumer({
  labelRef,
  childRef,
  onClick,
}: Readonly<{
  labelRef: React.Ref<HTMLLabelElement>;
  childRef: React.Ref<HTMLLabelElement>;
  onClick: React.MouseEventHandler<HTMLElement>;
}>): React.ReactElement {
  return (
    <ButtonGroupText
      ref={labelRef}
      onClick={onClick}
      render={
        <label
          ref={childRef}
          htmlFor='quantity'
        />
      }>
      Quantity
    </ButtonGroupText>
  );
}

describe("ButtonGroup", () => {
  it("renders ButtonGroup components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const groupRef = createRef<HTMLDivElement>();
    const textRef = createRef<HTMLDivElement>();

    // Act
    render(
      <ButtonGroup
        ref={groupRef}
        className='button-group-class'
        data-testid='button-group'>
        <button type='button'>Previous</button>
        <ButtonGroupSeparator />
        <ButtonGroupText
          ref={textRef}
          className='button-group-text-class'
          data-testid='button-group-text'>
          Navigation
        </ButtonGroupText>
      </ButtonGroup>,
    );

    // Assert
    const buttonGroup = screen.getByTestId("button-group");
    const buttonGroupText = screen.getByTestId("button-group-text");

    expect(buttonGroup).toHaveClass("button-group-class");
    expect(buttonGroupText).toHaveClass("button-group-text-class");
    expect(screen.getByRole("button", {name: "Previous"})).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByTestId("button-group").querySelector("[data-slot='button-group-separator']")).toBeInTheDocument();
    expect(groupRef.current).toBe(buttonGroup);
    expect(textRef.current).toBe(buttonGroupText);
  });

  it("renders ButtonGroup with vertical orientation", () => {
    // Arrange & Act
    render(
      <ButtonGroup
        orientation='vertical'
        data-testid='button-group-vertical'>
        <button type='button'>Top</button>
        <button type='button'>Bottom</button>
      </ButtonGroup>,
    );

    // Assert
    const buttonGroup = screen.getByTestId("button-group-vertical");
    expect(buttonGroup).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByRole("button", {name: "Top"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Bottom"})).toBeInTheDocument();
  });

  it("renders ButtonGroupText with a render element", () => {
    // Arrange & Act
    render(
      <ButtonGroup>
        <ButtonGroupText
          data-testid='button-group-text-child'
          render={<div className='custom-div'>Custom Text</div>}
        />
      </ButtonGroup>,
    );

    // Assert
    const textElement = screen.getByTestId("button-group-text-child");
    expect(textElement).toHaveClass("custom-div");
    expect(textElement.tagName).toBe("DIV");
    expect(screen.getByText("Custom Text")).toBeInTheDocument();
  });

  it.each([
    ["horizontal", requiredClass("horizontal")],
    ["vertical", requiredClass("vertical")],
  ] as const)("exposes %s orientation, styles, and an accessible group label", (orientation, orientationClass) => {
    render(
      <ButtonGroup
        orientation={orientation}
        aria-label='Page actions'>
        <Button>Previous</Button>
        <Button>Next</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", {name: "Page actions"});
    expect(group).toHaveClass(requiredClass("root"), orientationClass);
    expect(group).toHaveAttribute("data-orientation", orientation);
    expect(group).toHaveAttribute("data-slot", "button-group");
  });

  it("generates default and customized orientation classes", () => {
    expect(buttonGroupVariants()).toContain(requiredClass("root"));
    expect(buttonGroupVariants()).toContain(requiredClass("horizontal"));
    expect(buttonGroupVariants({orientation: "vertical", className: "consumer"})).toContain(requiredClass("vertical"));
    expect(buttonGroupVariants({className: "consumer"})).toContain("consumer");
  });

  it("retains sequential keyboard behavior of real grouped controls", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ButtonGroup aria-label='Actions'>
        <Button>Previous</Button>
        <ButtonGroupText>Page 1</ButtonGroupText>
        <ButtonGroupSeparator />
        <Button
          nativeButton={false}
          render={<div />}
          onClick={onClick}>
          Next
        </Button>
        <Button disabled>Unavailable</Button>
      </ButtonGroup>,
    );
    await user.tab();
    expect(screen.getByRole("button", {name: "Previous"})).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", {name: "Next"})).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(screen.getByRole("button", {name: "Unavailable"})).not.toHaveFocus();
  });

  it("merges render refs, events, classes, and preserves element content", async () => {
    const user = userEvent.setup();
    const wrapperRef = createRef<HTMLSpanElement>();
    const childRef = createRef<HTMLSpanElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <ButtonGroupText
        ref={wrapperRef}
        className='wrapper'
        onClick={() => calls.push("wrapper")}
        render={
          <span
            ref={childRef}
            className='child'
            onClick={() => calls.push("child")}>
            Quantity
          </span>
        }
      />,
    );
    const text = screen.getByText("Quantity");
    expect(wrapperRef.current).toBe(text);
    expect(childRef.current).toBe(text);
    expect(text).toHaveClass(requiredClass("text"), "wrapper", "child");
    expect(text).toHaveAttribute("data-slot", "button-group-text");
    await user.click(text);
    expect(calls).toEqual(["child", "wrapper"]);
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("supports canonical render elements with both refs and wrapper content", async () => {
    const user = userEvent.setup();
    const wrapperRef = createRef<HTMLLabelElement>();
    const childRef = createRef<HTMLLabelElement>();
    const onClick = vi.fn();
    const {unmount} = render(
      <>
        <GroupTextLabelElementConsumer
          labelRef={wrapperRef}
          childRef={childRef}
          onClick={onClick}
        />
        <input id='quantity' />
      </>,
    );
    const text = screen.getByText("Quantity");
    expect(text.tagName).toBe("LABEL");
    expect(wrapperRef.current).toBe(text);
    expect(childRef.current).toBe(text);
    expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
    expect(wrapperRef.current?.control).toBe(screen.getByLabelText("Quantity"));
    await user.click(text);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Quantity")).toHaveFocus();
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("accepts label callback consumer props and forwards the correct label ref", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLLabelElement>();
    const {unmount} = render(
      <>
        <GroupTextLabelCallbackConsumer labelRef={ref} />
        <input id='callback-quantity' />
      </>,
    );
    const label = screen.getByText("Callback quantity");
    const input = screen.getByLabelText("Callback quantity");
    expect(ref.current).toBe(label);
    expect(ref.current?.control).toBe(input);
    expect(label).toHaveAttribute("data-composition-slot", "button-group-text");
    await user.click(label);
    expect(input).toHaveFocus();
    unmount();
    expect(ref.current).toBeNull();
  });

  it("exposes text slot state to callback renders with props and ref intact", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ButtonGroupText
        ref={ref}
        render={(props, state) => (
          <div
            {...props}
            aria-label={state.slot}
          />
        )}>
        Callback text
      </ButtonGroupText>,
    );
    const text = screen.getByLabelText("button-group-text");
    expect(text).toHaveTextContent("Callback text");
    expect(text).toHaveClass(requiredClass("text"));
    expect(ref.current).toBe(text);
  });

  it("honors render element event cancellation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const child = (
      <span
        {...mergeProps<"span">(
          {},
          {
            onClick: (event) => event.preventBaseUIHandler(),
          },
        )}>
        Cancelled
      </span>
    );
    render(
      <ButtonGroupText
        render={child}
        onClick={onClick}
      />,
    );
    await user.click(screen.getByText("Cancelled"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps plain-text children in the default div", () => {
    render(<ButtonGroupText>Fallback</ButtonGroupText>);
    const text = screen.getByText("Fallback");
    expect(text.tagName).toBe("DIV");
    expect(text).toHaveAttribute("data-slot", "button-group-text");
  });

  it("keeps fragment children inside the default text div", () => {
    render(
      <ButtonGroupText>
        <>
          <span>Fragment content</span>
        </>
      </ButtonGroupText>,
    );
    expect(screen.getByText("Fragment content").parentElement).toHaveAttribute("data-slot", "button-group-text");
    expect(screen.getByText("Fragment content").parentElement?.tagName).toBe("DIV");
  });

  it.each(["horizontal", "vertical"] as const)("forwards %s separator orientation, classes, and ref", (orientation) => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ButtonGroupSeparator
        ref={ref}
        orientation={orientation}
        className='consumer'
      />,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-orientation", orientation);
    expect(separator).toHaveAttribute("data-orientation", orientation);
    expect(separator).toHaveClass(requiredClass("separator"), "consumer");
    expect(ref.current).toBe(separator);
  });

  it("defaults the separator to the vertical axis for a horizontal group", () => {
    render(<ButtonGroupSeparator />);
    expect(screen.getByRole("separator")).toHaveAttribute("data-orientation", "vertical");
  });

  it.each([
    ["default (vertical)", undefined, "vertical"],
    ["horizontal", "horizontal", "horizontal"],
  ] as const)("review correction (L12): resolves a callback className with the %s separator state", (_, orientation, resolved) => {
    const states: string[] = [];
    render(
      <ButtonGroupSeparator
        {...(orientation === undefined ? {} : {orientation})}
        className={(state) => {
          states.push(state.orientation);
          return `consumer-${state.orientation}`;
        }}
      />,
    );
    const separator = screen.getByRole("separator");
    // The callback receives the primitive's state; its result is merged with the group class instead of being dropped.
    expect(separator).toHaveClass(requiredClass("separator"), `consumer-${resolved}`);
    expect(states).not.toHaveLength(0);
    expect(new Set(states)).toEqual(new Set([resolved]));
  });

  it("preserves label association and keyboard semantics in real composition stories", async () => {
    const user = userEvent.setup();
    render(
      <>
        <RenderedLabel.render />
        <CallbackText.render />
        <RenderedText.render />
      </>,
    );
    const input = screen.getByRole("spinbutton", {name: "Quantity"});
    await user.click(screen.getByText("Quantity"));
    expect(input).toHaveFocus();
    expect(screen.getByLabelText("button-group-text")).toHaveTextContent("Page 1 of 5");
    expect(screen.getByRole("button", {name: "Next"}).tagName).toBe("DIV");
    expect(screen.getByRole("button", {name: "Last page"})).toBeDisabled();
    expect(screen.getByText("Display").tagName).toBe("SPAN");
    expect(screen.getByRole("button", {name: "Compact"})).toHaveAttribute("data-size", "xs");
  });
});

// Root imports now load `button-group.module.css` before `separator.module.css`, while the `button-group` subpath loads
// them the other way round. Both paint a `.separator` class at (0,1,0), so the result must not depend on which loads last.
describe.each([
  ["Separator, ButtonGroup", [compiledSeparator, compiledGroup]],
  ["ButtonGroup, Separator", [compiledGroup, compiledSeparator]],
] as const)("review correction: ButtonGroupSeparator paint with %s stylesheet order", (_, sheets) => {
  function renderGroupSeparator(): HTMLElement {
    render(
      <ButtonGroup aria-label='Pagination'>
        <Button>Previous</Button>
        <ButtonGroupSeparator />
        <Button>Next</Button>
      </ButtonGroup>,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveClass(requiredClass("separator"), separatorStyles["separator"]!);
    return separator;
  }

  it("paints the rule with the border token at rest", () => {
    expect(cascaded(renderGroupSeparator(), sheets)["background-color"]).toBe("var(--ac-border)");
  });

  it("paints the rule with the CanvasText system colour under forced colors", () => {
    // Forced colors replace a non-system background with Canvas, which would hide the 1px rule against the page.
    expect(cascaded(renderGroupSeparator(), sheets, true)["background-color"]?.toLowerCase()).toBe("canvastext");
  });
});
