import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import {createRef, useState} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it} from "vitest";

import {NativeSelect, NativeSelectOptGroup, NativeSelectOption} from "./native-select";
import * as stories from "./native-select.stories";

function FruitOptions(): React.JSX.Element {
  return (
    <>
      <NativeSelectOption value='pear'>Pear</NativeSelectOption>
      <NativeSelectOption value='apple'>Apple</NativeSelectOption>
      <NativeSelectOption value='orange'>Orange</NativeSelectOption>
    </>
  );
}

function ControlledFruit(): React.JSX.Element {
  const [fruit, setFruit] = useState("pear");

  return (
    <form aria-label='Fruit form'>
      <label htmlFor='controlled-fruit'>Fruit</label>
      <NativeSelect
        id='controlled-fruit'
        name='fruit'
        value={fruit}
        onChange={(event) => setFruit(event.currentTarget.value)}>
        <FruitOptions />
      </NativeSelect>
      <output aria-label='Chosen fruit'>{fruit}</output>
    </form>
  );
}

describe("NativeSelect", () => {
  it("keeps ordinary story layout outside forced-color media while retaining system-color overrides", () => {
    const {Default} = composeStories(stories);
    const {container} = render(<Default />);
    const sheet = container.querySelector("style");
    if (!sheet?.textContent) throw new Error("Expected the mounted native-select story stylesheet");
    const stylesheet = parse(sheet.textContent);
    const layouts: string[] = [];
    stylesheet.walkRules((rule) => {
      if (rule.selector === ".ac-story-native-select-example" || rule.selector === ".ac-story-native-select-exampleActions") {
        expect(rule.parent?.type).toBe("root");
        layouts.push(rule.selector);
      }
    });
    expect(layouts).toEqual([".ac-story-native-select-example", ".ac-story-native-select-exampleActions"]);
    expect(getComputedStyle(screen.getByRole("form", {name: "Native fruit form"})).display).toBe("flex");
    const productionStyles = parse(readFileSync(join(import.meta.dirname, "native-select.module.css"), "utf8"));
    const forced = productionStyles.nodes.find((node) => node.type === "atrule" && node.params === "(forced-colors: active)");
    expect(forced?.toString()).toContain("background-color: Canvas");
    expect(forced?.toString()).toContain("border-color: GrayText");
  });

  it("keeps NativeSelect a native form control", () => {
    render(
      <form aria-label='Fruit form'>
        <NativeSelect
          aria-label='Fruit'
          name='fruit'
          defaultValue='pear'>
          <FruitOptions />
        </NativeSelect>
      </form>,
    );

    const form = screen.getByRole("form", {name: "Fruit form"});
    if (!(form instanceof HTMLFormElement)) throw new TypeError("Expected a native form");

    expect(screen.getByRole("combobox", {name: "Fruit"})).toBeInstanceOf(HTMLSelectElement);
    expect(new FormData(form).get("fruit")).toBe("pear");
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("preserves uncontrolled selection and native change events", async () => {
    const user = userEvent.setup();
    const changes: string[] = [];
    render(
      <form aria-label='Fruit form'>
        <NativeSelect
          aria-label='Fruit'
          name='fruit'
          defaultValue='pear'
          onChange={(event) => changes.push(event.currentTarget.value)}>
          <FruitOptions />
        </NativeSelect>
      </form>,
    );

    const select = screen.getByRole("combobox", {name: "Fruit"});
    await user.selectOptions(select, "orange");

    const form = screen.getByRole("form", {name: "Fruit form"});
    if (!(form instanceof HTMLFormElement)) throw new TypeError("Expected a native form");

    expect(select).toHaveValue("orange");
    expect(changes).toEqual(["orange"]);
    expect(new FormData(form).get("fruit")).toBe("orange");
  });

  it("supports caller-controlled values and labels", async () => {
    const user = userEvent.setup();
    render(<ControlledFruit />);

    const select = screen.getByRole("combobox", {name: "Fruit"});
    expect(screen.getByLabelText("Fruit")).toBe(select);
    await user.selectOptions(select, "apple");

    expect(select).toHaveValue("apple");
    expect(screen.getByRole("status", {name: "Chosen fruit"})).toHaveTextContent("apple");

    const form = screen.getByRole("form", {name: "Fruit form"});
    if (!(form instanceof HTMLFormElement)) throw new TypeError("Expected a native form");
    expect(new FormData(form).get("fruit")).toBe("apple");
  });

  it("preserves required validation until a nonempty value is selected", async () => {
    const user = userEvent.setup();
    render(
      <NativeSelect
        aria-label='Required fruit'
        required
        defaultValue=''>
        <NativeSelectOption value=''>Choose a fruit</NativeSelectOption>
        <FruitOptions />
      </NativeSelect>,
    );

    const select = screen.getByRole("combobox", {name: "Required fruit"});
    if (!(select instanceof HTMLSelectElement)) throw new TypeError("Expected a native select");

    expect(select).toBeRequired();
    expect(select.checkValidity()).toBe(false);
    await user.selectOptions(select, "pear");
    expect(select.checkValidity()).toBe(true);
  });

  it("keeps disabled controls unselectable, unfocusable and natively disabled in their form", async () => {
    const user = userEvent.setup();
    const changes: string[] = [];
    render(
      <form aria-label='Fruit form'>
        <NativeSelect
          aria-label='Fruit'
          name='fruit'
          defaultValue='pear'
          disabled
          onChange={(event) => changes.push(event.currentTarget.value)}>
          <FruitOptions />
        </NativeSelect>
        <button type='button'>Next control</button>
      </form>,
    );

    const select = screen.getByRole("combobox", {name: "Fruit"});
    expect(select).toBeDisabled();
    await user.selectOptions(select, "apple");
    await user.tab();

    expect(select).toHaveValue("pear");
    expect(changes).toEqual([]);
    expect(screen.getByRole("button", {name: "Next control"})).toHaveFocus();

    const form = screen.getByRole("form", {name: "Fruit form"});
    if (!(form instanceof HTMLFormElement)) throw new TypeError("Expected a native form");
    expect(form.elements.namedItem("fruit")).toBe(select);
    if (!(select instanceof HTMLSelectElement)) throw new TypeError("Expected a native select");
    expect(select.disabled).toBe(true);
    expect(select.willValidate).toBe(false);
  });

  it("forwards native attributes and RTL to the select rather than its wrapper", () => {
    render(
      <>
        <form
          id='external-form'
          aria-label='External form'
        />
        <label htmlFor='native-fruit'>Fruit</label>
        <NativeSelect
          id='native-fruit'
          name='fruit'
          form='external-form'
          title='Choose fruit'
          autoComplete='off'
          aria-describedby='fruit-hint'
          aria-invalid='true'
          data-consumer='native'
          dir='rtl'
          defaultValue='pear'>
          <FruitOptions />
        </NativeSelect>
        <p id='fruit-hint'>Choose one fruit.</p>
      </>,
    );

    const select = screen.getByRole("combobox", {name: "Fruit"});
    expect(select).toHaveAttribute("id", "native-fruit");
    expect(select).toHaveAttribute("name", "fruit");
    expect(select).toHaveAttribute("form", "external-form");
    expect(select).toHaveAttribute("title", "Choose fruit");
    expect(select).toHaveAttribute("autocomplete", "off");
    expect(select).toHaveAttribute("dir", "rtl");
    expect(select).toHaveAttribute("data-consumer", "native");
    expect(select).toHaveAccessibleDescription("Choose one fruit.");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.parentElement).not.toHaveAttribute("id");
    expect(select.parentElement).not.toHaveAttribute("name");
  });

  it("preserves keyboard focus, native key events and caller cancellation", async () => {
    const user = userEvent.setup();
    const keys: string[] = [];
    render(
      <>
        <NativeSelect
          aria-label='Fruit'
          defaultValue='pear'
          onKeyDown={(event) => {
            keys.push(event.key);
            if (event.key === "ArrowDown") event.preventDefault();
          }}>
          <FruitOptions />
        </NativeSelect>
        <button type='button'>Next control</button>
      </>,
    );

    const select = screen.getByRole("combobox", {name: "Fruit"});
    await user.tab();
    expect(select).toHaveFocus();
    const arrow = new KeyboardEvent("keydown", {key: "ArrowDown", bubbles: true, cancelable: true});
    expect(select.dispatchEvent(arrow)).toBe(false);
    expect(arrow.defaultPrevented).toBe(true);
    expect(keys).toEqual(["ArrowDown"]);
    await user.tab();
    expect(screen.getByRole("button", {name: "Next control"})).toHaveFocus();
  });

  it("forwards the ref to the native select for imperative focus", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <NativeSelect
        ref={ref}
        aria-label='Fruit'>
        <FruitOptions />
      </NativeSelect>,
    );

    expect(ref.current).toBe(screen.getByRole("combobox", {name: "Fruit"}));
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    ref.current?.focus();
    expect(screen.getByRole("combobox", {name: "Fruit"})).toHaveFocus();
  });

  it("merges caller layout classes on the wrapper and keeps the chevron decorative", () => {
    render(
      <NativeSelect
        aria-label='Fruit'
        className='consumer-layout'>
        <FruitOptions />
      </NativeSelect>,
    );

    const select = screen.getByRole("combobox", {name: "Fruit"});
    const wrapper = select.parentElement;
    expect(wrapper).toHaveClass("consumer-layout");
    expect(wrapper?.className).not.toBe("consumer-layout");
    expect(select.className).not.toBe("");
    expect(select).not.toHaveClass("consumer-layout");
    expect(wrapper).toHaveAttribute("data-slot", "native-select-wrapper");
    expect(select).toHaveAttribute("data-slot", "native-select");

    const icon = wrapper?.querySelector("svg");
    expect(icon).toHaveAttribute("data-slot", "native-select-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("focusable", "false");
    expect(icon?.getAttribute("class")).toBeTruthy();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["sm", "default"] as const)("keeps logical %s sizing separate from native row count", (size) => {
    render(
      <NativeSelect
        aria-label='Fruit'
        size={size}>
        <FruitOptions />
      </NativeSelect>,
    );

    const select = screen.getByRole("combobox", {name: "Fruit"});
    expect(select).toHaveAttribute("data-size", size);
    expect(select.parentElement).toHaveAttribute("data-size", size);
    expect(select).not.toHaveAttribute("size");
  });

  it("defaults to the default logical size", () => {
    render(
      <NativeSelect aria-label='Fruit'>
        <FruitOptions />
      </NativeSelect>,
    );

    const select = screen.getByRole("combobox", {name: "Fruit"});
    expect(select).toHaveAttribute("data-size", "default");
    expect(select.parentElement).toHaveAttribute("data-size", "default");
  });

  it("preserves native optgroups, option attributes, classes and refs", async () => {
    const user = userEvent.setup();
    const groupRef = createRef<HTMLOptGroupElement>();
    const optionRef = createRef<HTMLOptionElement>();
    render(
      <NativeSelect
        aria-label='Fruit'
        defaultValue='pear'>
        <NativeSelectOptGroup
          ref={groupRef}
          label='Available fruit'
          className='consumer-group'>
          <NativeSelectOption
            ref={optionRef}
            value='pear'
            label='Fresh pear'
            title='In season'
            className='consumer-option'>
            Pear
          </NativeSelectOption>
          <NativeSelectOption
            value='apple'
            disabled>
            Apple
          </NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup
          label='Unavailable fruit'
          disabled>
          <NativeSelectOption value='orange'>Orange</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>,
    );

    const select = screen.getByRole("combobox", {name: "Fruit"});
    const group = screen.getByRole("group", {name: "Available fruit"});
    const option = within(group).getByRole("option", {name: "Pear"});
    expect(groupRef.current).toBe(group);
    expect(group).toBeInstanceOf(HTMLOptGroupElement);
    expect(group).toHaveClass("consumer-group");
    expect(group.className).not.toBe("consumer-group");
    expect(group).toHaveAttribute("data-slot", "native-select-optgroup");
    expect(optionRef.current).toBe(option);
    expect(option).toBeInstanceOf(HTMLOptionElement);
    expect(option).toHaveClass("consumer-option");
    expect(option.className).not.toBe("consumer-option");
    expect(option).toHaveAttribute("data-slot", "native-select-option");
    expect(option).toHaveAttribute("title", "In season");
    expect(option).toHaveAttribute("label", "Fresh pear");
    expect(option).toHaveAttribute("value", "pear");
    if (!(option instanceof HTMLOptionElement)) throw new TypeError("Expected a native option");
    expect(option.selected).toBe(true);

    await user.selectOptions(select, "apple");
    expect(select).toHaveValue("pear");
    await user.selectOptions(select, "orange");
    expect(select).toHaveValue("pear");
    expect(screen.getByRole("group", {name: "Unavailable fruit"})).toBeDisabled();
  });

  it("supports native multiple selection with all selected options in its form", async () => {
    const user = userEvent.setup();
    render(
      <form aria-label='Fruit form'>
        <NativeSelect
          aria-label='Fruit'
          name='fruit'
          multiple
          defaultValue={["pear"]}>
          <FruitOptions />
        </NativeSelect>
      </form>,
    );

    const select = screen.getByRole("listbox", {name: "Fruit"});
    await user.selectOptions(select, ["apple", "orange"]);
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(select).toHaveValue(["pear", "apple", "orange"]);

    const form = screen.getByRole("form", {name: "Fruit form"});
    if (!(form instanceof HTMLFormElement)) throw new TypeError("Expected a native form");
    expect(form.elements.namedItem("fruit")).toBe(select);
    if (!(select instanceof HTMLSelectElement)) throw new TypeError("Expected a native select");
    expect(Array.from(select.selectedOptions, (option) => option.value)).toEqual(["pear", "apple", "orange"]);
  });

  it("renders native markup on the server without a client context", () => {
    const markup = renderToStaticMarkup(
      <form>
        <label htmlFor='server-fruit'>Fruit</label>
        <NativeSelect
          id='server-fruit'
          name='fruit'
          defaultValue='pear'>
          <NativeSelectOptGroup label='Fruit'>
            <FruitOptions />
          </NativeSelectOptGroup>
        </NativeSelect>
      </form>,
    );

    const document = new DOMParser().parseFromString(markup, "text/html");
    const select = document.querySelector("select");
    expect(select).toHaveAttribute("name", "fruit");
    expect(select?.querySelector("option[selected]")).toHaveAttribute("value", "pear");
    expect(select?.querySelector("optgroup")).toHaveAttribute("label", "Fruit");
    expect(select?.labels?.item(0)).toHaveTextContent("Fruit");
  });
});
