import {Field as BaseField} from "@base-ui/react/field";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import selectorParser from "postcss-selector-parser";
import type {JSX} from "react";
import {describe, expect, it} from "vitest";

import {Input} from "./input";
import {InputGroup, InputGroupInput, InputGroupTextarea} from "./input-group";
import groupStyles from "./input-group.module.css";
import inputStyles from "./input.module.css";
import {Textarea} from "./textarea";
import textareaStyles from "./textarea.module.css";

const sheets = [
  {file: "input.module.css", classes: inputStyles},
  {file: "textarea.module.css", classes: textareaStyles},
  {file: "input-group.module.css", classes: groupStyles},
].map(({file, classes}) => ({
  classes,
  stylesheet: parse(
    new TextDecoder().decode(
      transform({
        filename: file,
        code: readFileSync(join(import.meta.dirname, file)),
        targets: {chrome: 100 << 16},
      }).code,
    ),
  ),
}));

function declarationsFor(element: Element, media?: string): Readonly<Record<string, string>> {
  const declarations: Record<string, string> = {};
  for (const {classes, stylesheet} of sheets) {
    const active = stylesheet.clone();
    active.walkAtRules("media", (query) => {
      if (query.params === media) query.replaceWith(...(query.nodes ?? []));
      else query.remove();
    });
    active.walkRules((rule) => {
      if (rule.parent?.type !== "root") return;
      const selector = selectorParser((selectors) => {
        selectors.walkClasses((className) => {
          const scoped = classes[className.value];
          if (!scoped) throw new Error(`Unknown field CSS class: ${className.value}`);
          className.value = scoped;
        });
      }).processSync(rule.selector);
      // Happy DOM does not match :focus-within; retain its native meaning using
      // the actual focused descendant rather than replacing component behavior.
      const focusWithin = element.contains(element.ownerDocument.activeElement);
      const matchedSelector = selector.replaceAll(":focus-within", focusWithin ? "" : ":not(*)");
      if (!element.matches(matchedSelector)) return;
      rule.walkDecls((declaration) => {
        declarations[declaration.prop] = declaration.value;
      });
    });
  }
  return declarations;
}

interface InvalidFieldProps {
  readonly kind: "input" | "textarea" | "grouped input" | "grouped textarea";
  readonly state: "aria" | "primitive" | "valid";
}

function InvalidField({kind, state}: Readonly<InvalidFieldProps>): JSX.Element {
  const props = {"aria-label": "Invalid field", "aria-invalid": state === "aria" ? "true" : undefined} as const;
  let field: JSX.Element;
  switch (kind) {
    case "input":
      field = (
        <Input
          data-testid='focus-owner'
          {...props}
        />
      );
      break;
    case "textarea":
      field = (
        <Textarea
          data-testid='focus-owner'
          {...props}
        />
      );
      break;
    case "grouped input":
      field = (
        <InputGroup data-testid='focus-owner'>
          <InputGroupInput {...props} />
        </InputGroup>
      );
      break;
    case "grouped textarea":
      field = (
        <InputGroup data-testid='focus-owner'>
          <InputGroupTextarea {...props} />
        </InputGroup>
      );
  }
  return state === "primitive" ? <BaseField.Root invalid>{field}</BaseField.Root> : field;
}

const cases = [
  {kind: "input", state: "aria"},
  {kind: "input", state: "primitive"},
  {kind: "textarea", state: "aria"},
  {kind: "grouped input", state: "aria"},
  {kind: "grouped input", state: "primitive"},
  {kind: "grouped textarea", state: "aria"},
] as const;

describe("focused invalid field decoration", () => {
  it.each(["input", "textarea", "grouped input", "grouped textarea"] as const)(
    "preserves the existing ordinary-theme focus chrome for a valid %s",
    async (kind) => {
      render(
        <InvalidField
          kind={kind}
          state='valid'
        />,
      );
      await userEvent.setup().tab();
      expect(screen.getByRole("textbox", {name: "Invalid field"})).toHaveFocus();
      const focused = declarationsFor(screen.getByTestId("focus-owner"));
      expect(focused["border-color"]).toBe("var(--ac-ring)");
      expect(focused["box-shadow"]).toBe("0 0 0 1px var(--ac-ring)");
      expect(focused["outline"] ?? "none").toBe("none");
    },
  );

  it.each(cases)("keeps $kind $state validation while keyboard focus adds an independent outline", async (props) => {
    const user = userEvent.setup();
    render(
      <>
        <InvalidField {...props} />
        <button type='button'>Next control</button>
      </>,
    );
    const control = screen.getByRole("textbox", {name: "Invalid field"});
    const owner = screen.getByTestId("focus-owner");
    expect(control).toHaveAttribute(props.state === "primitive" ? "data-invalid" : "aria-invalid");
    const unfocused = declarationsFor(owner);
    expect(unfocused["border-color"]).toBe("var(--ac-destructive)");
    expect(unfocused["box-shadow"]).toContain("--ac-destructive");
    expect(unfocused["outline"] ?? "none").toBe("none");

    await user.tab();

    expect(control).toHaveFocus();
    expect(control.matches(":focus-visible")).toBe(true);
    const focused = declarationsFor(owner);
    expect(focused["border-color"]).toBe("var(--ac-destructive)");
    expect(focused["box-shadow"]).toContain("--ac-destructive");
    expect(focused["outline"]).toBe("2px solid var(--ac-ring)");
    expect(focused["outline-offset"]).toBe("2px");
    if (owner !== control) expect(declarationsFor(control)["outline"]).toBe("none");

    await user.tab();

    expect(screen.getByRole("button", {name: "Next control"})).toHaveFocus();
    expect(declarationsFor(owner)["outline"] ?? "none").toBe("none");
  });

  it.each(cases)("retains the $kind $state system-color focus outline in forced colors", async (props) => {
    render(<InvalidField {...props} />);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("textbox", {name: "Invalid field"})).toHaveFocus();
    const focused = declarationsFor(screen.getByTestId("focus-owner"), "(forced-colors: active)");
    expect(focused["outline"]).toBe("2px solid highlight");
    expect(focused["outline-offset"]).toBe("2px");
  });
});
