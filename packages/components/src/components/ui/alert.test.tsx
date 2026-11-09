import {fireEvent, render, screen} from "@testing-library/react";
import {Features, transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type Root} from "postcss";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Alert, AlertAction, AlertDescription, AlertTitle} from "./alert";
import styles from "./alert.module.css";
import {buttonVariants} from "./button";
import buttonStyles from "./button.module.css";

const alertVariantsToTest = [
  ["default", styles.default],
  ["destructive", styles.destructive],
] as const;

type Specificity = readonly [ids: number, classes: number, types: number];
type CompiledSheet = Readonly<{root: Root; classes: Readonly<Record<string, string>>}>;

// Lower real native CSS nesting so every compiled rule carries its effective selector and media.
function compileSheet(filename: string, code: Buffer | string, classes: Readonly<Record<string, string>>): CompiledSheet {
  return {
    root: parse(transform({filename, code: Buffer.from(code), include: Features.Nesting, targets: {chrome: 100 << 16}}).code.toString()),
    classes,
  };
}

const compiledAlert = compileSheet("alert.module.css", readFileSync(join(import.meta.dirname, "alert.module.css")), styles);
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

/**
 * Rest-state declarations cascaded across compiled stylesheets in the given order: specificity, then order, decide each
 * property. Conditional (media) rules are separate contracts.
 */
function cascaded(element: Element, sheets: readonly CompiledSheet[]): Record<string, string> {
  const winners = new Map<string, Readonly<{value: string; specificity: Specificity}>>();
  for (const sheet of sheets) {
    sheet.root.walkRules((rule) => {
      if (rule.parent instanceof AtRule) return;
      const strongest = selectorList(rule.selector)
        .filter((selector) => !selector.includes("::"))
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

/** The used text colour: an `inherit` or unset cascaded colour resolves through the ancestors. */
function usedColor(element: Element, sheets: readonly CompiledSheet[]): string {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const color = cascaded(current, sheets)["color"];
    if (color && color !== "inherit") return color;
  }
  throw new Error("No cascaded text colour");
}

describe("review correction: Alert layout contract", () => {
  it("keeps free-form children and inline text runs in normal block flow when no AlertAction is present", () => {
    render(
      <Alert>
        Your session <a href='/sign-in'>expired</a>. <strong>Sign in</strong> again to continue.
        <p>Unsaved changes are kept.</p>
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    // A grid container would make every text run and inline child a separately auto-placed grid item.
    expect(cascaded(alert, [compiledAlert])).toHaveProperty("display", "block");
    for (const child of alert.children) expect(cascaded(child, [compiledAlert])).not.toHaveProperty("grid-column");
  });

  it("places only AlertAction in the trailing column and keeps the icon and every other child in the message column", () => {
    render(
      <Alert>
        <svg
          aria-hidden='true'
          data-testid='icon'
        />
        <AlertTitle>Storage almost full</AlertTitle>
        <p>Free-form content stays beside the action.</p>
        <AlertDescription>Remove unused files.</AlertDescription>
        <AlertAction data-testid='action'>
          <button type='button'>Review</button>
        </AlertAction>
      </Alert>,
    );
    expect(cascaded(screen.getByRole("alert"), [compiledAlert])).toMatchObject({
      display: "grid",
      "grid-template-columns": "minmax(0, 1fr) auto",
    });
    for (const child of [
      screen.getByRole("heading", {name: "Storage almost full"}),
      screen.getByText("Free-form content stays beside the action."),
      screen.getByText("Remove unused files."),
    ]) {
      expect(cascaded(child, [compiledAlert])).toHaveProperty("grid-column", "1");
    }
    // The compiler merges `grid-column: 2` and `grid-row: 1 / span 2` into the `grid-area` shorthand.
    expect(cascaded(screen.getByTestId("action"), [compiledAlert])).toHaveProperty("grid-area", "1 / 2 / span 2");
    // The absolutely positioned leading icon keeps the alert's padding box as its containing block.
    const icon = cascaded(screen.getByTestId("icon"), [compiledAlert]);
    expect(icon).toHaveProperty("position", "absolute");
    expect(icon).not.toHaveProperty("grid-column");
  });
});

describe.each([
  ["reset, Alert, Button", [elementReset, compiledAlert, compiledButton]],
  ["reset, Button, Alert", [elementReset, compiledButton, compiledAlert]],
  ["Alert, Button, reset", [compiledAlert, compiledButton, elementReset]],
  ["Button, Alert, reset", [compiledButton, compiledAlert, elementReset]],
] as const)("review correction: compiled nested-link rule with %s stylesheet order", (_, sheets) => {
  it.each([
    ["default", "var(--ac-foreground)", "var(--ac-muted-foreground)"],
    ["destructive", "var(--ac-destructive)", "var(--ac-destructive)"],
  ] as const)(
    "keeps plain %s title and description links inheriting and underlined while class-styled anchors keep their paint",
    (variant, titleColor, descriptionColor) => {
      render(
        <Alert variant={variant}>
          <AlertTitle>
            Read the <a href='#notes'>release notes</a>
          </AlertTitle>
          <AlertDescription>
            Check the <a href='#status'>service status</a> or{" "}
            <a
              href='#retry'
              className={buttonVariants({variant: "outline", size: "sm"})}>
              retry
            </a>
            .
          </AlertDescription>
        </Alert>,
      );
      const titleLink = screen.getByRole("link", {name: "release notes"});
      const descriptionLink = screen.getByRole("link", {name: "service status"});
      for (const link of [titleLink, descriptionLink]) {
        expect(cascaded(link, sheets)).toMatchObject({color: "inherit", "text-decoration": "underline"});
      }
      expect(usedColor(titleLink, sheets)).toBe(titleColor);
      expect(usedColor(descriptionLink, sheets)).toBe(descriptionColor);

      const styled = screen.getByRole("link", {name: "retry"});
      expect(cascaded(styled, sheets)).toMatchObject({"background-color": "var(--ac-background)", "text-decoration": "none"});
      expect(usedColor(styled, sheets)).toBe("var(--ac-foreground)");
    },
  );
});

describe("Alert", () => {
  it("preserves heading, rich body and action refs and allows a non-urgent native status role", () => {
    const title = createRef<HTMLHeadingElement>();
    const description = createRef<HTMLDivElement>();
    const action = createRef<HTMLDivElement>();
    render(
      <Alert
        role='status'
        aria-labelledby='notice-title'>
        <AlertTitle
          ref={title}
          id='notice-title'>
          Saved changes
        </AlertTitle>
        <AlertDescription ref={description}>
          <ul>
            <li>Available now</li>
          </ul>
        </AlertDescription>
        <AlertAction
          ref={action}
          className='caller-action'>
          <button
            type='button'
            disabled>
            Undo
          </button>
        </AlertAction>
      </Alert>,
    );
    expect(screen.getByRole("status", {name: "Saved changes"})).toBeInTheDocument();
    expect(title.current?.tagName).toBe("H5");
    expect(description.current?.tagName).toBe("DIV");
    expect(screen.getByRole("list").parentElement).toBe(description.current);
    expect(action.current).toHaveClass("caller-action");
    expect(screen.getByRole("button", {name: "Undo"})).toBeDisabled();
  });
  it("places a native action alongside rich alert content without taking over its icon or click", () => {
    const ref = createRef<HTMLDivElement>();
    let dismissed = false;
    render(
      <Alert>
        <svg
          aria-hidden='true'
          data-testid='leading-icon'
        />
        <AlertTitle>Service unavailable</AlertTitle>
        <AlertDescription>
          <a href='/status'>Read the status</a>
        </AlertDescription>
        <AlertAction ref={ref}>
          <button
            type='button'
            onClick={() => {
              dismissed = true;
            }}>
            <svg aria-hidden='true' />
            Dismiss
          </button>
        </AlertAction>
      </Alert>,
    );
    expect(ref.current).toHaveAttribute("data-slot", "alert-action");
    expect(screen.getByRole("alert")).toHaveAttribute("data-slot", "alert");
    fireEvent.click(screen.getByRole("button", {name: "Dismiss"}));
    expect(dismissed).toBe(true);
    expect(screen.getByRole("link", {name: "Read the status"})).toHaveAttribute("href", "/status");
  });
  it("renders without crashing", () => {
    render(<Alert>Content</Alert>);

    expect(screen.getByRole("alert")).toHaveTextContent("Content");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Alert ref={ref}>Content</Alert>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Alert className='custom-alert'>Content</Alert>);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveClass("custom-alert");
    expect(alert.className).not.toBe("custom-alert");
  });

  it("renders title and description children", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>System maintenance starts soon.</AlertDescription>
      </Alert>,
    );

    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("System maintenance starts soon.")).toBeInTheDocument();
  });

  it.each(alertVariantsToTest)("applies the %s variant styles", (variant, expectedClassName) => {
    if (expectedClassName === undefined) throw new Error(`Missing Alert ${variant} CSS Module class`);
    render(<Alert variant={variant}>Content</Alert>);

    expect(screen.getByRole("alert")).toHaveClass(expectedClassName);
  });

  it("forwards accessibility attributes", () => {
    render(
      <Alert
        aria-atomic='true'
        aria-live='assertive'>
        Accessible alert
      </Alert>,
    );

    const alert = screen.getByRole("alert");

    expect(alert).toHaveAttribute("aria-atomic", "true");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });
});
