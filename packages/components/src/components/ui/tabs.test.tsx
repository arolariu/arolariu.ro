import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {DirectionProvider} from "@base-ui/react/direction-provider";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import postcss, {type Container} from "postcss";
import selectorParser from "postcss-selector-parser";
import * as React from "react";
import {renderToString} from "react-dom/server";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, describe, expect, it, vi} from "vitest";

import * as TabsModule from "./tabs";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "./tabs";
import styles from "./tabs.module.css";
import * as stories from "./tabs.stories";

afterEach(() => vi.restoreAllMocks());

function requiredClass(name: string): string {
  const className = styles[name];
  if (typeof className !== "string" || className.trim().length === 0) {
    throw new Error(`Missing CSS Module class: ${name}`);
  }
  return className;
}

function cssDeclaration(selector: string, property: string): string {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(readFileSync(resolve(import.meta.dirname, "tabs.module.css"), "utf8"));
  for (const rule of Array.from(sheet.cssRules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
      return rule.style.getPropertyValue(property);
    }
  }
  return "";
}

type Specificity = readonly [number, number, number];

function compareSpecificity(first: Specificity, second: Specificity): number {
  return first[0] - second[0] || first[1] - second[1] || first[2] - second[2];
}

function selectorSpecificity(selector: selectorParser.Selector): Specificity {
  let ids = 0;
  let classes = 0;
  let elements = 0;
  for (const node of selector.nodes) {
    if (node.type === "id") ids += 1;
    else if (node.type === "class" || node.type === "attribute") classes += 1;
    else if (node.type === "tag") elements += 1;
    else if (node.type === "pseudo") {
      if (node.value === ":where") continue;
      if ([":is", ":not", ":has"].includes(node.value)) {
        const maximum = node.nodes
          .map(selectorSpecificity)
          .reduce<Specificity>((highest, current) => (compareSpecificity(current, highest) > 0 ? current : highest), [0, 0, 0]);
        ids += maximum[0];
        classes += maximum[1];
        elements += maximum[2];
      } else if (node.value.startsWith("::")) elements += 1;
      else classes += 1;
    }
  }
  return [ids, classes, elements];
}

// Happy DOM drops some system color keywords. Evaluate this unlayered authored
// stylesheet instead: real parsed rules, DOM matching, importance, specificity,
// and source order. Admitted media conditions are explicit test inputs, not paint proof.
function authoredDeclaration(element: HTMLElement, property: string, activeMedia: readonly string[] = []): string | undefined {
  const stylesheet = postcss.parse(readFileSync(resolve(import.meta.dirname, "tabs.module.css"), "utf8"));
  let winner: {value: string; important: boolean; specificity: Specificity} | undefined;

  function visit(container: Container, parentSelectors: readonly string[] = []): void {
    container.each((node) => {
      if (node.type === "atrule") {
        if (node.name === "media" && activeMedia.includes(node.params)) visit(node, parentSelectors);
        return;
      }
      if (node.type === "rule") {
        const selectors = parentSelectors.length
          ? parentSelectors.flatMap((parent) =>
              node.selectors.map((child) => {
                const parsed = selectorParser().astSync(child);
                parsed.walkNesting((nesting) => {
                  const ancestor = selectorParser().astSync(parent).first;
                  nesting.replaceWith(...ancestor.nodes.map((part) => part.clone()));
                });
                return parsed.toString();
              }),
            )
          : node.selectors;
        visit(node, selectors);
        return;
      }
      if (node.type !== "decl" || node.prop !== property) return;
      for (const selector of parentSelectors) {
        const parsed = selectorParser().astSync(selector);
        parsed.walkClasses((classNode) => {
          const mapped = styles[classNode.value];
          if (!mapped) throw new Error(`Missing CSS Module class: ${classNode.value}`);
          classNode.value = mapped;
        });
        for (const candidate of parsed.nodes) {
          if (!element.matches(candidate.toString())) continue;
          const specificity = selectorSpecificity(candidate);
          const important = Boolean(node.important);
          if (
            !winner
            || (important && !winner.important)
            || (important === winner.important && compareSpecificity(specificity, winner.specificity) >= 0)
          ) {
            winner = {value: node.value, important, specificity};
          }
        }
      }
    });
  }

  visit(stylesheet);
  return winner?.value;
}

// Supply only DOM geometry; Base UI still owns measuring and updating the indicator.
function supplyTabGeometry(): void {
  const rectangles: Record<string, DOMRect> = {
    list: new DOMRect(10, 20, 240, 160),
    one: new DOMRect(14, 24, 80, 32),
    two: new DOMRect(106, 66, 120, 44),
  };
  const rectangleFor = (element: HTMLElement): DOMRect | undefined => rectangles[element.dataset.geometry ?? ""];
  const originalRectangle = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return rectangleFor(this) ?? originalRectangle.call(this);
  });
  for (const [property, dimension] of [
    ["offsetWidth", "width"],
    ["offsetHeight", "height"],
    ["scrollWidth", "width"],
    ["scrollHeight", "height"],
    ["offsetLeft", "x"],
    ["offsetTop", "y"],
  ] as const) {
    vi.spyOn(HTMLElement.prototype, property, "get").mockImplementation(function (this: HTMLElement) {
      return rectangleFor(this)?.[dimension] ?? 0;
    });
  }
}

function renderTabs(): {
  accountTab: HTMLElement;
  passwordTab: HTMLElement;
} {
  render(
    <Tabs
      defaultValue='account'
      className='custom-root'
      data-testid='tabs-root'>
      <TabsList
        className='custom-list'
        data-testid='tabs-list'>
        <TabsTrigger
          value='account'
          className='custom-trigger'>
          Account
        </TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
      </TabsList>
      <TabsContent
        value='account'
        className='custom-panel'
        data-testid='account-panel'>
        Account panel content
      </TabsContent>
      <TabsContent value='password'>Password panel content</TabsContent>
    </Tabs>,
  );

  return {
    accountTab: screen.getByRole("tab", {name: "Account"}),
    passwordTab: screen.getByRole("tab", {name: "Password"}),
  };
}

function renderThreeTabs(): {
  accountTab: HTMLElement;
  passwordTab: HTMLElement;
  settingsTab: HTMLElement;
} {
  render(
    <Tabs defaultValue='account'>
      <TabsList>
        <TabsTrigger value='account'>Account</TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
        <TabsTrigger value='settings'>Settings</TabsTrigger>
      </TabsList>
      <TabsContent value='account'>Account panel</TabsContent>
      <TabsContent value='password'>Password panel</TabsContent>
      <TabsContent value='settings'>Settings panel</TabsContent>
    </Tabs>,
  );

  return {
    accountTab: screen.getByRole("tab", {name: "Account"}),
    passwordTab: screen.getByRole("tab", {name: "Password"}),
    settingsTab: screen.getByRole("tab", {name: "Settings"}),
  };
}

describe("Tabs", () => {
  it("supplies the actual active Tab state", () => {
    render(
      <Tabs defaultValue='one'>
        <TabsList>
          <TabsTrigger
            value='one'
            render={(props, state) => (
              <button
                {...props}
                data-contract-active={String(state.active)}>
                One
              </button>
            )}
          />
        </TabsList>
        <TabsContent value='one'>Panel one</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole("tab", {name: "One"})).toHaveAttribute("data-contract-active", "true");
  });

  it("renders the tab structure, merges class names, and exposes accessible tab semantics", () => {
    // Arrange
    const {accountTab, passwordTab} = renderTabs();

    // Assert
    expect(screen.getByTestId("tabs-root")).toHaveClass("custom-root");
    expect(screen.getByTestId("tabs-list")).toHaveClass("custom-list");
    expect(accountTab).toHaveClass("custom-trigger");
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(accountTab).toHaveAttribute("aria-selected", "true");
    expect(passwordTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("account-panel")).toHaveClass("custom-panel");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Account panel content");
  });

  it("switches tabs when a trigger is clicked and renders the selected panel content", async () => {
    // Arrange
    const user = userEvent.setup();
    const {accountTab, passwordTab} = renderTabs();

    // Act
    await user.click(passwordTab);

    // Assert
    expect(accountTab).toHaveAttribute("aria-selected", "false");
    expect(passwordTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Password panel content");
  });

  it("calls onValueChange with the clicked tab value", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string) => void>();

    render(
      <Tabs
        defaultValue='account'
        onValueChange={handleValueChange}>
        <TabsList>
          <TabsTrigger value='account'>Account</TabsTrigger>
          <TabsTrigger value='password'>Password</TabsTrigger>
        </TabsList>
        <TabsContent value='account'>Account panel content</TabsContent>
        <TabsContent value='password'>Password panel content</TabsContent>
      </Tabs>,
    );

    // Act
    await user.click(screen.getByRole("tab", {name: "Password"}));

    // Assert
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toBe("password");
  });

  it("supports arrow-key navigation and activation from the keyboard", async () => {
    // Arrange
    const user = userEvent.setup();
    const {accountTab, passwordTab} = renderTabs();

    await act(async () => {
      accountTab.focus();
    });

    // Act
    await user.keyboard("{ArrowRight}{Enter}");

    // Assert
    expect(passwordTab).toHaveFocus();
    expect(passwordTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Password panel content");
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string) => void>();

    function ControlledTabs(): React.JSX.Element {
      const [value, setValue] = React.useState("account");

      return (
        <Tabs
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            handleValueChange(nextValue);
          }}>
          <TabsList>
            <TabsTrigger value='account'>Account</TabsTrigger>
            <TabsTrigger value='password'>Password</TabsTrigger>
          </TabsList>
          <TabsContent value='account'>Account content</TabsContent>
          <TabsContent value='password'>Password content</TabsContent>
        </Tabs>
      );
    }

    render(<ControlledTabs />);

    const accountTab = screen.getByRole("tab", {name: "Account"});
    const passwordTab = screen.getByRole("tab", {name: "Password"});

    expect(accountTab).toHaveAttribute("aria-selected", "true");
    expect(passwordTab).toHaveAttribute("aria-selected", "false");

    // Act
    await user.click(passwordTab);

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith("password");
    expect(accountTab).toHaveAttribute("aria-selected", "false");
    expect(passwordTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Password content");
  });

  it("moves focus to the first tab when Home is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    const {settingsTab} = renderThreeTabs();

    // Start focus on the last tab
    await act(async () => {
      settingsTab.focus();
    });

    // Act — Home should jump directly to the first tab in the list
    await user.keyboard("{Home}");

    // Assert
    expect(screen.getByRole("tab", {name: "Account"})).toHaveFocus();
  });

  it("moves focus to the last tab when End is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    const {accountTab, settingsTab} = renderThreeTabs();

    // Start focus on the first tab
    await act(async () => {
      accountTab.focus();
    });

    // Act — End should jump directly to the last tab in the list
    await user.keyboard("{End}");

    // Assert
    expect(settingsTab).toHaveFocus();
  });

  it("wraps keyboard focus from the last tab to the first tab", async () => {
    const user = userEvent.setup();
    const {accountTab, settingsTab} = renderThreeTabs();
    await act(async () => {
      settingsTab.focus();
    });

    await user.keyboard("{ArrowRight}");

    expect(accountTab).toHaveFocus();
  });

  it("keeps arrow focus separate from selection until Space activates the tab", async () => {
    const user = userEvent.setup();
    const {accountTab, passwordTab} = renderTabs();
    await act(async () => {
      accountTab.focus();
    });

    await user.keyboard("{ArrowRight}");
    expect(passwordTab).toHaveFocus();
    expect(accountTab).toHaveAttribute("aria-selected", "true");
    await user.keyboard(" ");
    expect(passwordTab).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}{Enter}");
    expect(accountTab).toHaveFocus();
    expect(accountTab).toHaveAttribute("aria-selected", "true");
  });

  it("preserves vertical orientation, automatic keyboard activation, and Home/End", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        defaultValue='one'
        orientation='vertical'>
        <TabsList activateOnFocus>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger value='two'>Two</TabsTrigger>
          <TabsTrigger value='three'>Three</TabsTrigger>
        </TabsList>
        <TabsContent value='one'>Panel one</TabsContent>
        <TabsContent value='two'>Panel two</TabsContent>
        <TabsContent value='three'>Panel three</TabsContent>
      </Tabs>,
    );
    const one = screen.getByRole("tab", {name: "One"});
    const two = screen.getByRole("tab", {name: "Two"});
    const three = screen.getByRole("tab", {name: "Three"});
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    expect(one).toHaveAttribute("data-orientation", "vertical");
    await act(async () => {
      one.focus();
    });

    await user.keyboard("{ArrowRight}");
    expect(one).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(two).toHaveFocus();
    expect(two).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
    await user.keyboard("{End}");
    expect(three).toHaveFocus();
    expect(three).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowUp}");
    expect(two).toHaveFocus();
    await user.keyboard("{Home}");
    expect(one).toHaveFocus();
    expect(one).toHaveAttribute("aria-selected", "true");
  });

  it("forwards loopFocus=false without changing keyboard selection behavior", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue='one'>
        <TabsList loopFocus={false}>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger value='two'>Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const two = screen.getByRole("tab", {name: "Two"});
    await act(async () => {
      two.focus();
    });
    await user.keyboard("{ArrowRight}");
    expect(two).toHaveFocus();
    expect(two).toHaveAttribute("aria-selected", "false");
  });

  it("preserves focusable disabled native tabs without activating them", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue='one'>
        <TabsList activateOnFocus>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger
            value='disabled'
            disabled
            render={(props, state) => (
              <button
                {...props}
                data-contract-disabled={String(state.disabled)}>
                Disabled
              </button>
            )}
          />
          <TabsTrigger value='three'>Three</TabsTrigger>
        </TabsList>
        <TabsContent value='one'>Panel one</TabsContent>
        <TabsContent value='disabled'>Unavailable panel</TabsContent>
        <TabsContent value='three'>Panel three</TabsContent>
      </Tabs>,
    );
    const one = screen.getByRole("tab", {name: "One"});
    const disabled = screen.getByRole("tab", {name: "Disabled"});
    const three = screen.getByRole("tab", {name: "Three"});
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    expect(disabled).toHaveAttribute("data-disabled");
    expect(disabled).toHaveAttribute("data-contract-disabled", "true");
    await user.click(disabled);
    expect(one).toHaveAttribute("aria-selected", "true");
    await act(async () => {
      one.focus();
    });
    await user.keyboard("{ArrowRight}");
    expect(disabled).toHaveFocus();
    expect(disabled).toHaveAttribute("aria-selected", "false");
    expect(one).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter} {ArrowRight}");
    expect(three).toHaveFocus();
    expect(three).toHaveAttribute("aria-selected", "true");
  });

  it("keeps a disabled non-native render target inactive on pointer and keyboard input", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue='one'>
        <TabsList>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger
            value='two'
            disabled
            nativeButton={false}
            render={<a href='#two' />}>
            Disabled link
          </TabsTrigger>
        </TabsList>
        <TabsContent value='one'>Panel one</TabsContent>
        <TabsContent value='two'>Panel two</TabsContent>
      </Tabs>,
    );
    const disabled = screen.getByRole("tab", {name: "Disabled link"});
    expect(disabled.tagName).toBe("A");
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    expect(disabled).not.toHaveAttribute("disabled");
    await user.click(disabled);
    await act(async () => {
      disabled.focus();
    });
    await user.keyboard("{Enter} ");
    expect(disabled).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
  });

  it("keeps controlled selection unchanged when the controller declines a request", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs
        value='one'
        onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger value='two'>Two</TabsTrigger>
        </TabsList>
        <TabsContent value='one'>Panel one</TabsContent>
        <TabsContent value='two'>Panel two</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", {name: "Two"}));
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBe("two");
    expect(onValueChange.mock.calls.at(-1)?.[1]).toMatchObject({reason: "none"});
    expect(screen.getByRole("tab", {name: "One"})).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
  });

  it("allows the primitive onValueChange details to cancel an uncontrolled change", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        defaultValue='one'
        onValueChange={(_value, details) => details.cancel()}>
        <TabsList>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger value='two'>Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", {name: "Two"}));
    expect(screen.getByRole("tab", {name: "One"})).toHaveAttribute("aria-selected", "true");
  });

  it("passes current root, list, tab, and panel state to render and class callbacks on rerender", async () => {
    function Fixture({
      value,
      orientation,
      variant,
    }: Readonly<{
      value: string;
      orientation: "horizontal" | "vertical";
      variant: "default" | "line";
    }>): React.JSX.Element {
      return (
        <Tabs
          value={value}
          orientation={orientation}
          className={(state) => `root-${state.orientation}`}
          render={(props, state) => (
            <section
              {...props}
              data-testid='callback-root'
              data-direction={state.tabActivationDirection}
              data-contract-orientation={state.orientation}
            />
          )}>
          <TabsList
            variant={variant}
            className={(state) => `list-${state.orientation}-${state.variant}`}
            render={(props, state) => (
              <nav
                {...props}
                data-contract-orientation={state.orientation}
                data-contract-variant={state.variant}
              />
            )}>
            <TabsTrigger
              value='one'
              className={(state) => (state.active ? "active-tab" : undefined)}
              render={(props, state) => (
                <button
                  {...props}
                  data-contract-active={String(state.active)}
                  data-contract-orientation={state.orientation}
                />
              )}>
              One
            </TabsTrigger>
            <TabsTrigger value='two'>Two</TabsTrigger>
          </TabsList>
          <TabsContent
            value='one'
            keepMounted
            className={(state) => (state.hidden ? "hidden-panel" : "visible-panel")}
            render={(props, state) => (
              <article
                {...props}
                data-testid='callback-panel'
                data-contract-hidden={String(state.hidden)}
                data-contract-orientation={state.orientation}
                data-contract-transition={String(state.transitionStatus)}
              />
            )}>
            Panel one
          </TabsContent>
          <TabsContent value='two'>Panel two</TabsContent>
        </Tabs>
      );
    }
    const {rerender} = render(
      <Fixture
        value='one'
        orientation='horizontal'
        variant='default'
      />,
    );
    const root = screen.getByTestId("callback-root");
    const list = screen.getByRole("tablist");
    const one = screen.getByRole("tab", {name: "One"});
    const panel = screen.getByTestId("callback-panel");
    expect(root).toHaveClass(requiredClass("root"), "root-horizontal");
    expect(root).toHaveAttribute("data-contract-orientation", "horizontal");
    expect(root).toHaveAttribute("data-direction", "none");
    expect(list).toHaveClass(requiredClass("list"), requiredClass("default"), "list-horizontal-default");
    expect(list).toHaveAttribute("data-contract-variant", "default");
    expect(one).toHaveClass(requiredClass("tab"), "active-tab");
    expect(one).toHaveAttribute("data-contract-active", "true");
    expect(panel).toHaveClass(requiredClass("panel"), "visible-panel");
    expect(panel).toHaveAttribute("data-contract-hidden", "false");
    expect(panel).toHaveAttribute("data-contract-transition", "undefined");
    expect(panel).not.toHaveAttribute("hidden");

    rerender(
      <Fixture
        value='two'
        orientation='vertical'
        variant='line'
      />,
    );
    expect(root).toHaveClass("root-vertical");
    expect(root).toHaveAttribute("data-contract-orientation", "vertical");
    expect(list).toHaveClass(requiredClass("line"), "list-vertical-line");
    expect(list).toHaveAttribute("aria-orientation", "vertical");
    expect(list).toHaveAttribute("data-contract-variant", "line");
    expect(one).not.toHaveClass("active-tab");
    expect(one).toHaveAttribute("data-contract-active", "false");
    expect(one).toHaveAttribute("data-contract-orientation", "vertical");
    expect(panel).toHaveAttribute("data-contract-hidden", "false");
    expect(panel).toHaveAttribute("data-contract-transition", "ending");
    await waitFor(() => expect(panel).toHaveClass("hidden-panel"));
    expect(panel).toHaveAttribute("data-contract-hidden", "true");
    expect(panel).toHaveAttribute("data-contract-orientation", "vertical");
    expect(panel).toHaveAttribute("hidden");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
  });

  it("merges element render targets, wrapper and child refs, classes, handlers, and content", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLDivElement>();
    const listRef = React.createRef<HTMLDivElement>();
    const tabRef = React.createRef<HTMLElement>();
    const childTabRef = React.createRef<HTMLButtonElement>();
    const panelRef = React.createRef<HTMLDivElement>();
    const childRootRef = React.createRef<HTMLElement>();
    const childListRef = React.createRef<HTMLElement>();
    const childPanelRef = React.createRef<HTMLElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <Tabs
        ref={rootRef}
        defaultValue='one'
        className='wrapper-root'
        render={
          <section
            ref={childRootRef}
            className='child-root'
            data-testid='element-root'
          />
        }>
        <TabsList
          ref={listRef}
          className='wrapper-list'
          render={
            <nav
              ref={childListRef}
              className='child-list'
            />
          }>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger
            ref={tabRef}
            value='two'
            className='wrapper-tab'
            onClick={() => calls.push("wrapper")}
            render={
              <button
                ref={childTabRef}
                className='child-tab'
                onClick={() => calls.push("child")}
              />
            }>
            Two
          </TabsTrigger>
        </TabsList>
        <TabsContent value='one'>Panel one</TabsContent>
        <TabsContent
          ref={panelRef}
          value='two'
          className='wrapper-panel'
          render={
            <article
              ref={childPanelRef}
              className='child-panel'
            />
          }>
          Panel two
        </TabsContent>
      </Tabs>,
    );
    const root = screen.getByTestId("element-root");
    const list = screen.getByRole("tablist");
    const tab = screen.getByRole("tab", {name: "Two"});
    expect(rootRef.current).toBe(root);
    expect(childRootRef.current).toBe(root);
    expect(root).toHaveClass(requiredClass("root"), "wrapper-root", "child-root");
    expect(listRef.current).toBe(list);
    expect(childListRef.current).toBe(list);
    expect(list).toHaveClass(requiredClass("list"), "wrapper-list", "child-list");
    expect(tabRef.current).toBe(tab);
    expect(childTabRef.current).toBe(tab);
    expect(tab).toHaveClass(requiredClass("tab"), "wrapper-tab", "child-tab");
    await user.click(tab);
    expect(calls).toEqual(["child", "wrapper"]);
    const panel = screen.getByRole("tabpanel");
    expect(panelRef.current).toBe(panel);
    expect(childPanelRef.current).toBe(panel);
    expect(panel).toHaveClass(requiredClass("panel"), "wrapper-panel", "child-panel");
    expect(panel).toHaveTextContent("Panel two");
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    unmount();
    expect(rootRef.current).toBeNull();
    expect(listRef.current).toBeNull();
    expect(tabRef.current).toBeNull();
    expect(panelRef.current).toBeNull();
  });

  it("supports event cancellation on a composed tab without overriding primitive selection", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue='one'>
        <TabsList>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger
            value='two'
            onClick={(event) => event.preventBaseUIHandler()}
            render={<button />}>
            Cancelled
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", {name: "Cancelled"}));
    expect(screen.getByRole("tab", {name: "One"})).toHaveAttribute("aria-selected", "true");
  });

  it("forwards refs through primitive-owned function render callbacks", () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const listRef = React.createRef<HTMLDivElement>();
    const tabRef = React.createRef<HTMLElement>();
    const panelRef = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <Tabs
        ref={rootRef}
        defaultValue='one'
        render={(props) => (
          <div
            {...props}
            data-testid='function-root'
          />
        )}>
        <TabsList
          ref={listRef}
          render={(props) => <div {...props} />}>
          <TabsTrigger
            ref={tabRef}
            value='one'
            render={(props) => <button {...props} />}>
            One
          </TabsTrigger>
        </TabsList>
        <TabsContent
          ref={panelRef}
          value='one'
          render={(props) => <div {...props} />}>
          Panel one
        </TabsContent>
      </Tabs>,
    );
    expect(rootRef.current).toBe(screen.getByTestId("function-root"));
    expect(listRef.current).toBe(screen.getByRole("tablist"));
    expect(tabRef.current).toBe(screen.getByRole("tab", {name: "One"}));
    expect(panelRef.current).toBe(screen.getByRole("tabpanel"));
    unmount();
    expect(rootRef.current).toBeNull();
    expect(listRef.current).toBeNull();
    expect(tabRef.current).toBeNull();
    expect(panelRef.current).toBeNull();
  });

  it("keeps default tab triggers from submitting a surrounding form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Tabs defaultValue='one'>
          <TabsList>
            <TabsTrigger value='one'>One</TabsTrigger>
            <TabsTrigger value='two'>Two</TabsTrigger>
          </TabsList>
          <TabsContent value='one'>Panel one</TabsContent>
          <TabsContent value='two'>Panel two</TabsContent>
        </Tabs>
      </form>,
    );
    const two = screen.getByRole("tab", {name: "Two"});
    expect(two).toHaveAttribute("type", "button");
    await user.click(two);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(two).toHaveAttribute("aria-selected", "true");
  });
});

describe("TabsList variants and indicator", () => {
  it.each(["ltr", "rtl"] as const)(
    "uses overflow-safe centering and keeps the ManyTabs endpoints keyboard reachable (%s)",
    async (direction) => {
      const user = userEvent.setup();
      const {ManyTabs} = composeStories(stories);
      render(
        <DirectionProvider direction={direction}>
          <ManyTabs />
        </DirectionProvider>,
      );
      const list = screen.getByRole("tablist");
      // CSS contract only: safe center centers fitting content and falls back to
      // logical start on overflow. Happy DOM cannot prove scroll or pixel reachability.
      expect(authoredDeclaration(list, "justify-content")).toBe("safe center");
      expect(authoredDeclaration(list, "max-width")).toBe("100%");
      expect(getComputedStyle(list).overflowX).toBe("auto");
      const first = screen.getByRole("tab", {name: "Tab 1"});
      const last = screen.getByRole("tab", {name: "Tab 10"});
      await user.tab();
      expect(first).toHaveFocus();
      await user.keyboard("{End}{Enter}");
      expect(last).toHaveFocus();
      expect(last).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Content for Tab 10");
      await user.keyboard("{Home}{Enter}");
      expect(first).toHaveFocus();
      expect(first).toHaveAttribute("aria-selected", "true");
      await user.keyboard(direction === "rtl" ? "{ArrowLeft}" : "{ArrowRight}");
      expect(screen.getByRole("tab", {name: "Tab 2"})).toHaveFocus();
    },
  );

  it.each([
    ["horizontal", "default"],
    ["vertical", "default"],
    ["horizontal", "line"],
    ["vertical", "line"],
  ] as const)("uses winning system-color declarations for %s %s selection in forced colors", async (orientation, variant) => {
    supplyTabGeometry();
    const user = userEvent.setup();
    const media = ["(forced-colors: active)"];
    render(
      <Tabs
        defaultValue='one'
        orientation={orientation}>
        <TabsList
          variant={variant}
          data-geometry='list'>
          <TabsTrigger
            value='one'
            data-geometry='one'>
            One
          </TabsTrigger>
          <TabsTrigger
            value='two'
            data-geometry='two'>
            Two
          </TabsTrigger>
        </TabsList>
        <TabsContent value='one'>Panel one</TabsContent>
        <TabsContent value='two'>Panel two</TabsContent>
      </Tabs>,
    );
    const indicator = screen.getByRole("presentation");
    const one = screen.getByRole("tab", {name: "One"});
    const two = screen.getByRole("tab", {name: "Two"});
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", variant);
    expect(indicator).toHaveAttribute("data-orientation", orientation);
    expect(one).toHaveAttribute("data-active");
    expect(authoredDeclaration(indicator, "background-color")).toBe(variant === "line" ? "var(--ac-foreground)" : "var(--ac-background)");
    expect(authoredDeclaration(indicator, "background-color", media)).toBe("Highlight");
    expect(authoredDeclaration(indicator, "forced-color-adjust", media)).toBe("none");
    expect(authoredDeclaration(one, "color", media)).toBe(variant === "default" ? "HighlightText" : "CanvasText");
    expect(authoredDeclaration(indicator, "box-shadow", media)).toBe("none");

    await user.click(two);
    expect(one).not.toHaveAttribute("data-active");
    expect(two).toHaveAttribute("data-active");
    expect(two).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
    expect(authoredDeclaration(indicator, "background-color", media)).toBe("Highlight");
    expect(authoredDeclaration(two, "color", media)).toBe(variant === "default" ? "HighlightText" : "CanvasText");
  });

  it.each(["horizontal", "vertical"] as const)(
    "keeps the selected %s default tab on system colours while the indicator is unmeasured and hidden in forced colors",
    async (orientation) => {
      // Without supplied geometry Base UI cannot measure the active tab, so it keeps the indicator `hidden`.
      const user = userEvent.setup();
      const media = ["(forced-colors: active)"];
      render(
        <Tabs
          defaultValue='one'
          orientation={orientation}>
          <TabsList>
            <TabsTrigger value='one'>One</TabsTrigger>
            <TabsTrigger value='two'>Two</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const indicator = screen.getByRole("presentation", {hidden: true});
      const one = screen.getByRole("tab", {name: "One"});
      const two = screen.getByRole("tab", {name: "Two"});
      expect(indicator).toHaveAttribute("hidden");
      expect(one).toHaveAttribute("data-active");
      // HighlightText without its Highlight backplate would sit on Canvas; leave the system colours in charge instead.
      expect(authoredDeclaration(one, "color", media)).not.toBe("HighlightText");
      expect(authoredDeclaration(one, "forced-color-adjust", media)).toBeUndefined();
      await user.click(two);
      expect(two).toHaveAttribute("data-active");
      expect(indicator).toHaveAttribute("hidden");
      expect(authoredDeclaration(two, "color", media)).not.toBe("HighlightText");
      expect(authoredDeclaration(two, "forced-color-adjust", media)).toBeUndefined();
    },
  );

  it("keeps the selected default tab on system colours in server HTML, before the indicator is measured", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <Tabs defaultValue='one'>
        <TabsList>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger value='two'>Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    document.body.append(container);
    try {
      const media = ["(forced-colors: active)"];
      const indicator = container.querySelector<HTMLElement>('[data-slot="tabs-indicator"]');
      const one = container.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-active]');
      if (!indicator || !one) throw new Error("Missing server-rendered indicator or active tab");
      expect(indicator).toHaveAttribute("hidden");
      expect(one).toHaveTextContent("One");
      expect(authoredDeclaration(one, "color", media)).not.toBe("HighlightText");
      expect(authoredDeclaration(one, "forced-color-adjust", media)).toBeUndefined();
    } finally {
      container.remove();
    }
  });

  it("snaps the forced-colors backplate under the newly selected tab instead of sliding it", () => {
    supplyTabGeometry();
    render(
      <Tabs defaultValue='one'>
        <TabsList data-geometry='list'>
          <TabsTrigger
            value='one'
            data-geometry='one'>
            One
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const indicator = screen.getByRole("presentation");
    expect(authoredDeclaration(indicator, "transition-duration")).toBe("200ms");
    expect(authoredDeclaration(indicator, "transition", ["(forced-colors: active)"])).toBe("none");
  });

  it("uses the existing semantic foreground token for the default indicator shadow", () => {
    supplyTabGeometry();
    render(
      <Tabs defaultValue='one'>
        <TabsList data-geometry='list'>
          <TabsTrigger
            value='one'
            data-geometry='one'>
            One
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(authoredDeclaration(screen.getByRole("presentation"), "box-shadow")).toBe(
      "0 1px 2px color-mix(in oklch, var(--ac-foreground), transparent 95%)",
    );
  });

  it("exports a CSS Module variant generator with default and consumer classes", () => {
    expect(TabsModule.tabsListVariants()).toContain(requiredClass("list"));
    expect(TabsModule.tabsListVariants()).toContain(requiredClass("default"));
    expect(TabsModule.tabsListVariants({className: "consumer"})).toContain("consumer");
    expect(TabsModule.tabsListVariants({variant: "line"})).toContain(requiredClass("line"));
    expect(TabsModule.tabsListVariants({variant: "line"})).not.toContain(requiredClass("default"));
  });

  it.each(["default", "line"] as const)("renders the %s list variant with one shared indicator", (variant) => {
    render(
      <Tabs defaultValue='one'>
        <TabsList
          variant={variant}
          className='consumer'>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger value='two'>Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list).toHaveClass(requiredClass("list"), requiredClass(variant), "consumer");
    expect(list).toHaveAttribute("data-variant", variant);
    expect(list.querySelectorAll('[role="presentation"]')).toHaveLength(1);
    expect(list.querySelector('[role="presentation"]')).toHaveClass(requiredClass("indicator"));
  });

  it("uses the default list variant when omitted", () => {
    renderTabs();
    expect(screen.getByRole("tablist")).toHaveClass(requiredClass("default"));
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "default");
  });

  it.each([
    ["horizontal", "default"],
    ["vertical", "default"],
    ["horizontal", "line"],
    ["vertical", "line"],
  ] as const)("exposes primitive measurement variables for %s %s tabs under supplied geometry", async (orientation, variant) => {
    supplyTabGeometry();
    const user = userEvent.setup();
    render(
      <Tabs
        defaultValue='one'
        orientation={orientation}>
        <TabsList
          variant={variant}
          data-geometry='list'>
          <TabsTrigger
            value='one'
            data-geometry='one'>
            One
          </TabsTrigger>
          <TabsTrigger
            value='two'
            data-geometry='two'>
            Two
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const indicator = screen.getByRole("presentation");
    expect(indicator).toHaveAttribute("data-orientation", orientation);
    expect(indicator).not.toHaveAttribute("hidden");
    expect(indicator.style.getPropertyValue("--active-tab-left")).toBe("4px");
    expect(indicator.style.getPropertyValue("--active-tab-top")).toBe("4px");
    expect(indicator.style.getPropertyValue("--active-tab-width")).toBe("80px");
    expect(indicator.style.getPropertyValue("--active-tab-height")).toBe("32px");
    await user.click(screen.getByRole("tab", {name: "Two"}));
    expect(indicator.style.getPropertyValue("--active-tab-left")).toBe("96px");
    expect(indicator.style.getPropertyValue("--active-tab-top")).toBe("46px");
    expect(indicator.style.getPropertyValue("--active-tab-right")).toBe("24px");
    expect(indicator.style.getPropertyValue("--active-tab-bottom")).toBe("70px");
    expect(indicator.style.getPropertyValue("--active-tab-width")).toBe("120px");
    expect(indicator.style.getPropertyValue("--active-tab-height")).toBe("44px");
  });

  it("does not invent an indicator when controlled selection is null", () => {
    render(
      <Tabs value={null}>
        <TabsList>
          <TabsTrigger value='one'>One</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.queryByRole("presentation", {hidden: true})).not.toBeInTheDocument();
    expect(screen.getByRole("tab", {name: "One"})).toHaveAttribute("aria-selected", "false");
  });

  it("maps CSS layout and shared indicator dimensions to the primitive orientation and variables", () => {
    expect(cssDeclaration(".root", "flex-direction")).toBe("column");
    expect(cssDeclaration('.root[data-orientation="vertical"]', "flex-direction")).toBe("row");
    expect(cssDeclaration('.list[data-orientation="vertical"]', "flex-direction")).toBe("column");
    expect(cssDeclaration(".indicator", "translate")).toBe("var(--active-tab-left) var(--active-tab-top)");
    expect(cssDeclaration(".indicator", "width")).toBe("var(--active-tab-width)");
    expect(cssDeclaration(".indicator", "height")).toBe("var(--active-tab-height)");
    expect(cssDeclaration('.line[data-orientation="horizontal"] .indicator', "translate")).toBe("var(--active-tab-left) 0");
    expect(cssDeclaration('.line[data-orientation="horizontal"] .indicator', "height")).toBe("2px");
    expect(cssDeclaration('.line[data-orientation="vertical"] .indicator', "translate")).toBe("0 var(--active-tab-top)");
    expect(cssDeclaration('.line[data-orientation="vertical"] .indicator', "width")).toBe("2px");
    expect(cssDeclaration('.line[data-orientation="vertical"] .indicator', "height")).toBe("var(--active-tab-height)");
    expect(cssDeclaration(".indicator[hidden]", "display")).toBe("none");
  });
});
