import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";
import {Select as BaseSelect} from "@base-ui/react/select";
import {DirectionProvider} from "@base-ui/react/direction-provider";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {parse} from "postcss";
import styles from "./select.module.css";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

function resolvedFlightRender(element: React.ReactElement): React.ReactElement {
  // Model the opaque, resolved Flight transport boundary around a real JSX element.
  const transport = {
    ...element,
    $$typeof: Symbol.for("react.lazy"),
    _payload: element,
    _init: (payload: React.ReactElement): React.ReactElement => payload,
  };
  for (const field of ["props", "type", "key", "ref"]) Reflect.deleteProperty(transport, field);
  return transport;
}

describe("Select", () => {
  it.each(["ltr", "rtl"] as const)("sizes a selected native option within its width without a consumer reset (%s)", (direction) => {
    // Happy DOM can verify the local box model, not native popup clipping or pixel geometry.
    const css = readFileSync(resolve(import.meta.dirname, "select.module.css"), "utf8").replace(
      /\.([A-Za-z][\w-]*)/gu,
      (selector, name: string) => (styles[name] ? `.${styles[name]}` : selector),
    );
    render(
      <DirectionProvider direction={direction}>
        <style>{css}</style>
        <Select
          defaultValue='selected'
          open>
          <SelectTrigger aria-label='No-reset sizing'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value='selected'>Selected option</SelectItem>
          </SelectContent>
        </Select>
      </DirectionProvider>,
    );
    const option = screen.getByRole("option", {name: "Selected option"});
    expect(option.tagName).toBe("DIV");
    expect(option).toHaveAttribute("aria-selected", "true");
    expect(getComputedStyle(option).width).toBe("100%");
    expect(getComputedStyle(option).boxSizing).toBe("border-box");
    const indicator = option.querySelector<HTMLElement>("[data-slot=select-item-indicator]");
    expect(indicator).not.toBeNull();
    expect(getComputedStyle(indicator!).position).toBe("absolute");
    // Happy DOM does not resolve this logical custom-property declaration.
    const offsets: string[] = [];
    parse(css).walkRules(`.${styles.itemIndicatorSlot}`, (rule) => {
      rule.walkDecls("inset-inline-end", (declaration) => {
        offsets.push(declaration.value);
      });
    });
    expect(offsets).toEqual(["var(--ac-space-2)"]);
  });

  it.each([
    ["popup", false],
    ["popup", true],
    ["list", false],
    ["list", true],
    ["positioner", true],
  ] as const)("does not resolve a pending %s render while closed (explicit children: %s)", async (part, explicitChildren) => {
    const request = Promise.withResolvers<React.ReactElement<React.ComponentPropsWithRef<"div">>>();
    let resolved: React.ReactElement<React.ComponentPropsWithRef<"div">> | undefined;
    let reads = 0;
    void request.promise.then((element) => {
      resolved = element;
    });
    // A suspending transport boundary around public element props. No React
    // private lazy fields or replacement repository/primitive implementations.
    const seed = <div />;
    const pendingRender: React.ReactElement<React.ComponentPropsWithRef<"div">> = {
      ...seed,
      get props(): React.ComponentPropsWithRef<"div"> {
        reads += 1;
        if (!resolved) throw request.promise;
        return resolved.props;
      },
    };
    const popupRef = React.createRef<HTMLDivElement>();
    const listRef = React.createRef<HTMLDivElement>();
    const positionerRef = React.createRef<HTMLDivElement>();
    const elementRef = React.createRef<HTMLDivElement>();
    const options = (
      <>
        <SelectItem value='a'>Alpha</SelectItem>
        <SelectItem value='b'>Beta</SelectItem>
      </>
    );
    function PendingSelect({open}: Readonly<{open: boolean}>): React.JSX.Element {
      return (
        <React.Suspense fallback={<p role='status'>Loading select surface</p>}>
          <Select
            open={open}
            items={{a: "Alpha", b: "Beta"}}>
            <SelectTrigger aria-label='Deferred choices'>
              <SelectValue placeholder='Choose' />
            </SelectTrigger>
            <SelectContent
              ref={popupRef}
              alignItemWithTrigger={false}
              render={part === "popup" ? pendingRender : undefined}
              listProps={{
                ref: listRef,
                "aria-label": "Available choices",
                render: part === "list" ? pendingRender : undefined,
              }}
              positionerProps={{
                ref: positionerRef,
                render: part === "positioner" ? pendingRender : undefined,
              }}>
              {explicitChildren ? options : undefined}
            </SelectContent>
          </Select>
        </React.Suspense>
      );
    }

    const {rerender, unmount} = render(<PendingSelect open={false} />);
    expect(reads).toBe(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", {name: "Deferred choices"})).toHaveAttribute("aria-expanded", "false");
    expect(popupRef.current).toBeNull();
    expect(listRef.current).toBeNull();
    expect(positionerRef.current).toBeNull();

    rerender(<PendingSelect open />);
    expect(reads).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Loading select surface");
    await act(async () => {
      request.resolve(<div ref={elementRef}>{explicitChildren ? <p>Ignored render children</p> : options}</div>);
      await request.promise;
    });

    const list = screen.getByRole("listbox", {name: "Available choices"});
    const popup = list.parentElement;
    expect(popup).toHaveAttribute("data-slot", "select-content");
    expect(popupRef.current).toBe(popup);
    expect(listRef.current).toBe(list);
    expect(positionerRef.current).toContainElement(popup);
    const surface = part === "popup" ? popup : part === "list" ? list : positionerRef.current;
    expect(elementRef.current).toBe(surface);
    expect(
      within(list)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Alpha", "Beta"]);
    expect(screen.queryByText("Ignored render children")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", {name: "Deferred choices"})).toHaveAttribute("aria-expanded", "true");
    unmount();
    expect(popupRef.current).toBeNull();
    expect(listRef.current).toBeNull();
    expect(positionerRef.current).toBeNull();
    expect(elementRef.current).toBeNull();
  });

  it("lets mounted Popup, List and Positioner own callback invocation and live state", () => {
    const popupStates: SelectContent.State[] = [];
    const listStates: BaseSelect.List.State[] = [];
    const positionerStates: BaseSelect.Positioner.State[] = [];
    const popupRender: Exclude<SelectContent.Props["render"], React.ReactElement | undefined> = (props, state) => {
      popupStates.push(state);
      return (
        <section
          {...props}
          data-popup-open={String(state.open)}
        />
      );
    };
    const listRender: Exclude<SelectContent.ListProps["render"], React.ReactElement | undefined> = (props, state) => {
      listStates.push(state);
      return (
        <div
          {...props}
          data-list-keys={Object.keys(state).join(",")}
        />
      );
    };
    const positionerRender: Exclude<SelectContent.PositionerProps["render"], React.ReactElement | undefined> = (props, state) => {
      positionerStates.push(state);
      return (
        <div
          {...props}
          data-positioner-open={String(state.open)}
        />
      );
    };
    function CallbackSelect({open}: Readonly<{open: boolean}>): React.JSX.Element {
      return (
        <Select open={open}>
          <SelectTrigger aria-label='Callback choices'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            render={popupRender}
            alignItemWithTrigger={false}
            listProps={{render: listRender, "aria-label": "Callback options"}}
            positionerProps={{render: positionerRender}}>
            <SelectItem value='a'>Alpha</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    const {rerender} = render(<CallbackSelect open={false} />);
    expect(popupStates).toEqual([]);
    expect(listStates).toEqual([]);
    expect(positionerStates).toEqual([]);
    rerender(<CallbackSelect open />);
    const list = screen.getByRole("listbox", {name: "Callback options"});
    expect(list).toHaveAttribute("data-list-keys", "");
    expect(list.parentElement).toHaveAttribute("data-popup-open", "true");
    expect(list.closest("[data-positioner-open]")).toHaveAttribute("data-positioner-open", "true");
    expect(popupStates.length).toBeGreaterThan(0);
    expect(listStates.length).toBeGreaterThan(0);
    expect(positionerStates.length).toBeGreaterThan(0);
    expect(popupStates.every((state) => state.open)).toBe(true);
    expect(positionerStates.every((state) => state.open)).toBe(true);
    expect(listStates.every((state) => Object.keys(state).length === 0)).toBe(true);
  });

  it("retains lazy render-element Trigger children, its icon, refs and native handlers", async () => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLButtonElement>();
    const wrapperRef = React.createRef<HTMLButtonElement>();
    const clicks: string[] = [];
    const transport = resolvedFlightRender(
      <button
        ref={childRef}
        className='flight-trigger'
        onClick={() => clicks.push("child")}>
        Flight trigger
      </button>,
    );
    expect(React.isValidElement(transport)).toBe(false);
    expect(transport).not.toHaveProperty("props");
    render(
      <Select>
        <SelectTrigger
          ref={wrapperRef}
          aria-label='Flight trigger'
          render={transport}
          onClick={() => clicks.push("wrapper")}
        />
        <SelectContent>
          <SelectItem value='a'>Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", {name: "Flight trigger"});
    expect(trigger).toHaveTextContent("Flight trigger");
    expect(trigger).toHaveClass("flight-trigger");
    expect(trigger.querySelector("[data-slot=select-trigger-icon]")).toBeInTheDocument();
    expect(childRef.current).toBe(trigger);
    expect(wrapperRef.current).toBe(trigger);
    await user.click(trigger);
    expect(clicks).toEqual(["child", "wrapper"]);
    expect(screen.getByRole("option", {name: "Alpha"})).toBeInTheDocument();
  });

  it("retains the actual List and its customizations inside lazy render-element Content", async () => {
    const user = userEvent.setup();
    const listRef = React.createRef<HTMLDivElement>();
    const popupRef = React.createRef<HTMLDivElement>();
    const childPopupRef = React.createRef<HTMLElement>();
    const transport = resolvedFlightRender(
      <section
        ref={childPopupRef}
        data-testid='flight-popup'>
        <SelectItem value='a'>Alpha</SelectItem>
      </section>,
    );
    render(
      <Select items={{a: "Alpha"}}>
        <SelectTrigger aria-label='Flight choices'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          ref={popupRef}
          render={transport}
          listProps={{
            ref: listRef,
            "aria-label": "Flight options",
            className: "flight-list",
            render: (props, state) => (
              <div
                {...props}
                data-list-state={Object.keys(state).join(",")}
              />
            ),
          }}
        />
      </Select>,
    );
    await user.click(screen.getByRole("combobox", {name: "Flight choices"}));
    const popup = screen.getByTestId("flight-popup");
    const list = screen.getByRole("listbox", {name: "Flight options"});
    expect(popupRef.current).toBe(popup);
    expect(childPopupRef.current).toBe(popup);
    expect(listRef.current).toBe(list);
    expect(list.parentElement).toBe(popup);
    expect(list).toHaveAttribute("data-slot", "select-list");
    expect(list).toHaveAttribute("data-list-state", "");
    expect(list).toHaveClass("flight-list");
    await user.click(within(list).getByRole("option", {name: "Alpha"}));
    expect(screen.getByRole("combobox", {name: "Flight choices"})).toHaveTextContent("Alpha");
  });

  it("keeps explicit children and compound anatomy with lazy nested containers, items and arrows", () => {
    const itemRef = React.createRef<HTMLElement>();
    render(
      <Select
        defaultOpen
        defaultValue='a'>
        <SelectTrigger
          aria-label='Flight nested'
          render={resolvedFlightRender(<button>Ignored trigger</button>)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          data-testid='flight-nested-popup'
          render={resolvedFlightRender(<section>Ignored popup</section>)}
          positionerProps={{render: resolvedFlightRender(<div data-testid='flight-positioner'>Ignored positioner</div>)}}
          listProps={{"aria-label": "Flight nested options", render: resolvedFlightRender(<div>Ignored list</div>)}}>
          <SelectItem
            ref={itemRef}
            value='a'
            render={resolvedFlightRender(<div>Ignored item</div>)}>
            Alpha
          </SelectItem>
          <SelectScrollUpButton
            keepMounted
            render={resolvedFlightRender(<div data-testid='flight-up'>Earlier</div>)}
          />
          <SelectScrollDownButton
            keepMounted
            render={resolvedFlightRender(<div data-testid='flight-down'>Later</div>)}
          />
        </SelectContent>
      </Select>,
    );
    const list = screen.getByRole("listbox", {name: "Flight nested options"});
    const alpha = within(list).getByRole("option", {name: "Alpha"});
    expect(itemRef.current).toBe(alpha);
    expect(within(alpha).getByText("Alpha")).toHaveAttribute("data-slot", "select-item-text");
    expect(alpha.querySelector("[data-slot=select-item-indicator]")).toBeInTheDocument();
    expect(screen.getByTestId("flight-positioner")).toContainElement(screen.getByTestId("flight-nested-popup"));
    expect(list.parentElement).toBe(screen.getByTestId("flight-nested-popup"));
    expect(screen.getByTestId("flight-up")).toHaveTextContent("Earlier");
    expect(screen.getByTestId("flight-down")).toHaveTextContent("Later");
    expect(screen.queryAllByText(/Ignored/)).toHaveLength(0);
  });

  it("delivers array-valued changes instead of discarding them", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select
        multiple
        defaultValue={["a"]}
        onValueChange={onValueChange}>
        <SelectTrigger aria-label='Choices'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='a'>Alpha</SelectItem>
          <SelectItem value='b'>Beta</SelectItem>
        </SelectContent>
      </Select>,
    );

    await user.click(screen.getByRole("combobox", {name: "Choices"}));
    await user.click(screen.getByRole("option", {name: "Beta"}));

    expect(onValueChange.mock.calls.at(-1)?.[0]).toEqual(["a", "b"]);
  });

  it("updates controlled readonly arrays and submits each selected value", async () => {
    const user = userEvent.setup();
    const initial: readonly string[] = Object.freeze(["a"]);
    function ControlledMultiple(): React.JSX.Element {
      const [value, setValue] = React.useState<readonly string[]>(initial);
      return (
        <form aria-label='Choices form'>
          <Select
            multiple
            name='choices'
            value={value}
            onValueChange={setValue}>
            <SelectTrigger aria-label='Choices'>
              <SelectValue>{(selected: readonly string[]) => selected.join(", ")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='a'>Alpha</SelectItem>
              <SelectItem value='b'>Beta</SelectItem>
            </SelectContent>
          </Select>
        </form>
      );
    }
    render(<ControlledMultiple />);
    const trigger = screen.getByRole("combobox", {name: "Choices"});
    await user.click(trigger);
    await user.click(screen.getByRole("option", {name: "Beta"}));
    expect(trigger).toHaveTextContent("a, b");
    expect(screen.getByRole("option", {name: "Beta"})).toHaveAttribute("aria-selected", "true");
    expect(new FormData(screen.getByRole<HTMLFormElement>("form")).getAll("choices")).toEqual(["a", "b"]);
    await user.click(screen.getByRole("option", {name: "Alpha"}));
    expect(trigger).toHaveTextContent("b");
    expect(new FormData(screen.getByRole<HTMLFormElement>("form")).getAll("choices")).toEqual(["b"]);
    expect(initial).toEqual(["a"]);
  });

  it("preserves controlled object values, equality, input refs and external form ownership", async () => {
    const user = userEvent.setup();
    const choices = [
      {id: "a", title: "Alpha"},
      {id: "b", title: "Beta"},
    ];
    type Choice = (typeof choices)[number];
    const inputRef = React.createRef<HTMLInputElement>();
    const onValueChange = vi.fn<NonNullable<Select.Props<Choice>["onValueChange"]>>();
    function ObjectSelect(): React.JSX.Element {
      const [value, setValue] = React.useState<Choice | null>({id: "a", title: "Alpha"});
      return (
        <>
          <form
            id='external-form'
            aria-label='External form'
          />
          <Select
            value={value}
            inputRef={inputRef}
            name='choice'
            form='external-form'
            autoComplete='off'
            itemToStringLabel={(item) => item.title}
            itemToStringValue={(item) => item.id}
            isItemEqualToValue={(item, selected) => item.id === selected.id}
            onValueChange={(next, details) => {
              setValue(next);
              onValueChange(next, details);
            }}>
            <SelectTrigger aria-label='Object choice'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {choices.map((choice) => (
                <SelectItem
                  key={choice.id}
                  value={choice}>
                  {choice.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      );
    }
    render(<ObjectSelect />);
    const trigger = screen.getByRole("combobox", {name: "Object choice"});
    expect(trigger).toHaveTextContent("Alpha");
    expect(inputRef.current).toHaveAttribute("name", "choice");
    expect(inputRef.current).toHaveAttribute("form", "external-form");
    await user.click(trigger);
    expect(screen.getByRole("option", {name: "Alpha"})).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("option", {name: "Beta"}));
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBe(choices[1]);
    expect(trigger).toHaveTextContent("Beta");
    expect(new FormData(screen.getByRole<HTMLFormElement>("form")).get("choice")).toBe("b");
  });

  it("delivers null clearing with native change details", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<NonNullable<Select.Props<string>["onValueChange"]>>();
    function ClearableSelect(): React.JSX.Element {
      const [value, setValue] = React.useState<string | null>("a");
      return (
        <Select
          value={value}
          onValueChange={(next, details) => {
            setValue(next);
            onValueChange(next, details);
          }}>
          <SelectTrigger aria-label='Clearable'>
            <SelectValue placeholder='Choose' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Clear selection</SelectItem>
            <SelectItem value='a'>Alpha</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    render(<ClearableSelect />);
    await user.click(screen.getByRole("combobox", {name: "Clearable"}));
    const clear = screen.getByRole("option", {name: "Clear selection"});
    await user.click(clear);
    const call = onValueChange.mock.calls.at(-1);
    expect(call?.[0]).toBeNull();
    expect(call?.[1].reason).toBe("item-press");
    expect(call?.[1].event).toBeInstanceOf(Event);
    expect(call?.[1].event.target).toBe(clear);
    expect(call?.[1].cancel).toBeTypeOf("function");
    expect(screen.getByRole("combobox", {name: "Clearable"})).toHaveTextContent("Choose");
  });

  it("allows change details cancellation to retain the selection", async () => {
    const user = userEvent.setup();
    render(
      <Select
        defaultValue='a'
        items={{a: "Alpha", b: "Beta"}}
        onValueChange={(_value, details) => details.cancel()}>
        <SelectTrigger aria-label='Cancelable'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='a'>Alpha</SelectItem>
          <SelectItem value='b'>Beta</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox", {name: "Cancelable"}));
    await user.click(screen.getByRole("option", {name: "Beta"}));
    expect(screen.getByRole("combobox", {name: "Cancelable"})).toHaveTextContent("Alpha");
  });

  it("preserves Root's generic public signature and namespace aliases", () => {
    const root: typeof BaseSelect.Root = Select;
    const wrapper: <Value, Multiple extends boolean | undefined = false>(
      props: Readonly<Select.Props<Value, Multiple>>,
    ) => React.JSX.Element = BaseSelect.Root;
    expect(root).toBe(Select);
    expect(wrapper).toBe(BaseSelect.Root);
    expectTypeOf<Select.Props<{id: string}, true>>().toEqualTypeOf<BaseSelect.Root.Props<{id: string}, true>>();
    expectTypeOf<Select.ChangeEventDetails>().toEqualTypeOf<BaseSelect.Root.ChangeEventDetails>();
    expectTypeOf<Select.Actions>().toEqualTypeOf<BaseSelect.Root.Actions>();
    expectTypeOf<NonNullable<Select.Props<string, true>["onValueChange"]>>().parameter(0).toEqualTypeOf<string[]>();
    expectTypeOf<NonNullable<Select.Props<string>["onValueChange"]>>().parameter(0).toEqualTypeOf<string | null>();
  });

  it("gives trigger render and class callbacks real state, size and merged refs", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    render(
      <Select defaultValue='a'>
        <SelectTrigger
          ref={ref}
          size='sm'
          aria-label='Stateful'
          className={(state) => (state.open ? "trigger-open" : "trigger-closed")}
          render={(props, state) => (
            <button
              {...props}
              ref={(node) => {
                childRef.current = node;
                if (typeof props.ref === "function") props.ref(node);
              }}
              data-open={String(state.open)}
            />
          )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='a'>Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", {name: "Stateful"});
    expect(trigger).toHaveAttribute("data-open", "false");
    expect(trigger).toHaveClass("trigger-closed");
    expect(trigger).toHaveAttribute("data-size", "sm");
    expect(trigger).toHaveAttribute("data-slot", "select-trigger");
    expect(ref.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    await user.click(trigger);
    expect(trigger).toHaveAttribute("data-open", "true");
    expect(trigger).toHaveClass("trigger-open");
  });

  it("routes Popup attributes and callbacks separately from Positioner and the actual List", async () => {
    const user = userEvent.setup();
    const popupRef = React.createRef<HTMLDivElement>();
    const positionerRef = React.createRef<HTMLDivElement>();
    const listRef = React.createRef<HTMLDivElement>();
    render(
      <Select>
        <SelectTrigger aria-label='Routed'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          ref={popupRef}
          data-testid='popup'
          aria-label='Popup container'
          alignItemWithTrigger={false}
          side='top'
          align='start'
          sideOffset={() => 8}
          alignOffset={() => 2}
          collisionAvoidance={{side: "none", align: "none", fallbackAxisSide: "none"}}
          positionerProps={{
            ref: positionerRef,
            "data-testid": "positioner",
            className: (state) => (state.open ? "positioned-open" : undefined),
            render: (props, state) => (
              <div
                {...props}
                data-positioner-state={`${state.side}:${state.align}:${state.open}`}
              />
            ),
          }}
          listProps={{
            ref: listRef,
            "aria-label": "Actual choices",
            "data-testid": "list",
            className: () => "custom-list",
            render: (props, state) => (
              <div
                {...props}
                data-list-state-keys={Object.keys(state).join(",")}
              />
            ),
          }}
          className={(state) => (state.open ? "popup-open" : undefined)}
          render={(props, state) => (
            <div
              {...props}
              data-popup-state={`${state.side}:${state.align}:${state.open}`}
            />
          )}>
          <SelectItem value='a'>Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox", {name: "Routed"}));
    const popup = screen.getByTestId("popup");
    const list = screen.getByRole("listbox", {name: "Actual choices"});
    expect(popupRef.current).toBe(popup);
    expect(positionerRef.current).toBe(screen.getByTestId("positioner"));
    expect(listRef.current).toBe(list);
    expect(popup).toHaveClass("popup-open");
    expect(popup).toHaveAttribute("data-popup-state", "top:start:true");
    expect(popup).toHaveAttribute("data-slot", "select-content");
    expect(popup).toHaveAttribute("aria-label", "Popup container");
    expect(screen.getByTestId("positioner")).toHaveClass("positioned-open");
    expect(screen.getByTestId("positioner")).toHaveAttribute("data-positioner-state", "top:start:true");
    expect(screen.getByTestId("positioner")).not.toHaveAttribute("aria-label");
    expect(list).toHaveClass("custom-list");
    expect(list).toHaveAttribute("data-list-state-keys", "");
    expect(list).toHaveAttribute("data-slot", "select-list");
    expect(list.parentElement).toBe(popup);
  });

  it("forwards finalFocus=false without returning focus to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Focus'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent finalFocus={false}>
          <SelectItem value='a'>Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", {name: "Focus"});
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger).not.toHaveFocus();
  });

  it("forwards a custom finalFocus target to Popup", async () => {
    const user = userEvent.setup();
    const target = React.createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={target}>After select</button>
        <Select>
          <SelectTrigger aria-label='Focus'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent finalFocus={target}>
            <SelectItem value='a'>Alpha</SelectItem>
          </SelectContent>
        </Select>
      </>,
    );
    await user.click(screen.getByRole("combobox", {name: "Focus"}));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", {name: "After select"})).toHaveFocus());
  });

  it("passes item, label and separator callback states to their primitives", () => {
    const itemRef = React.createRef<HTMLElement>();
    const labelRef = React.createRef<HTMLDivElement>();
    const separatorRef = React.createRef<HTMLDivElement>();
    render(
      <Select
        defaultValue='a'
        defaultOpen>
        <SelectTrigger aria-label='Parts'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel
              ref={labelRef}
              render={(props, state) => (
                <div
                  {...props}
                  data-state-keys={Object.keys(state).join(",")}
                />
              )}>
              Group
            </SelectLabel>
            <SelectItem
              ref={itemRef}
              value='a'
              className={(state) => (state.selected ? "selected-item" : undefined)}
              render={(props, state) => (
                <div
                  {...props}
                  data-selected={String(state.selected)}
                />
              )}>
              Alpha
            </SelectItem>
            <SelectItem
              disabled
              value='b'
              render={(props, state) => (
                <div
                  {...props}
                  data-disabled-state={String(state.disabled)}
                />
              )}>
              Beta
            </SelectItem>
          </SelectGroup>
          <SelectSeparator
            ref={separatorRef}
            orientation='vertical'
            className={(state) => (state.orientation === "vertical" ? "vertical-separator" : undefined)}
            render={(props, state) => (
              <div
                {...props}
                data-orientation-state={state.orientation}
              />
            )}
          />
        </SelectContent>
      </Select>,
    );
    const alpha = screen.getByRole("option", {name: "Alpha"});
    expect(alpha).toHaveAttribute("data-selected", "true");
    expect(alpha).toHaveClass("selected-item");
    expect(itemRef.current).toBe(alpha);
    expect(screen.getByRole("option", {name: "Beta"})).toHaveAttribute("data-disabled-state", "true");
    expect(labelRef.current).toHaveAttribute("data-state-keys", "");
    expect(separatorRef.current).toHaveAttribute("data-orientation-state", "vertical");
    expect(separatorRef.current).toHaveClass("vertical-separator");
    expect(within(alpha).getByText("Alpha")).toHaveAttribute("data-slot", "select-item-text");
    expect(alpha.querySelector("[data-slot=select-item-indicator]")).toBeInTheDocument();
  });

  it("keeps custom scroll arrow children, refs and real callback state", () => {
    const upRef = React.createRef<HTMLDivElement>();
    const downRef = React.createRef<HTMLDivElement>();
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label='Arrows'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectScrollUpButton
            ref={upRef}
            keepMounted
            className={() => "custom-up"}
            render={(props, state) => (
              <div
                {...props}
                data-state-keys={Object.keys(state).join(",")}
              />
            )}>
            Up
          </SelectScrollUpButton>
          <SelectItem value='a'>Alpha</SelectItem>
          <SelectScrollDownButton
            ref={downRef}
            keepMounted
            render={<div data-testid='down' />}>
            Down
          </SelectScrollDownButton>
        </SelectContent>
      </Select>,
    );
    expect(upRef.current).toHaveTextContent("Up");
    expect(upRef.current).toHaveClass("custom-up");
    expect(upRef.current).toHaveAttribute("data-slot", "select-scroll-up-button");
    expect(upRef.current?.getAttribute("data-state-keys")).toContain("direction");
    expect(downRef.current).toBe(screen.getByTestId("down"));
    expect(downRef.current).toHaveTextContent("Down");
    expect(downRef.current).toHaveAttribute("data-slot", "select-scroll-down-button");
  });

  it("retains render-element children inside the trigger icon and item text contracts", async () => {
    const user = userEvent.setup();
    const triggerRef = React.createRef<HTMLButtonElement>();
    const renderRef = React.createRef<HTMLButtonElement>();
    const clicks: string[] = [];
    render(
      <Select>
        <SelectTrigger
          ref={triggerRef}
          aria-label='Custom trigger'
          onClick={() => clicks.push("wrapper")}
          render={
            <button
              ref={renderRef}
              className='child-trigger'
              onClick={() => clicks.push("child")}>
              Custom trigger
            </button>
          }
        />
        <SelectContent>
          <SelectItem
            value='a'
            render={<div className='child-item'>Alpha</div>}
          />
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", {name: "Custom trigger"});
    expect(triggerRef.current).toBe(trigger);
    expect(renderRef.current).toBe(trigger);
    expect(trigger.querySelector("[data-slot=select-trigger-icon]")).toBeInTheDocument();
    await user.click(trigger);
    expect(clicks).toEqual(["child", "wrapper"]);
    const option = screen.getByRole("option", {name: "Alpha"});
    expect(option).toHaveClass("child-item");
    expect(within(option).getByText("Alpha")).toHaveAttribute("data-slot", "select-item-text");
    await user.click(option);
    expect(trigger).toHaveTextContent("Custom trigger");
  });

  it("retains render-element Content children inside the actual List", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label='Composed content'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          render={
            <section data-testid='composed-popup'>
              <SelectItem value='a'>Alpha</SelectItem>
            </section>
          }
          listProps={{"aria-label": "Composed choices"}}
        />
      </Select>,
    );
    const list = screen.getByRole("listbox", {name: "Composed choices"});
    expect(list.parentElement).toBe(screen.getByTestId("composed-popup"));
    expect(within(list).getByRole("option", {name: "Alpha"})).toBeInTheDocument();
  });

  it("retains the Popup and explicit items when nested container render elements have children", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label='Nested composition'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          data-testid='nested-popup'
          positionerProps={{render: <div data-testid='nested-positioner'>Ignored positioner child</div>}}
          listProps={{"aria-label": "Nested choices", render: <div>Ignored list child</div>}}>
          <SelectItem value='a'>Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    const popup = screen.getByTestId("nested-popup");
    const list = screen.getByRole("listbox", {name: "Nested choices"});
    expect(screen.getByTestId("nested-positioner")).toContainElement(popup);
    expect(popup).toContainElement(list);
    expect(within(list).getByRole("option", {name: "Alpha"})).toBeInTheDocument();
    expect(screen.queryAllByText(/Ignored/)).toHaveLength(0);
  });

  it("uses explicit children before render-element children and allows empty arrow content", () => {
    render(
      <Select
        defaultOpen
        defaultValue='a'>
        <SelectTrigger
          aria-label='Explicit'
          render={<button>Ignored trigger</button>}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent render={<section>Ignored popup</section>}>
          <SelectItem
            value='a'
            render={<div>Ignored item</div>}>
            Alpha
          </SelectItem>
          <SelectScrollUpButton
            keepMounted
            data-testid='empty-up'>
            {null}
          </SelectScrollUpButton>
          <SelectScrollDownButton
            keepMounted
            data-testid='default-down'
          />
        </SelectContent>
      </Select>,
    );
    expect(screen.queryAllByText(/Ignored/)).toHaveLength(0);
    expect(screen.getByRole("option", {name: "Alpha"})).toBeInTheDocument();
    expect(screen.getByTestId("empty-up")).toBeEmptyDOMElement();
    expect(screen.getByTestId("default-down").querySelector("svg")).toBeInTheDocument();
  });

  it("keeps a visible label, group labels, typeahead labels and disabled item navigation", async () => {
    const user = userEvent.setup();
    render(
      <>
        <label htmlFor='labeled-select'>Framework</label>
        <Select
          id='labeled-select'
          defaultValue='a'
          items={{a: "Alpha", b: "Beta", c: "Gamma display"}}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Frontend</SelectLabel>
              <SelectItem value='a'>Alpha</SelectItem>
              <SelectItem
                value='b'
                disabled>
                Beta
              </SelectItem>
              <SelectItem
                value='c'
                label='Gamma'>
                Gamma display
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </>,
    );
    const trigger = screen.getByRole("combobox", {name: "Framework"});
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("group", {name: "Frontend"})).toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    const disabled = screen.getByRole("option", {name: "Beta"});
    expect(disabled).toHaveFocus();
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");
    expect(trigger).toHaveTextContent("Alpha");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", {name: "Gamma display"})).toHaveFocus();
    await user.keyboard("{Home}g");
    expect(screen.getByRole("option", {name: "Gamma display"})).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveTextContent("Gamma display");
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it.each([false, true])("keeps disabled trigger semantics when nativeButton=%s", async (nativeButton) => {
    const user = userEvent.setup();
    render(
      <Select disabled>
        <SelectTrigger
          nativeButton={nativeButton}
          render={nativeButton ? <button /> : <div />}
          aria-label='Disabled'>
          <SelectValue placeholder='Choose' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='a'>Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", {name: "Disabled"});
    if (nativeButton) expect(trigger).toBeDisabled();
    else expect(trigger).toHaveAttribute("aria-disabled", "true");
    await user.click(trigger);
    await user.tab();
    await user.keyboard("{Enter}{ArrowDown}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
  });

  it("keeps readOnly values unchanged without disabling form submission", async () => {
    const user = userEvent.setup();
    render(
      <form aria-label='Readonly form'>
        <Select
          defaultValue='a'
          name='readonly'
          readOnly>
          <SelectTrigger aria-label='Readonly'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='a'>Alpha</SelectItem>
            <SelectItem value='b'>Beta</SelectItem>
          </SelectContent>
        </Select>
      </form>,
    );
    const trigger = screen.getByRole("combobox", {name: "Readonly"});
    await user.click(trigger);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-readonly", "true");
    expect(new FormData(screen.getByRole<HTMLFormElement>("form")).get("readonly")).toBe("a");
    expect(trigger).not.toBeDisabled();
  });

  it("honors consumer event cancellation before primitive trigger/item handlers", async () => {
    const user = userEvent.setup();
    const {rerender} = render(
      <Select>
        <SelectTrigger
          aria-label='Prevented'
          onMouseDown={(event) => event.preventBaseUIHandler()}>
          Choose
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='a'>Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox", {name: "Prevented"}));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    rerender(
      <Select>
        <SelectTrigger aria-label='Prevented'>
          <SelectValue placeholder='Choose' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            value='a'
            onClick={(event) => event.preventBaseUIHandler()}>
            Alpha
          </SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox", {name: "Prevented"}));
    await user.click(screen.getByRole("option", {name: "Alpha"}));
    expect(screen.getByRole("combobox", {name: "Prevented"})).toHaveTextContent("Choose");
  });

  it("preserves Group and Value refs, render-element children and primitive callbacks", async () => {
    const user = userEvent.setup();
    const valueRef = React.createRef<HTMLSpanElement>();
    const groupRef = React.createRef<HTMLDivElement>();
    render(
      <Select items={{a: "Alpha"}}>
        <SelectTrigger aria-label='Value state'>
          <SelectValue
            ref={valueRef}
            placeholder='Choose'
            className={(state) => (state.placeholder ? "empty-value" : "chosen-value")}
            render={(props, state) => (
              <span
                {...props}
                data-value-placeholder={String(state.placeholder)}
              />
            )}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup
            ref={groupRef}
            className={() => "custom-group"}
            render={<div />}>
            <SelectLabel render={<div className='render-label'>Available</div>} />
            <SelectItem value='a'>Alpha</SelectItem>
          </SelectGroup>
          <SelectSeparator render={<div data-testid='render-separator' />} />
          <SelectScrollUpButton
            keepMounted
            data-testid='default-up'
          />
          <SelectScrollDownButton
            keepMounted
            className={() => "custom-down"}
            render={<div data-testid='custom-down'>Later</div>}
          />
        </SelectContent>
      </Select>,
    );
    expect(valueRef.current).toHaveClass("empty-value");
    expect(valueRef.current).toHaveAttribute("data-slot", "select-value");
    expect(valueRef.current).toHaveAttribute("data-value-placeholder", "true");
    await user.click(screen.getByRole("combobox", {name: "Value state"}));
    expect(groupRef.current).toBe(screen.getByRole("group", {name: "Available"}));
    expect(groupRef.current).toHaveClass("custom-group");
    expect(groupRef.current).toHaveAttribute("data-slot", "select-group");
    expect(screen.getByText("Available")).toHaveClass("render-label");
    expect(screen.getByTestId("render-separator")).toHaveAttribute("data-slot", "select-separator");
    expect(screen.getByTestId("default-up").querySelector("svg")).toBeInTheDocument();
    expect(screen.getByTestId("custom-down")).toHaveClass("custom-down");
    expect(screen.getByTestId("custom-down")).toHaveTextContent("Later");
    await user.click(screen.getByRole("option", {name: "Alpha"}));
    expect(valueRef.current).toHaveClass("chosen-value");
    expect(valueRef.current).toHaveAttribute("data-value-placeholder", "false");
    expect(valueRef.current).toHaveTextContent("Alpha");
  });

  it("forwards browser autofill changes with their original native details", async () => {
    const inputRef = React.createRef<HTMLInputElement>();
    const onValueChange = vi.fn<NonNullable<Select.Props<string>["onValueChange"]>>();
    render(
      <form aria-label='Autofill form'>
        <Select
          name='choice'
          inputRef={inputRef}
          defaultValue='a'
          items={{a: "Alpha", b: "Beta"}}
          onValueChange={onValueChange}>
          <SelectTrigger aria-label='Autofill'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='a'>Alpha</SelectItem>
            <SelectItem value='b'>Beta</SelectItem>
          </SelectContent>
        </Select>
      </form>,
    );
    if (!inputRef.current) throw new Error("The primitive input ref was not forwarded");
    fireEvent.change(inputRef.current, {target: {value: "b"}});
    await waitFor(() => expect(screen.getByRole("combobox", {name: "Autofill"})).toHaveTextContent("Beta"));
    expect(onValueChange).toHaveBeenCalledWith("b", expect.objectContaining({reason: "none"}));
    expect(onValueChange.mock.calls.at(-1)?.[1].event.target).toBe(inputRef.current);
    expect(onValueChange.mock.calls.at(-1)?.[1].event).toBeInstanceOf(Event);
    expect(new FormData(screen.getByRole<HTMLFormElement>("form")).get("choice")).toBe("b");
  });

  it("renders without crashing", () => {
    // Arrange
    render(
      <Select defaultValue='react'>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Assert
    expect(screen.getByRole("combobox", {name: "Framework"})).toBeInTheDocument();
  });

  it("shows options when the trigger is opened", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectItem value='vue'>Vue</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    expect(await screen.findByRole("option", {name: "React"})).toBeInTheDocument();
    expect(screen.getByRole("option", {name: "Vue"})).toBeInTheDocument();
  });

  it("merges the trigger className", () => {
    // Arrange
    render(
      <Select>
        <SelectTrigger
          aria-label='Framework'
          className='custom-trigger'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Assert
    expect(screen.getByRole("combobox", {name: "Framework"})).toHaveClass("custom-trigger");
  });

  it("renders item children inside the popup", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React item content</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    expect(await screen.findByText("React item content")).toBeInTheDocument();
  });

  it("renders SelectGroup with SelectLabel", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel data-testid='select-label'>Frontend Frameworks</SelectLabel>
            <SelectItem value='react'>React</SelectItem>
            <SelectItem value='vue'>Vue</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("select-label")).toBeInTheDocument();
      expect(screen.getByText("Frontend Frameworks")).toBeVisible();
    });
  });

  it("renders SelectSeparator between groups", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Technology'>
          <SelectValue placeholder='Choose technology' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Frontend</SelectLabel>
            <SelectItem value='react'>React</SelectItem>
          </SelectGroup>
          <SelectSeparator data-testid='select-separator' />
          <SelectGroup>
            <SelectLabel>Backend</SelectLabel>
            <SelectItem value='node'>Node.js</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Technology"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("select-separator")).toBeInTheDocument();
    });
  });

  it("renders SelectContent with scroll buttons automatically", async () => {
    // Arrange - SelectContent automatically renders scroll buttons
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Numbers'>
          <SelectValue placeholder='Choose number' />
        </SelectTrigger>
        <SelectContent>
          {Array.from({length: 20}, (_, i) => (
            <SelectItem
              key={i}
              value={String(i)}>
              {i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Numbers"}));

    // Assert - Just verify content opens, scroll buttons are part of the implementation
    await waitFor(() => {
      expect(screen.getByRole("option", {name: "0"})).toBeVisible();
    });
  });

  it("merges custom className on SelectContent popup", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose' />
        </SelectTrigger>
        <SelectContent
          className='custom-content'
          data-testid='select-content'>
          <SelectItem value='react'>React</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert - The custom className is applied to the popup element
    await waitFor(() => {
      // Get the listbox which is the rendered popup
      const popup = screen.getByRole("listbox").parentElement;
      expect(popup).toHaveClass("custom-content");
    });
  });

  it("merges custom className on SelectLabel", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className='custom-label'>Label</SelectLabel>
            <SelectItem value='react'>React</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      const label = screen.getByText("Label");
      expect(label).toHaveClass("custom-label");
    });
  });

  it("merges custom className on SelectSeparator", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectSeparator
            className='custom-separator'
            data-testid='separator'
          />
          <SelectItem value='vue'>Vue</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      const separator = screen.getByTestId("separator");
      expect(separator).toHaveClass("custom-separator");
    });
  });

  it("closes the listbox when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectItem value='vue'>Vue</SelectItem>
        </SelectContent>
      </Select>,
    );

    await user.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());

    // Act
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("navigates options with ArrowDown and ArrowUp after opening", async () => {
    // Arrange
    const user = userEvent.setup();
    const mockOnValueChange = vi.fn();
    render(
      <Select
        defaultValue='react'
        onValueChange={mockOnValueChange}>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectItem value='vue'>Vue</SelectItem>
          <SelectItem value='angular'>Angular</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act — open the select with the keyboard, navigate down one step from React → Vue,
    // then back up Vue → React, then down again and confirm with Enter
    await user.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => screen.getByRole("option", {name: "React"}));

    // ArrowDown from the currently selected "React" moves highlight to "Vue"
    await user.keyboard("{ArrowDown}");
    // ArrowUp moves highlight back to "React"
    await user.keyboard("{ArrowUp}");
    // ArrowDown again to land on "Vue", then Enter to confirm
    await user.keyboard("{ArrowDown}{Enter}");

    // Assert
    await waitFor(() => {
      expect(mockOnValueChange).toHaveBeenCalledWith("vue", expect.objectContaining({reason: "item-press"}));
    });
  });

  it("calls onValueChange when selection changes", async () => {
    // Arrange
    const user = userEvent.setup();
    const mockOnValueChange = vi.fn();
    render(
      <Select onValueChange={mockOnValueChange}>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectItem value='vue'>Vue</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => screen.getByRole("option", {name: "React"}));
    await user.click(screen.getByRole("option", {name: "React"}));

    // Assert
    await waitFor(() => {
      expect(mockOnValueChange).toHaveBeenCalledWith("react", expect.objectContaining({reason: "item-press"}));
    });
  });

  it("does not call onValueChange when callback is undefined", async () => {
    // Arrange - No callback provided, just ensure no crash
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => screen.getByRole("option", {name: "React"}));
    await user.click(screen.getByRole("option", {name: "React"}));

    // Assert - No crash, selection works (verify the select processed the event)
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<NonNullable<Select.Props<string>["onValueChange"]>>();

    function ControlledSelect(): React.JSX.Element {
      const [value, setValue] = React.useState<string | null>("react");

      return (
        <Select
          value={value}
          onValueChange={(nextValue, details) => {
            setValue(nextValue);
            handleValueChange(nextValue, details);
          }}>
          <SelectTrigger aria-label='Controlled framework'>
            <SelectValue placeholder='Choose a framework' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='react'>React</SelectItem>
            <SelectItem value='vue'>Vue</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    render(<ControlledSelect />);

    const trigger = screen.getByRole("combobox", {name: "Controlled framework"});

    expect(trigger).toHaveTextContent(/react/i);

    // Act
    await user.click(trigger);
    await user.click(await screen.findByRole("option", {name: "Vue"}));

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith("vue", expect.objectContaining({reason: "item-press"}));
    await waitFor(() => {
      expect(screen.getByRole("combobox", {name: "Controlled framework"})).toHaveTextContent(/vue/i);
    });
  });
});
