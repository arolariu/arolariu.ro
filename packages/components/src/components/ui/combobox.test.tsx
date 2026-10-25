import {Combobox as BaseCombobox} from "@base-ui/react/combobox";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "./combobox";
import styles from "./combobox.module.css";
import * as stories from "./combobox.stories";

/**
 * Authored top-level declarations of the empty block's rules that apply to `element`, in source order. `:empty` is resolved
 * per Selectors (no child nodes but comments) because Happy DOM also matches it on elements that only contain text.
 */
function emptyBlockDeclarations(element: Element): Map<string, string> {
  expect(element).toHaveClass(styles.empty ?? "empty");
  const isEmpty = [...element.childNodes].every((node) => node.nodeType === Node.COMMENT_NODE);
  const declarations = new Map<string, string>();
  parse(readFileSync(join(import.meta.dirname, "combobox.module.css"), "utf8")).walkRules((rule) => {
    if (
      rule.parent?.type !== "root"
      || !rule.selectors.some((selector) => selector === ".empty" || (selector === ".empty:empty" && isEmpty))
    )
      return;
    rule.walkDecls((declaration) => {
      declarations.set(declaration.prop, declaration.value);
    });
  });
  return declarations;
}

describe("Combobox responsive story", () => {
  it("caps the Default demo width by the viewport after centered-canvas and theme gutters", () => {
    const {Default} = composeStories(stories);
    const {container} = render(<Default />);
    const input = screen.getByRole("combobox", {name: "Fruit"});
    expect(input.closest(".ac-story-combobox-story")).toBeInTheDocument();
    const mountedStyles = [...container.querySelectorAll("style")].find((style) => style.textContent?.includes(".ac-story-combobox-story"));
    if (!mountedStyles) throw new Error("The Combobox story must mount its own responsive styles.");

    // Assert the authored layout contract, not browser geometry simulated by Happy DOM.
    const rules = parse(mountedStyles.textContent ?? "");
    let width: string | undefined;
    rules.walkRules(".ac-story-combobox-story", (rule) => {
      rule.walkDecls("width", (declaration) => {
        width = declaration.value;
      });
    });
    expect(width).toBe("min(20rem, calc(100vw - 4rem))");
  });
});

interface Fruit {
  readonly value: string;
  readonly label: string;
}

describe("Combobox naming defaults", () => {
  it.each([
    ["trigger", "Show suggestions", "Afficher les suggestions"],
    ["clear", "Clear selection", "Effacer la sélection"],
    ["remove", "Remove selection", "Retirer la sélection"],
  ] as const)("honors absent and explicitly undefined aria-label on the generated %s button", (action, defaultName, title) => {
    type ControlProps = Pick<React.ComponentProps<"button">, "aria-label" | "title"> & {render?: React.ReactElement};
    const picker = (controlProps: ControlProps): React.JSX.Element =>
      action === "remove" ? (
        <Combobox
          multiple
          items={["Apple"]}
          defaultValue={["Apple"]}>
          <ComboboxChips>
            <ComboboxChip removeProps={controlProps}>Apple</ComboboxChip>
            <ComboboxChipsInput aria-label='Fruits' />
          </ComboboxChips>
        </Combobox>
      ) : (
        <Combobox
          items={["Apple"]}
          defaultValue='Apple'>
          <ComboboxInput
            aria-label='Fruit'
            showTrigger={action === "trigger"}
            showClear={action === "clear"}
            triggerProps={controlProps}
            clearProps={controlProps}
          />
        </Combobox>
      );
    const {rerender} = render(picker({title}));
    expect(screen.getByRole("button", {name: defaultName})).toHaveAttribute("aria-label", defaultName);

    rerender(picker({"aria-label": undefined, title}));
    const button = screen.getByRole("button", {name: title});
    expect(button).not.toHaveAttribute("aria-label");
    expect(button).toHaveAttribute("title", title);
    expect(button.tagName).toBe("BUTTON");
    expect(screen.queryByRole("button", {name: defaultName})).not.toBeInTheDocument();

    rerender(picker({"aria-label": `Localized ${action}`, title}));
    expect(screen.getByRole("button", {name: `Localized ${action}`})).toBeInTheDocument();

    rerender(picker({"aria-label": undefined, title, render: <button aria-label={`Rendered ${action}`} />}));
    expect(screen.getByRole("button", {name: `Rendered ${action}`})).toBeInTheDocument();
  });

  it("uses a custom trigger callback's visible label rather than masking it with the icon fallback name", () => {
    render(
      <Combobox items={["Apple"]}>
        <ComboboxInput
          showTrigger={false}
          aria-label='Fruit'
        />
        <ComboboxTrigger render={(props) => <button {...props}>Choose fruit</button>} />
      </Combobox>,
    );
    expect(screen.getByRole("button", {name: "Choose fruit"})).toBeInTheDocument();
  });

  it("uses custom clear text in the accessible name", () => {
    render(
      <Combobox
        items={["Apple"]}
        defaultValue='Apple'>
        <ComboboxInput
          aria-label='Fruit'
          showTrigger={false}
          showClear
          clearProps={{children: "Reset fruit"}}
        />
      </Combobox>,
    );
    expect(screen.getByRole("button", {name: "Reset fruit"})).toBeInTheDocument();
  });

  it("uses custom removal text in the accessible name", () => {
    render(
      <Combobox
        multiple
        items={["Apple"]}
        defaultValue={["Apple"]}>
        <ComboboxChips>
          <ComboboxChip removeProps={{children: "Remove Apple"}}>Apple</ComboboxChip>
          <ComboboxChipsInput aria-label='Fruits' />
        </ComboboxChips>
      </Combobox>,
    );
    expect(screen.getByRole("button", {name: "Remove Apple"})).toBeInTheDocument();
  });

  it("names a standalone icon-only trigger and lets callers localize its action", () => {
    const {rerender} = render(
      <Combobox items={["Apple"]}>
        <ComboboxInput
          showTrigger={false}
          aria-label='Fruit'
        />
        <ComboboxTrigger />
      </Combobox>,
    );
    expect(screen.getByRole("button", {name: "Show suggestions"})).toBeInTheDocument();
    rerender(
      <Combobox items={["Apple"]}>
        <ComboboxInput
          showTrigger={false}
          aria-label='Fruit'
        />
        <ComboboxTrigger aria-label='Afficher les suggestions' />
      </Combobox>,
    );
    expect(screen.getByRole("button", {name: "Afficher les suggestions"})).toBeInTheDocument();
  });

  it("preserves localizable clear action naming", () => {
    render(
      <Combobox
        items={["Apple"]}
        defaultValue='Apple'>
        <ComboboxInput
          showTrigger={false}
          showClear
          clearProps={{"aria-label": "Effacer la sélection"}}
          aria-label='Fruit'
        />
      </Combobox>,
    );
    expect(screen.getByRole("button", {name: "Effacer la sélection"})).toBeInTheDocument();
  });
});

const apple: Fruit = {value: "apple", label: "Apple"};
const pear: Fruit = {value: "pear", label: "Pear"};
const items = [apple, pear];

function FruitOptions(): React.JSX.Element {
  return (
    <ComboboxList>
      {(item: Fruit) => (
        <ComboboxItem
          key={item.value}
          value={item}>
          {item.label}
        </ComboboxItem>
      )}
    </ComboboxList>
  );
}

function FruitPicker(props: Readonly<Combobox.Props<Fruit>>): React.JSX.Element {
  return (
    <Combobox
      items={items}
      {...props}>
      <ComboboxInput
        aria-label='Fruit'
        showClear
      />
      <ComboboxContent>
        <FruitOptions />
        <ComboboxEmpty>No results</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

function MultiplePicker(props: Readonly<Combobox.Props<Fruit, true>>): React.JSX.Element {
  const anchor = useComboboxAnchor();
  return (
    <Combobox
      multiple
      items={items}
      {...props}>
      <ComboboxChips
        ref={anchor}
        data-testid='chips'>
        <ComboboxValue>
          {(selected: readonly Fruit[]) =>
            selected.map((item) => (
              <ComboboxChip
                key={item.value}
                data-testid={`chip-${item.value}`}
                removeProps={{"aria-label": `Remove ${item.label}`}}>
                {item.label}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput aria-label='Fruits' />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <FruitOptions />
        <ComboboxEmpty>No results</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

function ControlledPicker(): React.JSX.Element {
  const [value, setValue] = React.useState<Fruit | null>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <FruitPicker
        value={value}
        onValueChange={setValue}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        open={open}
        onOpenChange={setOpen}
      />
      <output aria-label='Selected'>{value?.value ?? "none"}</output>
      <output aria-label='Query'>{inputValue}</output>
      <output aria-label='Open'>{String(open)}</output>
    </>
  );
}

function resolvedFlightRender(element: React.ReactElement): React.ReactElement {
  // Model the opaque resolved Flight boundary; production resolves it with React's public Children API.
  const transport = {
    ...element,
    $$typeof: Symbol.for("react.lazy"),
    _payload: element,
    _init: (payload: React.ReactElement): React.ReactElement => payload,
  };
  for (const field of ["props", "type", "key", "ref"]) Reflect.deleteProperty(transport, field);
  return transport;
}

describe("Combobox", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("directly preserves the installed Root and Value contracts", () => {
    expectTypeOf(Combobox).toEqualTypeOf(BaseCombobox.Root);
    expectTypeOf(ComboboxValue).toEqualTypeOf(BaseCombobox.Value);
    expect(Combobox).toBe(BaseCombobox.Root);
    expect(ComboboxValue).toBe(BaseCombobox.Value);
  });

  it("displays Apple before opening using root metadata and ComboboxValue", () => {
    render(
      <Combobox
        items={items}
        defaultValue={apple}>
        <ComboboxTrigger aria-label='Selected fruit'>
          <ComboboxValue placeholder='Choose fruit' />
        </ComboboxTrigger>
        <ComboboxContent>
          <FruitOptions />
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByRole("combobox", {name: "Selected fruit"})).toHaveTextContent("Apple");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("updates a controlled selected label without ever opening the popup", () => {
    const view = (value: Fruit): React.JSX.Element => (
      <Combobox
        items={items}
        value={value}>
        <ComboboxTrigger aria-label='Selected fruit'>
          <ComboboxValue />
        </ComboboxTrigger>
        <ComboboxContent>
          <FruitOptions />
        </ComboboxContent>
      </Combobox>
    );
    const {rerender} = render(view(apple));
    expect(screen.getByRole("combobox")).toHaveTextContent("Apple");
    rerender(view(pear));
    expect(screen.getByRole("combobox")).toHaveTextContent("Pear");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("updates object metadata labels without registering mounted items", () => {
    const view = (label: string): React.JSX.Element => (
      <Combobox
        items={[{value: "apple", label}]}
        value={{value: "apple", label}}
        isItemEqualToValue={(a, b) => a.value === b.value}>
        <ComboboxTrigger aria-label='Selected fruit'>
          <ComboboxValue />
        </ComboboxTrigger>
      </Combobox>
    );
    const {rerender} = render(view("Apple"));
    expect(screen.getByRole("combobox")).toHaveTextContent("Apple");
    rerender(view("Fresh Apple"));
    expect(screen.getByRole("combobox")).toHaveTextContent("Fresh Apple");
  });

  it("provides an editable input, trigger, clear control and caller-owned input children", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        items={items}
        defaultValue={apple}>
        <ComboboxInput
          aria-label='Fruit'
          showClear>
          <span>Extra addon</span>
        </ComboboxInput>
        <ComboboxContent>
          <FruitOptions />
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByRole("combobox", {name: "Fruit"})).toHaveValue("Apple");
    expect(screen.getByText("Extra addon")).toBeVisible();
    expect(screen.getByRole("button", {name: "Show suggestions"})).toHaveAttribute("type", "button");
    await user.click(screen.getByRole("button", {name: "Clear selection"}));
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("selects an object value and retains selected ARIA when reopening", async () => {
    const user = userEvent.setup();
    const changes: Array<Fruit | null> = [];
    render(<FruitPicker onValueChange={(value) => changes.push(value)} />);
    await user.click(screen.getByRole("button", {name: "Show suggestions"}));
    await user.click(await screen.findByRole("option", {name: "Apple"}));
    expect(changes).toEqual([apple]);
    expect(screen.getByRole("combobox")).toHaveValue("Apple");
    await user.click(screen.getByRole("button", {name: "Show suggestions"}));
    expect(await screen.findByRole("option", {name: "Apple"})).toHaveAttribute("aria-selected", "true");
  });

  it("retains selected ARIA when externally filtered items unmount and recover", async () => {
    const view = (filteredItems: readonly Fruit[]): React.JSX.Element => (
      <FruitPicker
        open
        value={apple}
        inputValue=''
        filteredItems={filteredItems}
      />
    );
    const {rerender} = render(view(items));
    expect(await screen.findByRole("option", {name: "Apple"})).toHaveAttribute("aria-selected", "true");
    rerender(view([pear]));
    expect(screen.queryByRole("option", {name: "Apple"})).not.toBeInTheDocument();
    rerender(view(items));
    expect(await screen.findByRole("option", {name: "Apple"})).toHaveAttribute("aria-selected", "true");
  });

  it("uses explicit clear instead of clearing on single-value reselect", async () => {
    const user = userEvent.setup();
    const changes: Array<Fruit | null> = [];
    render(
      <FruitPicker
        defaultValue={apple}
        onValueChange={(value) => changes.push(value)}
      />,
    );
    await user.click(screen.getByRole("button", {name: "Show suggestions"}));
    await user.click(await screen.findByRole("option", {name: "Apple"}));
    expect(screen.getByRole("combobox")).toHaveValue("Apple");
    expect(changes).not.toContain(null);
    await user.click(screen.getByRole("button", {name: "Clear selection"}));
    expect(changes.at(-1)).toBeNull();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("blocks selection when the root becomes disabled with its popup already open", async () => {
    const changes: Array<Fruit | null> = [];
    const view = (disabled: boolean): React.JSX.Element => (
      <FruitPicker
        open
        disabled={disabled}
        onValueChange={(value) => changes.push(value)}
      />
    );
    const {rerender} = render(view(false));
    expect(await screen.findByRole("option", {name: "Apple"})).not.toHaveAttribute("aria-disabled", "true");
    rerender(view(true));
    const option = screen.getByRole("option", {name: "Apple"});
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(option).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(option);
    expect(changes).toEqual([]);
  });

  it("keeps a disabled default-open root inert", async () => {
    const changes: Array<Fruit | null> = [];
    render(
      <FruitPicker
        disabled
        defaultOpen
        onValueChange={(value) => changes.push(value)}
      />,
    );
    fireEvent.click(await screen.findByRole("option", {name: "Apple"}));
    expect(changes).toEqual([]);
    expect(screen.getByLabelText("Show suggestions")).toBeDisabled();
  });

  it("preserves read-only behavior while open", async () => {
    const changes: Array<Fruit | null> = [];
    render(
      <FruitPicker
        readOnly
        open
        defaultValue={apple}
        onValueChange={(value) => changes.push(value)}
      />,
    );
    fireEvent.click(await screen.findByRole("option", {name: "Pear"}));
    fireEvent.click(screen.getByLabelText("Clear selection"));
    expect(screen.getByRole("combobox")).toHaveValue("Apple");
    expect(changes).toEqual([]);
  });

  it("supports controlled value, input and open state independently", async () => {
    const user = userEvent.setup();
    render(<ControlledPicker />);
    await user.type(screen.getByRole("combobox"), "pea");
    expect(screen.getByLabelText("Query")).toHaveTextContent("pea");
    expect(screen.getByLabelText("Open")).toHaveTextContent("true");
    await user.click(await screen.findByRole("option", {name: "Pear"}));
    expect(screen.getByLabelText("Selected")).toHaveTextContent("pear");
    expect(screen.getByLabelText("Open")).toHaveTextContent("false");
    expect(screen.getByRole("combobox")).toHaveValue("Pear");
  });

  it("passes cancellable value and open details to the root owner", async () => {
    const user = userEvent.setup();
    render(<FruitPicker onValueChange={(_value, details) => details.cancel()} />);
    await user.click(screen.getByRole("button", {name: "Show suggestions"}));
    await user.click(await screen.findByRole("option", {name: "Pear"}));
    expect(screen.getByRole("combobox")).toHaveValue("");
    cleanup();
    render(<FruitPicker onOpenChange={(_open, details) => details.cancel()} />);
    await user.click(screen.getByRole("button", {name: "Show suggestions"}));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps input change cancellation owned by Root rather than the underlying Input wrapper", async () => {
    const user = userEvent.setup();
    const reasons: Combobox.ChangeEventReason[] = [];
    render(
      <FruitPicker
        onInputValueChange={(_value, details) => {
          reasons.push(details.reason);
          details.cancel();
        }}
      />,
    );
    await user.type(screen.getByRole("combobox"), "pea");
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(reasons).toEqual(["input-change", "input-change", "input-change"]);
  });

  it("filters with no duplicate empty blocks and recovers after a miss", async () => {
    const user = userEvent.setup();
    render(<FruitPicker />);
    await user.type(screen.getByRole("combobox"), "xyz");
    expect(await screen.findByText("No results")).toBeVisible();
    expect(screen.getAllByText("No results")).toHaveLength(1);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "pea");
    expect(await screen.findByRole("option", {name: "Pear"})).toBeVisible();
    expect(screen.queryByText("No results")).not.toBeInTheDocument();
  });

  it("keeps ComboboxEmpty's polite status root mounted, toggling only its children, with no padding while it is empty", async () => {
    const user = userEvent.setup();
    render(<FruitPicker />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    expect(await screen.findByRole("option", {name: "Apple"})).toBeVisible();
    // Base UI keeps the live region mounted while results exist, so the later message is a content change.
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-slot", "combobox-empty");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toBeEmptyDOMElement();
    // The always-mounted root must not add a blank band below the results.
    expect(emptyBlockDeclarations(status).get("padding")).toBe("0");
    await user.type(input, "xyz");
    expect(await screen.findByText("No results")).toBe(status);
    expect(screen.getByRole("status")).toBe(status);
    expect(emptyBlockDeclarations(status).get("padding")).toBe("var(--ac-space-6) var(--ac-space-4)");
    await user.clear(input);
    expect(await screen.findByRole("option", {name: "Apple"})).toBeVisible();
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toBeEmptyDOMElement();
  });

  it("delegates grouped filtering to Collection and recovers the group labels", async () => {
    const user = userEvent.setup();
    const groups = [
      {value: "first", label: "Orchard", items: [apple]},
      {value: "second", label: "Garden", items: [pear]},
    ];
    render(
      <Combobox items={groups}>
        <ComboboxInput aria-label='Fruit' />
        <ComboboxContent>
          <ComboboxList>
            {(group: (typeof groups)[number]) => (
              <ComboboxGroup
                key={group.value}
                items={group.items}>
                <ComboboxLabel>{group.label}</ComboboxLabel>
                <ComboboxCollection>
                  {(item: Fruit) => (
                    <ComboboxItem
                      key={item.value}
                      value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
          <ComboboxSeparator />
          <ComboboxEmpty>No grouped results</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>,
    );
    await user.type(screen.getByRole("combobox"), "pea");
    expect(await screen.findByRole("group", {name: "Garden"})).toBeVisible();
    expect(screen.queryByRole("group", {name: "Orchard"})).not.toBeInTheDocument();
    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "xyz");
    expect(await screen.findByText("No grouped results")).toBeVisible();
    await user.clear(screen.getByRole("combobox"));
    expect(await screen.findByRole("group", {name: "Orchard"})).toBeVisible();
    expect(screen.getByRole("group", {name: "Garden"})).toBeVisible();
  });

  it("navigates disabled options without selecting them and restores input focus on Escape", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={items}>
        <ComboboxInput aria-label='Fruit' />
        <ComboboxContent>
          <ComboboxList>
            {(item: Fruit) => (
              <ComboboxItem
                key={item.value}
                value={item}
                disabled={item.value === "apple"}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await screen.findByRole("option", {name: "Pear"});
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(screen.getByRole("option", {name: "Apple"})).toHaveAttribute("data-highlighted"));
    await user.keyboard("{Enter}");
    expect(input).toHaveValue("");
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(screen.getByRole("option", {name: "Pear"})).toHaveAttribute("data-highlighted"));
    await user.keyboard("{Enter}");
    expect(input).toHaveValue("Pear");
    await user.click(screen.getByRole("button", {name: "Show suggestions"}));
    await user.keyboard("{Escape}");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("serializes object values for native forms and honors root disabled submission", () => {
    const view = (disabled: boolean): React.JSX.Element => (
      <form data-testid='form'>
        <FruitPicker
          name='fruit'
          defaultValue={apple}
          disabled={disabled}
        />
      </form>
    );
    const {rerender} = render(view(false));
    const form = screen.getByTestId("form");
    expect(form).toBeInstanceOf(HTMLFormElement);
    if (!(form instanceof HTMLFormElement)) throw new Error("Missing form");
    expect(new FormData(form).get("fruit")).toBe("apple");
    rerender(view(true));
    expect(new FormData(form).has("fruit")).toBe(false);
  });

  it("submits each multiple object value and respects controlled readonly selections", async () => {
    const user = userEvent.setup();
    const selected: readonly Fruit[] = [apple, pear];
    const changes: Fruit[][] = [];
    render(
      <form data-testid='multiple-form'>
        <MultiplePicker
          name='fruit'
          value={selected}
          onValueChange={(value) => changes.push(value)}
        />
      </form>,
    );
    const form = screen.getByTestId("multiple-form");
    if (!(form instanceof HTMLFormElement)) throw new Error("Missing form");
    expect(new FormData(form).getAll("fruit")).toEqual(["apple", "pear"]);
    await user.click(screen.getByRole("button", {name: "Remove Pear"}));
    expect(changes).toEqual([[apple]]);
    expect(screen.getByTestId("chip-pear")).toHaveTextContent("Pear");
    expect(new FormData(form).getAll("fruit")).toEqual(["apple", "pear"]);
  });

  it("preserves all three Root generics with createItems-derived values", async () => {
    const user = userEvent.setup();
    const collection = BaseCombobox.createItems(items, {getValue: (item) => item.value, getLabel: (item) => item.label});
    const changes: Array<string | null> = [];
    render(
      <Combobox<string, false, Fruit>
        items={collection}
        onValueChange={(value) => changes.push(value)}>
        <ComboboxInput aria-label='Fruit' />
        <ComboboxContent>
          <ComboboxList>
            {(item: Fruit) => (
              <ComboboxItem
                key={item.value}
                value={item.value}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    await user.click(screen.getByRole("button", {name: "Show suggestions"}));
    await user.click(await screen.findByRole("option", {name: "Pear"}));
    expect(changes).toEqual(["pear"]);
    expect(screen.getByRole("combobox")).toHaveValue("Pear");
  });

  it("handles number values without string casts", async () => {
    const user = userEvent.setup();
    const changes: Array<number | null> = [];
    render(
      <Combobox<number>
        items={[1, 2]}
        onValueChange={(value) => changes.push(value)}>
        <ComboboxInput aria-label='Number' />
        <ComboboxContent>
          <ComboboxList>
            {(value: number) => (
              <ComboboxItem
                key={value}
                value={value}>
                {value}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    await user.click(screen.getByRole("button", {name: "Show suggestions"}));
    await user.click(await screen.findByRole("option", {name: "2"}));
    expect(changes).toEqual([2]);
  });

  it("retains readonly multiple input and mutable array output, removes chips and focuses the input", async () => {
    const user = userEvent.setup();
    const initial: readonly Fruit[] = [apple];
    const changes: Fruit[][] = [];
    render(
      <MultiplePicker
        defaultValue={initial}
        onValueChange={(value) => changes.push(value)}
      />,
    );
    expect(screen.getByTestId("chip-apple")).toHaveTextContent("Apple");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", {name: "Pear"}));
    expect(changes.at(-1)).toEqual([apple, pear]);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", {name: "Remove Apple"}));
    expect(changes.at(-1)).toEqual([pear]);
    expect(screen.queryByTestId("chip-apple")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("supports cancellable chip removal and optional remove controls", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        multiple
        items={items}
        defaultValue={[apple]}
        onValueChange={(_value, details) => details.cancel()}>
        <ComboboxChips>
          <ComboboxChip>Apple</ComboboxChip>
          <ComboboxChip showRemove={false}>Static</ComboboxChip>
          <ComboboxChipsInput aria-label='Fruits' />
        </ComboboxChips>
      </Combobox>,
    );
    expect(screen.getAllByRole("button", {name: "Remove selection"})).toHaveLength(1);
    await user.click(screen.getByRole("button", {name: "Remove selection"}));
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  it("honors explicit null content on clear and chip removal controls", () => {
    render(
      <>
        <Combobox
          items={items}
          defaultValue={apple}>
          <ComboboxInput
            aria-label='Fruit'
            showTrigger={false}
            showClear
            clearProps={{children: null}}
          />
        </Combobox>
        <Combobox
          items={items}
          multiple
          defaultValue={[apple]}>
          <ComboboxChips>
            <ComboboxChip removeProps={{children: null}}>Apple</ComboboxChip>
            <ComboboxChipsInput aria-label='Fruits' />
          </ComboboxChips>
        </Combobox>
      </>,
    );
    expect(screen.getByRole("button", {name: "Clear selection"}).querySelector("svg")).toBeNull();
    expect(screen.getByRole("button", {name: "Remove selection"}).querySelector("svg")).toBeNull();
    expect(screen.queryByLabelText("Show suggestions")).not.toBeInTheDocument();
  });

  it("keeps clear visibility and removal disabled callbacks owned by their actual primitives", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Combobox
          items={items}
          defaultValue={apple}>
          <ComboboxInput
            aria-label='Fruit'
            showClear
            clearProps={{
              "aria-label": "Clear selection",
              keepMounted: true,
              className: (state) => (state.visible ? "clear-visible" : "clear-hidden"),
              render: (props, state) => (
                <button
                  {...props}
                  data-clear-visible={String(state.visible)}
                />
              ),
            }}
          />
        </Combobox>
        <Combobox
          items={items}
          multiple
          defaultValue={[apple]}
          disabled>
          <ComboboxChips>
            <ComboboxChip
              removeProps={{
                "aria-label": "Remove selection",
                className: (state) => (state.disabled ? "remove-disabled" : "remove-enabled"),
                render: (props, state) => (
                  <button
                    {...props}
                    data-remove-disabled={String(state.disabled)}
                  />
                ),
              }}>
              Apple
            </ComboboxChip>
            <ComboboxChipsInput aria-label='Fruits' />
          </ComboboxChips>
        </Combobox>
      </>,
    );
    const clear = screen.getByRole("button", {name: "Clear selection"});
    expect(clear).toHaveClass("clear-visible");
    expect(clear).toHaveAttribute("data-clear-visible", "true");
    expect(screen.getByRole("button", {name: "Remove selection"})).toHaveClass("remove-disabled");
    expect(screen.getByRole("button", {name: "Remove selection"})).toHaveAttribute("data-remove-disabled", "true");
    await user.click(clear);
    await waitFor(() => expect(clear).toHaveAttribute("data-clear-visible", "false"));
    expect(clear).toHaveClass("clear-hidden");
  });

  it("disables chip removal with the root, including an open list", () => {
    const changes: Fruit[][] = [];
    render(
      <MultiplePicker
        disabled
        open
        defaultValue={[apple]}
        onValueChange={(value) => changes.push(value)}
      />,
    );
    const remove = within(screen.getByTestId("chip-apple")).getByRole("button", {hidden: true});
    expect(remove).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(remove);
    expect(changes).toEqual([]);
    expect(screen.getByLabelText("Fruits")).toBeDisabled();
  });

  it("preserves primitive-owned Input and Trigger callback state and classes", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={items}>
        <ComboboxInput
          aria-label='Fruit'
          showTrigger={false}
          groupClassName='input-shell'
          className={(state) => (state.open ? "input-open" : "input-closed")}
          render={(props, state) => (
            <input
              {...props}
              data-callback-open={String(state.open)}
            />
          )}
        />
        <ComboboxTrigger
          aria-label='Suggestions'
          className={(state) => (state.open ? "trigger-open" : "trigger-closed")}
          render={(props, state) => (
            <button
              {...props}
              data-callback-open={String(state.open)}
            />
          )}
        />
        <ComboboxContent>
          <FruitOptions />
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByRole("combobox")).toHaveClass("input-closed");
    expect(screen.getByRole("combobox").parentElement).toHaveClass("input-shell");
    await user.click(screen.getByRole("button", {name: "Suggestions"}));
    expect(screen.getByRole("combobox")).toHaveClass("input-open");
    expect(screen.getByLabelText("Suggestions")).toHaveClass("trigger-open");
    expect(screen.getByRole("combobox")).toHaveAttribute("data-callback-open", "true");
  });

  it("forwards control refs, caller trigger/clear content and native handler cancellation", async () => {
    const user = userEvent.setup();
    const inputRef = React.createRef<HTMLInputElement>();
    const triggerRef = React.createRef<HTMLButtonElement>();
    const clearRef = React.createRef<HTMLButtonElement>();
    const calls: string[] = [];
    render(
      <Combobox
        items={items}
        defaultValue={apple}>
        <ComboboxInput
          ref={inputRef}
          aria-label='Fruit'
          showClear
          triggerProps={{
            ref: triggerRef,
            "aria-label": "Custom suggestions",
            render: <button onClick={() => calls.push("child")}>Choose</button>,
            onMouseDown: (event) => {
              event.preventDefault();
              event.preventBaseUIHandler();
            },
            onClick: () => calls.push("wrapper"),
          }}
          clearProps={{
            ref: clearRef,
            "aria-label": "Custom clear",
            render: <button>Reset</button>,
            onClick: (event) => {
              event.preventDefault();
              event.preventBaseUIHandler();
            },
          }}
        />
        <ComboboxContent>
          <FruitOptions />
        </ComboboxContent>
      </Combobox>,
    );
    const trigger = screen.getByRole("button", {name: "Custom suggestions"});
    expect(trigger).toHaveTextContent("Choose");
    expect(trigger.querySelector("[data-slot=combobox-trigger-icon]")).toBeInTheDocument();
    expect(inputRef.current).toBe(screen.getByRole("combobox"));
    expect(triggerRef.current).toBe(trigger);
    expect(clearRef.current).toBe(screen.getByRole("button", {name: "Custom clear"}));
    expect(clearRef.current).toHaveTextContent("Reset");
    await user.click(trigger);
    expect(calls).toEqual(["child", "wrapper"]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Custom clear"}));
    expect(screen.getByRole("combobox")).toHaveValue("Apple");
  });

  it("preserves opaque Flight trigger/item/chip children, wrapper refs and child ref cleanup", async () => {
    const user = userEvent.setup();
    const wrapperRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const itemRef = React.createRef<HTMLDivElement>();
    const chipRef = React.createRef<HTMLDivElement>();
    const refCleanup = vi.fn();
    const transport = resolvedFlightRender(<button ref={childRef}>Flight suggestions</button>);
    expect(React.isValidElement(transport)).toBe(false);
    const {unmount} = render(
      <Combobox
        items={items}
        multiple
        defaultValue={[apple]}>
        <ComboboxTrigger
          ref={wrapperRef}
          render={transport}
        />
        <ComboboxChips>
          <ComboboxChip
            ref={chipRef}
            render={resolvedFlightRender(<div>Apple chip</div>)}
            removeProps={{render: resolvedFlightRender(<button>Delete</button>)}}
          />
          <ComboboxChipsInput aria-label='Fruits' />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem
              ref={itemRef}
              value={apple}
              render={resolvedFlightRender(<div ref={(_node) => refCleanup}>Apple</div>)}
            />
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    const trigger = screen.getByRole("button", {name: "Flight suggestions"});
    expect(wrapperRef.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(chipRef.current).toHaveTextContent("Apple chip");
    expect(screen.getByRole("button", {name: "Delete"})).toHaveTextContent("Delete");
    expect(screen.getByRole("button", {name: "Delete"})).not.toHaveAttribute("aria-label");
    await user.click(trigger);
    const option = await screen.findByRole("option", {name: "Apple"});
    expect(itemRef.current).toBe(option);
    expect(option.querySelector("[data-slot=combobox-item-indicator]")).toBeInTheDocument();
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
    expect(itemRef.current).toBeNull();
    expect(refCleanup).toHaveBeenCalled();
  });

  it("gives explicit children precedence over element children without losing compound anatomy", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        items={items}
        multiple
        defaultValue={[apple]}>
        <ComboboxTrigger render={<button>Ignored trigger</button>}>Visible trigger</ComboboxTrigger>
        <ComboboxChips>
          <ComboboxChip render={<div>Ignored chip</div>}>Visible chip</ComboboxChip>
          <ComboboxChipsInput aria-label='Fruits' />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem
              value={apple}
              render={<div>Ignored item</div>}>
              Apple
            </ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    await user.click(screen.getByRole("button", {name: "Visible trigger"}));
    expect(await screen.findByRole("option", {name: "Apple"})).toBeVisible();
    expect(screen.getByText("Visible chip")).toBeInTheDocument();
    expect(screen.queryAllByText(/Ignored/)).toHaveLength(0);
  });

  it("preserves primitive-owned Popup, Positioner, List, Item, Group and Empty render state", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        items={items}
        defaultValue={apple}>
        <ComboboxInput
          aria-label='Fruit'
          showTrigger={false}
        />
        <ComboboxContent
          data-testid='popup'
          className={(state) => (state.open ? "popup-open" : "popup-closed")}
          render={(props, state) => (
            <section
              {...props}
              data-popup-side={state.side}
            />
          )}
          positionerProps={{
            "data-testid": "positioner",
            className: (state) => (state.open ? "positioner-open" : ""),
            render: (props, state) => (
              <div
                {...props}
                data-positioner-side={state.side}
              />
            ),
          }}>
          <ComboboxList
            className={(state) => (state.empty ? "list-empty" : "list-full")}
            render={(props, state) => (
              <div
                {...props}
                data-list-empty={String(state.empty)}
              />
            )}>
            {(item: Fruit) => (
              <ComboboxGroup
                key={item.value}
                className={() => "custom-group"}
                render={(props) => <div {...props} />}>
                <ComboboxLabel className={() => "custom-label"}>Fruit group</ComboboxLabel>
                <ComboboxItem
                  value={item}
                  className={(state) => (state.selected ? "selected" : "unselected")}
                  render={(props, state) => (
                    <div
                      {...props}
                      data-item-selected={String(state.selected)}
                    />
                  )}>
                  {item.label}
                </ComboboxItem>
              </ComboboxGroup>
            )}
          </ComboboxList>
          <ComboboxSeparator className={() => "custom-separator"} />
          <ComboboxEmpty
            className={() => "custom-empty"}
            render={(props) => <div {...props} />}>
            No results
          </ComboboxEmpty>
        </ComboboxContent>
      </Combobox>,
    );
    await user.click(screen.getByRole("combobox"));
    const selected = await screen.findByRole("option", {name: "Apple"});
    expect(selected).toHaveClass("selected");
    expect(selected).toHaveAttribute("data-item-selected", "true");
    expect(screen.getByTestId("popup")).toHaveClass("popup-open");
    expect(screen.getByTestId("positioner")).toHaveClass("positioner-open");
    expect(screen.getByRole("listbox")).toHaveClass("list-full");
    expect(screen.getAllByRole("group", {name: "Fruit group"})[0]).toHaveClass("custom-group");
    expect(screen.getByTestId("popup").querySelector("[data-slot=combobox-separator]")).toHaveClass("custom-separator");
    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "xyz");
    expect(await screen.findByText("No results")).toHaveClass("custom-empty");
  });

  it("keeps explicit anchor measurement and Positioner contracts separate from Popup props", async () => {
    const anchor = {getBoundingClientRect: (): DOMRect => new DOMRect(120, 90, 260, 36)};
    const popupRef = React.createRef<HTMLDivElement>();
    const positionerRef = React.createRef<HTMLDivElement>();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement): DOMRect {
      return this.dataset["slot"] === "combobox-content" ? new DOMRect(0, 0, 180, 120) : new DOMRect(0, 0, 120, 36);
    });
    render(
      <Combobox
        items={items}
        defaultOpen>
        <ComboboxInput aria-label='Fruit' />
        <ComboboxContent
          ref={popupRef}
          anchor={anchor}
          side='bottom'
          align='start'
          sideOffset={10}
          alignOffset={4}
          collisionAvoidance={{side: "none", align: "none"}}
          positionerProps={{ref: positionerRef, "data-testid": "positioner"}}>
          <FruitOptions />
        </ComboboxContent>
      </Combobox>,
    );
    await waitFor(() => expect(positionerRef.current?.style.getPropertyValue("--anchor-width")).toBe("260px"));
    expect(popupRef.current).toHaveAttribute("data-chips", "true");
    expect(popupRef.current).toHaveAttribute("data-side", "bottom");
    expect(positionerRef.current).toHaveAttribute("data-align", "start");
    expect(popupRef.current).not.toHaveAttribute("anchor");
    expect(popupRef.current?.parentElement).toBe(positionerRef.current);
  });

  it("supports no input addons, custom chips input classes and rendered chip state", () => {
    const chipsRef = React.createRef<HTMLDivElement>();
    const chipRef = React.createRef<HTMLDivElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    render(
      <Combobox
        items={items}
        multiple
        defaultValue={[apple]}
        disabled>
        <ComboboxInput
          aria-label='Plain'
          showTrigger={false}
          showClear={false}
        />
        <ComboboxChips
          ref={chipsRef}
          className={() => "custom-chips"}
          render={<div data-testid='custom-chips' />}>
          <ComboboxChip
            ref={chipRef}
            className={(state) => (state.disabled ? "chip-disabled" : "")}
            render={(props, state) => (
              <div
                {...props}
                data-chip-disabled={String(state.disabled)}
              />
            )}>
            Apple
          </ComboboxChip>
          <ComboboxChipsInput
            ref={inputRef}
            aria-label='Fruits'
            className={(state) => (state.disabled ? "chips-input-disabled" : "")}
            render={<input />}
          />
        </ComboboxChips>
      </Combobox>,
    );
    expect(screen.getByTestId("custom-chips")).toHaveClass("custom-chips");
    expect(chipsRef.current).toBe(screen.getByTestId("custom-chips"));
    expect(chipRef.current).toHaveClass("chip-disabled");
    expect(inputRef.current).toHaveClass("chips-input-disabled");
    expect(screen.queryByRole("button", {name: "Show suggestions"})).not.toBeInTheDocument();
  });
});
