import {Field as BaseField} from "@base-ui/react/field";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {transform} from "lightningcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import selectorParser from "postcss-selector-parser";
import {type ChangeEvent, createRef, type JSX, useState} from "react";
import {describe, expect, it, vi} from "vitest";

import {Input} from "./input";
import styles from "./input.module.css";

function inputDeclarations(element: Element, media?: string): Readonly<Record<string, string>> {
  const transformed = transform({
    filename: "input.module.css",
    code: readFileSync(join(import.meta.dirname, "input.module.css")),
    targets: {chrome: 100 << 16},
  });
  const stylesheet = parse(new TextDecoder().decode(transformed.code));
  stylesheet.walkAtRules("media", (query) => {
    if (query.params === media) query.replaceWith(...(query.nodes ?? []));
    else query.remove();
  });
  const declarations: Record<string, string> = {};
  stylesheet.walkRules((rule) => {
    if (rule.parent?.type !== "root") return;
    const selector = selectorParser((selectors) => {
      selectors.walkClasses((className) => {
        const scopedClass = styles[className.value];
        if (!scopedClass) throw new Error(`Unknown Input CSS class: ${className.value}`);
        className.value = scopedClass;
      });
    }).processSync(rule.selector);
    if (!element.matches(selector)) return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });
  return declarations;
}

describe("Input", () => {
  it("applies the compiled reduced-motion cascade to the emitted input itself", () => {
    render(<Input aria-label='Reduced-motion input' />);
    const input = screen.getByRole("textbox", {name: "Reduced-motion input"});
    expect(input.classList).toContain(styles.input);
    expect(inputDeclarations(input)["transition"]).toBeDefined();
    expect(inputDeclarations(input)["transition"]).not.toBe("none");
    expect(inputDeclarations(input, "(prefers-reduced-motion: reduce)")["transition"]).toBe("none");
  });

  it("restores forced-color focus outlines on the emitted native control", async () => {
    const user = userEvent.setup();
    render(<Input aria-label='High-contrast input' />);
    const input = screen.getByRole("textbox", {name: "High-contrast input"});
    const media = "(forced-colors: active)";
    expect(inputDeclarations(input, media)["border-color"]).toBe("buttontext");
    await user.tab();
    expect(input).toHaveFocus();
    expect(input.matches(":focus-visible")).toBe(true);
    const declarations = inputDeclarations(input, media);
    expect(declarations["outline"]).toBe("2px solid highlight");
    expect(declarations["outline-offset"]).toBe("2px");
  });

  it("overrides authored disabled opacity and colors using emitted primitive state", () => {
    render(
      <BaseField.Root disabled>
        <Input aria-label='Disabled high-contrast input' />
      </BaseField.Root>,
    );
    const input = screen.getByRole("textbox", {name: "Disabled high-contrast input"});
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("data-disabled");
    expect(inputDeclarations(input)["opacity"]).toBe(".5");
    const declarations = inputDeclarations(input, "(forced-colors: active)");
    expect(declarations["border-color"]).toBe("graytext");
    expect(declarations["color"]).toBe("graytext");
    expect(declarations["opacity"]).toBe("1");
  });

  it.each(["aria", "primitive"] as const)("styles emitted %s invalid state in forced colors", (invalidState) => {
    render(
      invalidState === "primitive" ? (
        <BaseField.Root invalid>
          <Input aria-label='Invalid high-contrast input' />
        </BaseField.Root>
      ) : (
        <Input
          aria-label='Invalid high-contrast input'
          aria-invalid='true'
        />
      ),
    );
    const input = screen.getByRole("textbox", {name: "Invalid high-contrast input"});
    expect(input).toHaveAttribute(invalidState === "primitive" ? "data-invalid" : "aria-invalid");
    expect(inputDeclarations(input, "(forced-colors: active)")["border-color"]).toBe("linktext");
  });

  it("passes actual primitive state to render and class callbacks", async () => {
    const user = userEvent.setup();
    let renderState: Input.State | undefined;
    let classState: Input.State | undefined;
    render(
      <BaseField.Root
        invalid
        dirty
        touched>
        <Input
          aria-label='Composed'
          className={(state) => {
            classState = state;
            return state.valid === false ? "invalid-control" : "valid-control";
          }}
          render={(props, state) => {
            renderState = state;
            return <input {...props} />;
          }}
        />
      </BaseField.Root>,
    );
    const input = screen.getByRole("textbox", {name: "Composed"});
    expect(renderState).toMatchObject({valid: false, dirty: true, touched: true, disabled: false});
    expect(classState).toMatchObject({valid: false, dirty: true, touched: true, disabled: false});
    expect(input).toHaveClass("invalid-control");
    expect(input).toHaveAttribute("data-slot", "input");
    await user.click(input);
    expect(renderState?.focused).toBe(true);
  });

  it("merges composed input handlers, ARIA and callback refs with cleanup", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLElement>();
    const cleanup = vi.fn();
    const childRef = vi.fn((_element: HTMLInputElement | null) => cleanup);
    const childClick = vi.fn();
    const wrapperClick = vi.fn();
    const {unmount} = render(
      <Input
        ref={ref}
        onClick={wrapperClick}
        aria-label='Composed input'
        render={
          <input
            ref={childRef}
            onClick={childClick}
            className='child-input'
          />
        }
      />,
    );
    const input = screen.getByRole("textbox", {name: "Composed input"});
    expect(ref.current).toBe(input);
    expect(childRef).toHaveBeenCalledWith(input);
    expect(input).toHaveClass("child-input");
    await user.click(input);
    expect(wrapperClick).toHaveBeenCalledTimes(1);
    expect(childClick).toHaveBeenCalledTimes(1);
    unmount();
    expect(ref.current).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("keeps controlled onValueChange and native form values", async () => {
    function Controlled(): JSX.Element {
      const [value, setValue] = useState("");
      return (
        <form aria-label='Profile'>
          <Input
            aria-label='Nickname'
            name='nickname'
            value={value}
            onValueChange={setValue}
          />
        </form>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.type(screen.getByRole("textbox", {name: "Nickname"}), "Alex");
    const form = screen.getByRole("form", {name: "Profile"});
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).get("nickname")).toBe("Alex");
  });
  it("renders without crashing", () => {
    render(<Input aria-label='Email' />);

    expect(screen.getByRole("textbox", {name: "Email"})).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();

    render(
      <Input
        ref={ref}
        aria-label='Email'
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("applies custom className alongside default styles", () => {
    render(
      <Input
        aria-label='Email'
        className='custom-input'
      />,
    );

    const input = screen.getByRole("textbox", {name: "Email"});

    expect(input).toHaveClass("custom-input");
    expect(input.className).not.toBe("custom-input");
  });

  it("renders the provided value", () => {
    render(
      <Input
        aria-label='First name'
        defaultValue='Alexandru'
      />,
    );

    expect(screen.getByDisplayValue("Alexandru")).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<(event: ChangeEvent<HTMLInputElement>) => void>();

    render(
      <Input
        aria-label='Email'
        onChange={handleChange}
      />,
    );

    await user.type(screen.getByRole("textbox", {name: "Email"}), "hello");

    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.target.value).toBe("hello");
  });

  it("supports accessible labelling and native attributes", () => {
    render(
      <>
        <label htmlFor='email'>Email address</label>
        <Input
          id='email'
          type='email'
          aria-describedby='email-hint'
        />
        <p id='email-hint'>We will never share your email.</p>
      </>,
    );

    const input = screen.getByLabelText("Email address");

    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("aria-describedby", "email-hint");
  });
});
