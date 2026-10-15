import {Menu as BaseMenu} from "@base-ui/react/menu";
import {Field as BaseField} from "@base-ui/react/field";
import {useDirection} from "@base-ui/react/direction-provider";
import {mergeProps} from "@base-ui/react/merge-props";
import type {BaseUIEvent, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import type {getRole as NativeRoleOracle} from "dom-accessibility-api" with {"resolution-mode": "require"};
import {act, cleanup, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {join} from "node:path";
import {AtRule, parse, root, type Node} from "postcss";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./sidebar";
import styles from "./sidebar.module.css";
import * as stories from "./sidebar.stories";

const stylesheet = readFileSync(join(import.meta.dirname, "sidebar.module.css"), "utf8");
const accessibilityApi: unknown = createRequire(join(import.meta.dirname, "..", "..", "..", "package.json"))("dom-accessibility-api");
function hasNativeRoleOracle(value: unknown): value is Readonly<{getRole: typeof NativeRoleOracle}> {
  return typeof value === "object" && value !== null && "getRole" in value && typeof value.getRole === "function";
}
if (!hasNativeRoleOracle(accessibilityApi)) throw new TypeError("The real DOM accessibility API must expose getRole.");
const {getRole} = accessibilityApi;
let changeMobile: (mobile: boolean) => void;
let mobileQuery: MediaQueryList;
const stylesheetFixtures: HTMLStyleElement[] = [];

describe("Sidebar primitive-owned class callbacks", () => {
  it("keeps callback-only desktop state uncontrolled through trigger, rail, and shortcut toggles", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <SidebarProvider onOpenChange={onOpenChange}>
        <SidebarTrigger />
        <SidebarRail />
      </SidebarProvider>,
    );
    const [trigger, rail] = screen.getAllByRole("button", {name: "Toggle Sidebar"});
    await user.click(trigger!);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(rail!);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Control>}b{/Control}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onOpenChange.mock.calls).toEqual([[false], [true], [false]]);
  });

  it("does not commit controlled proposals until the open prop changes", async () => {
    const onOpenChange = vi.fn();
    const view = (open: boolean): React.ReactElement => (
      <SidebarProvider
        open={open}
        onOpenChange={onOpenChange}>
        <SidebarTrigger />
      </SidebarProvider>
    );
    const {rerender} = render(view(true));
    const trigger = screen.getByRole("button", {name: "Toggle Sidebar"});
    await userEvent.setup().click(trigger);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    rerender(view(false));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("refresh accessibility: exposes toggle state and a keyboard-reachable Rail", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <SidebarTrigger />
        <SidebarRail />
      </SidebarProvider>,
    );
    const [trigger, rail] = screen.getAllByRole("button", {name: "Toggle Sidebar"});
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(rail).toHaveAttribute("aria-expanded", "true");
    expect(rail?.tabIndex).toBe(0);
    await user.click(trigger!);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(rail).toHaveAttribute("aria-expanded", "false");
    await user.tab();
    expect(rail).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("refresh accessibility: localizes the mobile panel title and description", async () => {
    changeMobile(true);
    render(
      <SidebarProvider>
        <Sidebar
          mobileTitle='Navigation principale'
          mobileDescription='Choisissez une destination.'>
          <SidebarMenuButton>Accueil</SidebarMenuButton>
        </Sidebar>
        <SidebarTrigger aria-label='Ouvrir la navigation' />
      </SidebarProvider>,
    );
    await userEvent.setup().click(screen.getByRole("button", {name: "Ouvrir la navigation"}));
    expect(await screen.findByRole("dialog", {name: "Navigation principale"})).toHaveAccessibleDescription("Choisissez une destination.");
  });

  it("refresh accessibility: authors minimum control targets and hides offcanvas content without hiding the Rail", () => {
    expect(stylesheet).toMatch(/\.groupAction\s*\{[^}]*width:\s*1\.5rem/u);
    expect(stylesheet).toMatch(/\.menuAction\s*\{[^}]*width:\s*1\.5rem/u);
    expect(stylesheet).toMatch(/\.rail\s*\{[^}]*width:\s*1\.5rem/u);
    expect(stylesheet).toMatch(/\.desktopRoot\[data-collapsible="offcanvas"\]\s+\.panelWrap\s*\{[^}]*visibility:\s*hidden/u);
    expect(stylesheet).toMatch(/\.rail\s*\{[^}]*visibility:\s*visible/u);
    expect(stylesheet).toMatch(
      /\.desktopRoot\[data-collapsible="offcanvas"\]\[data-side="left"\]\s+\.rail\s*\{[^}]*inset-inline-end:\s*-1\.5rem/u,
    );
    expect(stylesheet).toMatch(
      /\.desktopRoot\[data-collapsible="offcanvas"\]\[data-side="right"\]\s+\.rail\s*\{[^}]*inset-inline-start:\s*-1\.5rem/u,
    );
  });

  it("resolves Input classes using the actual focused and invalid Field state", async () => {
    const user = userEvent.setup();
    const states: Array<{focused: boolean; disabled: boolean}> = [];
    render(
      <BaseField.Root invalid>
        <SidebarInput
          aria-label='Stateful search'
          className={(state) => {
            states.push(state);
            return state.focused ? "consumer-focused" : "consumer-idle";
          }}
        />
      </BaseField.Root>,
    );
    const input = screen.getByRole("textbox", {name: "Stateful search"});
    expect(input).toHaveClass(styles["input"]!, "consumer-idle");
    await user.click(input);
    expect(input).toHaveClass("consumer-focused");
    expect(states.at(-1)).toMatchObject({focused: true, disabled: false, valid: false});
    await user.tab();
    expect(input).toHaveClass("consumer-idle");
  });

  it("resolves Separator classes from the actual orientation on each rerender", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {rerender} = render(
      <SidebarSeparator
        ref={ref}
        orientation='vertical'
        className={(state) => `consumer-${state.orientation}`}
      />,
    );
    expect(ref.current).toHaveClass(styles["separator"]!, "consumer-vertical");
    rerender(
      <SidebarSeparator
        ref={ref}
        orientation='horizontal'
        className={(state) => `consumer-${state.orientation}`}
      />,
    );
    expect(ref.current).toHaveClass("consumer-horizontal");
    expect(ref.current).not.toHaveClass("consumer-vertical");
  });
});

function installDesktopStyles(): void {
  const desktopStyles = root();
  parse(stylesheet).walkRules((rule) => {
    let parent: Node["parent"] = rule.parent;
    while (parent) {
      if (parent instanceof AtRule && parent.name === "media" && !parent.params.startsWith("(min-width:")) return;
      parent = parent.parent;
    }
    const selector = rule.selector.replaceAll(/\.([a-zA-Z_][\w-]*)/gu, (match: string, name: string): string =>
      styles[name] ? `.${styles[name]}` : match,
    );
    desktopStyles.append(rule.clone({selector}));
  });
  const style = document.createElement("style");
  style.textContent = desktopStyles.toString();
  document.head.append(style);
  stylesheetFixtures.push(style);
}

beforeEach(() => {
  const originalMatchMedia = globalThis.window.matchMedia.bind(globalThis.window);
  const media = originalMatchMedia("(max-width: 767px)");
  mobileQuery = media;
  let mobile = false;
  vi.spyOn(media, "matches", "get").mockImplementation(() => mobile);
  vi.spyOn(globalThis.window, "matchMedia").mockImplementation((query) => (query === media.media ? media : originalMatchMedia(query)));
  changeMobile = (nextMobile): void => {
    mobile = nextMobile;
    act(() => media.dispatchEvent(new MediaQueryListEvent("change", {matches: mobile, media: media.media})));
  };
});

afterEach(() => {
  cleanup();
  for (const style of stylesheetFixtures.splice(0)) style.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function ContextProbe(): React.JSX.Element {
  const {open, state, isMobile, openMobile} = useSidebar();
  return <output data-testid='state'>{JSON.stringify({open, state, isMobile, openMobile})}</output>;
}

function DirectionProbe(): React.JSX.Element {
  return <output data-testid='direction'>{useDirection()}</output>;
}

const ReviewAnchor = ({
  ref,
  childRef,
  ...props
}: Readonly<React.ComponentPropsWithRef<"a"> & {childRef?: React.Ref<HTMLAnchorElement>}>): React.JSX.Element => {
  const id = React.useId();
  return useRender<Record<string, never>, HTMLAnchorElement>({
    defaultTagName: "a",
    ref: childRef ? [ref, childRef] : ref,
    props: {...props, id: props.id ?? id},
  });
};
ReviewAnchor.displayName = "ReviewAnchor";

const ReviewNonAnchor = ({ref, ...props}: Readonly<React.ComponentPropsWithRef<"div">>): React.JSX.Element => {
  const id = React.useId();
  return (
    <div
      {...props}
      id={props.id ?? id}
      ref={ref}
    />
  );
};
ReviewNonAnchor.displayName = "ReviewNonAnchor";

const ReviewNativeButton = ({ref, ...props}: Readonly<React.ComponentPropsWithRef<"button">>): React.JSX.Element => (
  <button
    {...props}
    ref={ref}
  />
);
ReviewNativeButton.displayName = "ReviewNativeButton";

function expectState(expected: Readonly<{open: boolean; state: string; isMobile: boolean; openMobile: boolean}>): void {
  expect(screen.getByTestId("state")).toHaveTextContent(JSON.stringify(expected));
}

function renderNavigation(props: Readonly<React.ComponentProps<typeof SidebarProvider>> = {}): ReturnType<typeof render> {
  return render(
    <SidebarProvider {...props}>
      <Sidebar collapsible='icon'>
        <SidebarHeader>
          <SidebarInput aria-label='Search navigation' />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip='Home details'
                render={<a href='#home'>Home</a>}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenuButton>Help</SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <button type='button'>Outside action</button>
        <ContextProbe />
      </SidebarInset>
    </SidebarProvider>,
  );
}

describe("Sidebar original-child composition", () => {
  it("renders a composed sidebar anchor once, not inside another anchor", () => {
    render(
      <SidebarProvider>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href='#home'>Home</a>} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarProvider>,
    );
    expect(screen.getAllByRole("link", {name: "Home"})).toHaveLength(1);
  });

  const composedParts = [
    ["group-label", SidebarGroupLabel],
    ["group-action", SidebarGroupAction],
    ["menu-button", SidebarMenuButton],
    ["menu-action", SidebarMenuAction],
    ["menu-sub-button", SidebarMenuSubButton],
  ] as const;

  it.each(composedParts)("preserves the single original %s child, both refs, classes, content and handlers", async (slot, Part) => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLAnchorElement>();
    const outerRef = React.createRef<HTMLElement>();
    const events: string[] = [];
    render(
      <SidebarProvider>
        <Part
          ref={outerRef}
          className='outer-class'
          onClick={() => events.push("outer")}
          render={
            <a
              ref={childRef}
              href='#original'
              className='child-class'
              aria-label='Original anchor'
              onClick={() => events.push("child")}>
              <span>Original content</span>
            </a>
          }
        />
      </SidebarProvider>,
    );
    const link = screen.getByRole("link", {name: "Original anchor"});
    expect(screen.getAllByRole("link", {name: "Original anchor"})).toHaveLength(1);
    expect(link.querySelector("a")).toBeNull();
    expect(link).toHaveAttribute("data-sidebar", slot);
    expect(link).not.toHaveAttribute("type");
    expect(link).toHaveClass("outer-class", "child-class");
    expect(link).toHaveTextContent("Original content");
    expect(childRef.current).toBe(link);
    expect(outerRef.current).toBe(link);
    await user.click(link);
    expect(events).toEqual(["child", "outer"]);
  });

  it.each(composedParts)("supports modern %s render elements without overwriting their children", (slot, Part) => {
    const childRef = React.createRef<HTMLAnchorElement>();
    const outerRef = React.createRef<HTMLElement>();
    render(
      <SidebarProvider>
        <Part
          ref={outerRef}
          render={
            <a
              ref={childRef}
              href='#render'>
              Render content
            </a>
          }>
          Fallback content
        </Part>
      </SidebarProvider>,
    );
    const link = screen.getByRole("link", {name: "Render content"});
    expect(link).toHaveAttribute("data-sidebar", slot);
    expect(screen.queryByText("Fallback content")).not.toBeInTheDocument();
    expect(childRef.current).toBe(link);
    expect(outerRef.current).toBe(link);
  });

  it.each(composedParts)("preserves %s callback-ref cleanup from both the child and wrapper", (_slot, Part) => {
    const childNodes: (HTMLAnchorElement | null)[] = [];
    const wrapperNodes: (HTMLElement | null)[] = [];
    const childCleanup = vi.fn();
    const wrapperCleanup = vi.fn();
    const childRef: React.RefCallback<HTMLAnchorElement> = (node) => {
      childNodes.push(node);
      return childCleanup;
    };
    const wrapperRef: React.RefCallback<HTMLElement> = (node) => {
      wrapperNodes.push(node);
      return wrapperCleanup;
    };
    const {unmount} = render(
      <SidebarProvider>
        <Part
          ref={wrapperRef}
          render={
            <a
              ref={childRef}
              href='#cleanup'>
              Ref cleanup
            </a>
          }
        />
      </SidebarProvider>,
    );
    const link = screen.getByRole("link", {name: "Ref cleanup"});
    expect(childNodes).toEqual([link]);
    expect(wrapperNodes).toEqual([link]);
    unmount();
    expect(childCleanup).toHaveBeenCalledTimes(1);
    expect(wrapperCleanup).toHaveBeenCalledTimes(1);
  });

  it.each(composedParts)("allows the %s child to cancel the merged wrapper handler", async (_slot, Part) => {
    const user = userEvent.setup();
    const wrapper = vi.fn();
    render(
      <SidebarProvider>
        <Part
          onClick={wrapper}
          render={<SidebarMenuButton onClick={(event) => event.preventBaseUIHandler()}>Cancel composition</SidebarMenuButton>}
        />
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("button", {name: "Cancel composition"}));
    expect(wrapper).not.toHaveBeenCalled();
  });

  it.each(composedParts)(
    "keeps safe legacy %s text/fragment fallback on its native wrapper without losing handlers/refs",
    async (slot, Part) => {
      const user = userEvent.setup();
      const ref = React.createRef<HTMLElement>();
      const onClick = vi.fn();
      const {rerender} = render(
        <SidebarProvider>
          <Part
            ref={ref}
            onClick={onClick}
            data-testid='fallback'>
            Text content
          </Part>
        </SidebarProvider>,
      );
      const wrapper = screen.getByTestId("fallback");
      expect(wrapper).toHaveAttribute("data-sidebar", slot);
      expect(wrapper).toHaveTextContent("Text content");
      expect(ref.current).toBe(wrapper);
      await user.click(wrapper);
      rerender(
        <SidebarProvider>
          <Part
            ref={ref}
            onClick={onClick}
            data-testid='fallback'>
            <>Fragment content</>
          </Part>
        </SidebarProvider>,
      );
      expect(screen.getByTestId("fallback")).toHaveTextContent("Fragment content");
      expect(ref.current).toBe(screen.getByTestId("fallback"));
      await user.click(screen.getByTestId("fallback"));
      expect(onClick).toHaveBeenCalledTimes(2);
    },
  );

  it("passes current wrapper-owned state to all five render callbacks", () => {
    const states: object[] = [];
    render(
      <SidebarProvider>
        <SidebarGroupLabel
          render={(props, state) => {
            states.push(state);
            return <h2 {...props} />;
          }}>
          Label
        </SidebarGroupLabel>
        <SidebarGroupAction
          disabled
          render={(props, state) => {
            states.push(state);
            return <button {...props} />;
          }}>
          Action
        </SidebarGroupAction>
        <SidebarMenuButton
          isActive
          size='lg'
          variant='outline'
          render={(props, state) => {
            states.push(state);
            return <button {...props} />;
          }}>
          Primary
        </SidebarMenuButton>
        <SidebarMenuAction
          showOnHover
          render={(props, state) => {
            states.push(state);
            return <button {...props} />;
          }}>
          More
        </SidebarMenuAction>
        <SidebarMenuSubButton
          isActive
          size='sm'
          render={(props, state) => {
            states.push(state);
            return (
              <a
                {...props}
                href='#nested'
              />
            );
          }}>
          Nested
        </SidebarMenuSubButton>
      </SidebarProvider>,
    );
    expect(states).toEqual([
      {},
      {disabled: true},
      {disabled: false, isActive: true, size: "lg", variant: "outline"},
      {disabled: false, showOnHover: true},
      {isActive: true, size: "sm"},
    ]);
  });

  it.each([SidebarGroupAction, SidebarMenuAction, SidebarMenuButton])(
    "keeps disabled composed navigation non-activatable",
    async (Part) => {
      const user = userEvent.setup();
      const click = vi.fn();
      const press = vi.fn();
      render(
        <SidebarProvider>
          <Part
            disabled
            render={
              <a
                href='#blocked'
                onClick={click}
                onPointerDown={press}
                onMouseDown={press}
                onKeyDown={press}
                onKeyUp={press}>
                Blocked navigation
              </a>
            }
          />
        </SidebarProvider>,
      );
      const link = screen.getByRole("link", {name: "Blocked navigation"});
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link).toHaveAttribute("tabindex", "-1");
      expect(link).not.toHaveAttribute("disabled");
      await user.click(link);
      link.focus();
      await user.keyboard("{Enter} ");
      expect(click).not.toHaveBeenCalled();
      expect(press).not.toHaveBeenCalled();
    },
  );

  it.each([SidebarGroupAction, SidebarMenuAction, SidebarMenuButton])(
    "supports keyboard activation on generic composed controls",
    async (Part) => {
      const user = userEvent.setup();
      const click = vi.fn();
      render(
        <SidebarProvider>
          <Part
            onClick={click}
            render={<div>Generic action</div>}
          />
        </SidebarProvider>,
      );
      const control = screen.getByRole("button", {name: "Generic action"});
      await user.tab();
      expect(control).toHaveFocus();
      await user.keyboard("{Enter} ");
      expect(click).toHaveBeenCalledTimes(2);
    },
  );

  it.each([SidebarGroupAction, SidebarMenuAction, SidebarMenuButton])(
    "cancels generic Space activation when keydown is prevented",
    async (Part) => {
      const user = userEvent.setup();
      const click = vi.fn();
      render(
        <SidebarProvider>
          <Part
            onClick={click}
            onKeyDown={(event) => event.preventDefault()}
            render={<div>Cancel keyboard action</div>}
          />
        </SidebarProvider>,
      );
      await user.tab();
      await user.keyboard("{Enter} ");
      expect(click).not.toHaveBeenCalled();
    },
  );

  it.each([SidebarGroupAction, SidebarMenuAction, SidebarMenuButton])(
    "preserves links' native Enter but not Space activation",
    async (Part) => {
      const user = userEvent.setup();
      const click = vi.fn();
      render(
        <SidebarProvider>
          <Part
            render={
              <a
                href='#navigation'
                onClick={click}>
                Native navigation
              </a>
            }
          />
        </SidebarProvider>,
      );
      await user.tab();
      await user.keyboard(" ");
      expect(click).not.toHaveBeenCalled();
      await user.keyboard("{Enter}");
      expect(click).toHaveBeenCalledTimes(1);
    },
  );

  it("preserves native form defaults and explicit submit/reset behavior", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(
      <SidebarProvider>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}>
          <SidebarGroupAction>Group default</SidebarGroupAction>
          <SidebarMenuAction>Menu default</SidebarMenuAction>
          <SidebarMenuButton>Menu button default</SidebarMenuButton>
          <SidebarGroupAction render={(props) => <button {...props} />}>Group callback default</SidebarGroupAction>
          <SidebarMenuAction render={(props) => <button {...props} />}>Action callback default</SidebarMenuAction>
          <SidebarMenuButton render={(props) => <button {...props} />}>Primary callback default</SidebarMenuButton>
          <SidebarMenuButton type='submit'>Submit form</SidebarMenuButton>
          <SidebarMenuAction type='reset'>Reset form</SidebarMenuAction>
        </form>
      </SidebarProvider>,
    );
    for (const name of [
      "Group default",
      "Menu default",
      "Menu button default",
      "Group callback default",
      "Action callback default",
      "Primary callback default",
    ]) {
      const button = screen.getByRole("button", {name});
      expect(button).toHaveAttribute("type", "button");
      await user.click(button);
    }
    expect(submit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", {name: "Submit form"}));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", {name: "Reset form"})).toHaveAttribute("type", "reset");
  });
});

describe("Sidebar review: resolved navigation and action targets", () => {
  const controls = [
    ["group-action", SidebarGroupAction],
    ["menu-action", SidebarMenuAction],
    ["menu-button", SidebarMenuButton],
  ] as const;
  const anchorCases = controls.flatMap(([name, Part]) =>
    (["empty intrinsic", "opaque child", "opaque render", "callback"] as const).flatMap((kind) =>
      [false, true].map((disabled) => ({name, Part, kind, disabled})),
    ),
  );

  it.each(anchorCases)("preserves $name $kind native navigation with disabled=$disabled", async ({name, Part, kind, disabled}) => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const events: string[] = [];
    const states: object[] = [];
    const submit = vi.fn();
    const childClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      events.push("child");
      event.preventDefault();
    };
    const wrapperClick = (): void => {
      events.push("wrapper");
    };
    const intrinsic = (
      <a
        ref={childRef}
        href=''
        onClick={childClick}>
        Reviewed navigation
      </a>
    );
    const opaque = (
      <ReviewAnchor
        ref={childRef}
        href='#reviewed'
        onClick={childClick}>
        Reviewed navigation
      </ReviewAnchor>
    );
    render(
      <SidebarProvider>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}>
          {kind === "empty intrinsic" || kind === "opaque child" ? (
            <Part
              ref={wrapperRef}
              disabled={disabled}
              nativeButton={kind === "opaque child" ? false : undefined}
              onClick={wrapperClick}
              render={kind === "empty intrinsic" ? intrinsic : opaque}
            />
          ) : kind === "opaque render" ? (
            <Part
              ref={wrapperRef}
              disabled={disabled}
              nativeButton={false}
              render={opaque}
              onClick={wrapperClick}
            />
          ) : (
            <Part
              ref={wrapperRef}
              disabled={disabled}
              nativeButton={false}
              onClick={wrapperClick}
              render={(elementProps: HTMLProps, state: Readonly<{disabled: boolean}>) => {
                states.push(state);
                return (
                  <ReviewAnchor
                    {...mergeProps<"a">(elementProps, {href: "#reviewed", onClick: childClick})}
                    childRef={childRef}>
                    Reviewed navigation
                  </ReviewAnchor>
                );
              }}
            />
          )}
        </form>
      </SidebarProvider>,
    );
    const link = screen.getByText("Reviewed navigation");
    expect(screen.getAllByText("Reviewed navigation")).toHaveLength(1);
    // aria-query's "set" matcher wrongly excludes href=""; the real accessibility API checks attribute presence.
    expect(getRole(link)).toBe("link");
    expect(link).toHaveAccessibleName("Reviewed navigation");
    expect(link).toHaveAttribute("href", kind === "empty intrinsic" ? "" : "#reviewed");
    if (kind !== "empty intrinsic") expect(screen.getByRole("link", {name: "Reviewed navigation"})).toBe(link);
    expect(link).not.toHaveAttribute("role", "button");
    expect(link).not.toHaveAttribute("type");
    expect(link).not.toHaveAttribute("disabled");
    expect(childRef.current).toBe(link);
    expect(wrapperRef.current).toBe(link);
    if (disabled) {
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link).toHaveAttribute("tabindex", "-1");
      await user.click(link);
      act(() => link.focus());
      await user.keyboard("{Enter} ");
      expect(events).toEqual([]);
    } else {
      expect(link).not.toHaveAttribute("aria-disabled");
      expect(link).not.toHaveAttribute("tabindex");
      await user.tab();
      expect(link).toHaveFocus();
      await user.keyboard(" ");
      expect(events).toEqual([]);
      await user.keyboard("{Enter}");
      expect(events).toEqual(["child", "wrapper"]);
    }
    expect(submit).not.toHaveBeenCalled();
    if (kind === "callback") {
      const expectedState =
        name === "menu-button"
          ? {disabled, isActive: false, size: "default", variant: "default"}
          : name === "menu-action"
            ? {disabled, showOnHover: false}
            : {disabled};
      expect(states.length).toBeGreaterThan(0);
      for (const state of states) expect(state).toEqual(expectedState);
    }
  });

  it.each(controls.flatMap(([name, Part]) => (["opaque", "callback"] as const).map((kind) => ({name, Part, kind}))))(
    "keeps $name $kind non-anchor targets keyboard-operable under the explicit non-native flag",
    async ({Part, kind}) => {
      const user = userEvent.setup();
      const ref = React.createRef<HTMLElement>();
      const click = vi.fn();
      render(
        <SidebarProvider>
          <Part
            ref={ref}
            nativeButton={false}
            onClick={click}
            render={
              kind === "opaque" ? (
                <ReviewNonAnchor>Reviewed action</ReviewNonAnchor>
              ) : (
                (elementProps: HTMLProps) => <ReviewNonAnchor {...elementProps}>Reviewed action</ReviewNonAnchor>
              )
            }
          />
        </SidebarProvider>,
      );
      const action = screen.getByRole("button", {name: "Reviewed action"});
      expect(action.tagName).toBe("DIV");
      expect(ref.current).toBe(action);
      expect(action).toHaveAttribute("tabindex", "0");
      expect(action).not.toHaveAttribute("type");
      expect(action).not.toHaveAttribute("disabled");
      await user.tab();
      await user.keyboard("{Enter} ");
      expect(click).toHaveBeenCalledTimes(2);
    },
  );

  it.each(
    controls.flatMap(([name, Part]) =>
      (["opaque", "callback"] as const).flatMap((kind) =>
        [false, true].flatMap((native) => (native ? [false, true] : [true]).map((disabled) => ({name, Part, kind, native, disabled}))),
      ),
    ),
  )("preserves $name $kind actual target activation (native=$native, disabled=$disabled)", async ({Part, kind, native, disabled}) => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    const childClick = vi.fn();
    const wrapperClick = vi.fn();
    render(
      <SidebarProvider>
        <Part
          disabled={disabled}
          nativeButton={native}
          ref={ref}
          onClick={wrapperClick}
          render={
            kind === "opaque" ? (
              native ? (
                <ReviewNativeButton onClick={childClick}>Opaque action</ReviewNativeButton>
              ) : (
                <ReviewNonAnchor onClick={childClick}>Opaque action</ReviewNonAnchor>
              )
            ) : (
              (props: HTMLProps) =>
                native ? (
                  <ReviewNativeButton {...mergeProps<"button">(props, {onClick: childClick})}>Opaque action</ReviewNativeButton>
                ) : (
                  <ReviewNonAnchor {...mergeProps<"div">(props, {onClick: childClick})}>Opaque action</ReviewNonAnchor>
                )
            )
          }
        />
      </SidebarProvider>,
    );
    const action = screen.getByRole("button", {name: "Opaque action"});
    expect(ref.current).toBe(action);
    expect(action.tagName).toBe(native ? "BUTTON" : "DIV");
    if (disabled) {
      if (native) expect(action).toBeDisabled();
      else expect(action).toHaveAttribute("aria-disabled", "true");
      expect(action).not.toHaveAttribute("tabindex", "0");
    } else {
      expect(action).not.toBeDisabled();
      expect(action).toHaveAttribute("type", "button");
    }
    await user.click(action);
    act(() => action.focus());
    await user.keyboard("{Enter} ");
    expect(childClick).toHaveBeenCalledTimes(disabled ? 0 : 3);
    expect(wrapperClick).toHaveBeenCalledTimes(disabled ? 0 : 3);
  });

  it.each(controls)("tracks %s opaque href presence without replacing its native node or invoking its component", async (_name, Part) => {
    const ref = React.createRef<HTMLElement>();
    const {rerender} = render(
      <SidebarProvider>
        <Part
          ref={ref}
          nativeButton={false}
          render={<ReviewAnchor href='#reviewed'>Changing target</ReviewAnchor>}
        />
      </SidebarProvider>,
    );
    const node = screen.getByRole("link", {name: "Changing target"});
    await act(async () => {
      rerender(
        <SidebarProvider>
          <Part
            ref={ref}
            nativeButton={false}
            render={<ReviewAnchor>Changing target</ReviewAnchor>}
          />
        </SidebarProvider>,
      );
    });
    await waitFor(() => expect(screen.getByRole("button", {name: "Changing target"})).toBe(node));
    expect(ref.current).toBe(node);
    expect(node).toHaveAttribute("tabindex", "0");
    await act(async () => {
      rerender(
        <SidebarProvider>
          <Part
            ref={ref}
            nativeButton={false}
            render={<ReviewAnchor href=''>Changing target</ReviewAnchor>}
          />
        </SidebarProvider>,
      );
    });
    await waitFor(() => expect(getRole(node)).toBe("link"));
    expect(screen.getByText("Changing target")).toBe(node);
    expect(node).toHaveAttribute("href", "");
    expect(node).not.toHaveAttribute("tabindex");
  });

  it("cleans up the opaque-target platform observer while preserving both DOM-ref detachments", () => {
    const wrapperRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLAnchorElement>();
    const {unmount} = render(
      <SidebarProvider>
        <SidebarMenuButton
          ref={wrapperRef}
          nativeButton={false}
          render={
            <ReviewAnchor
              ref={childRef}
              href='#cleanup'>
              Observer cleanup
            </ReviewAnchor>
          }
        />
      </SidebarProvider>,
    );
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const link = screen.getByRole("link", {name: "Observer cleanup"});
    expect(wrapperRef.current).toBe(link);
    expect(childRef.current).toBe(link);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });
});

describe("Sidebar desktop state and layout", () => {
  it("toggles desktop state, writes the cookie, and supports Ctrl+B and Cmd+B", async () => {
    const user = userEvent.setup();
    const cookie = vi.spyOn(document, "cookie", "set");
    renderNavigation();
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));
    expectState({open: false, state: "collapsed", isMobile: false, openMobile: false});
    expect(cookie).toHaveBeenLastCalledWith("sidebar_state=false; path=/; max-age=604800");
    await user.keyboard("{Control>}b{/Control}");
    expectState({open: true, state: "expanded", isMobile: false, openMobile: false});
    await user.keyboard("{Meta>}b{/Meta}");
    expectState({open: false, state: "collapsed", isMobile: false, openMobile: false});
    await user.keyboard("b");
    expectState({open: false, state: "collapsed", isMobile: false, openMobile: false});
  });

  it("reports controlled changes without mutating controlled state, then reflects owner rerenders", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const {rerender} = render(
      <SidebarProvider
        open
        onOpenChange={onOpenChange}>
        <ContextProbe />
        <SidebarTrigger />
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expectState({open: true, state: "expanded", isMobile: false, openMobile: false});
    rerender(
      <SidebarProvider
        open={false}
        onOpenChange={onOpenChange}>
        <ContextProbe />
        <SidebarTrigger />
      </SidebarProvider>,
    );
    expectState({open: false, state: "collapsed", isMobile: false, openMobile: false});
  });

  it.each(["trigger", "rail"] as const)("merges %s callbacks and honors preventDefault cancellation", async (kind) => {
    const user = userEvent.setup();
    const click = vi.fn((event: React.MouseEvent) => event.preventDefault());
    render(
      <SidebarProvider>
        <ContextProbe />
        {kind === "trigger" ? <SidebarTrigger onClick={click} /> : <SidebarRail onClick={click} />}
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));
    expect(click).toHaveBeenCalledTimes(1);
    expectState({open: true, state: "expanded", isMobile: false, openMobile: false});
  });

  it.each([
    ["caller", "SDK"],
    ["child", "SDK"],
    ["caller", "native"],
    ["child", "native"],
  ] as const)("honors %s Trigger %s cancellation without controlled notification or cookie mutation", async (owner, cancellation) => {
    const user = userEvent.setup();
    const cookie = vi.spyOn(document, "cookie", "set");
    const change = vi.fn();
    const events: string[] = [];
    const cancel = (event: BaseUIEvent<React.MouseEvent<HTMLButtonElement>>): void => {
      if (cancellation === "SDK") event.preventBaseUIHandler();
      else event.preventDefault();
    };
    render(
      <SidebarProvider
        open
        onOpenChange={change}>
        <ContextProbe />
        <SidebarTrigger
          onClick={(event) => {
            events.push("caller");
            if (owner === "caller") cancel(event);
          }}
          render={
            <button
              onClick={(event: BaseUIEvent<React.MouseEvent<HTMLButtonElement>>) => {
                events.push("child");
                if (owner === "child") cancel(event);
              }}>
              Cancel reviewed trigger
            </button>
          }
        />
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("button", {name: "Cancel reviewed trigger"}));
    expect(events).toEqual(owner === "child" && cancellation === "SDK" ? ["child"] : ["child", "caller"]);
    expect(change).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
    expectState({open: true, state: "expanded", isMobile: false, openMobile: false});
  });

  it("keeps Trigger child/caller/toggle ordering and both refs when activation is not cancelled", async () => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLButtonElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const cookie = vi.spyOn(document, "cookie", "set");
    const events: string[] = [];
    const change = vi.fn(() => {
      events.push("toggle");
    });
    render(
      <SidebarProvider
        open
        onOpenChange={change}>
        <SidebarTrigger
          ref={wrapperRef}
          onClick={() => events.push("caller")}
          render={
            <button
              ref={childRef}
              onClick={() => events.push("child")}>
              Reviewed trigger
            </button>
          }
        />
      </SidebarProvider>,
    );
    const trigger = screen.getByRole("button", {name: "Reviewed trigger"});
    expect(childRef.current).toBe(trigger);
    expect(wrapperRef.current).toBe(trigger);
    await user.click(trigger);
    expect(events).toEqual(["child", "caller", "toggle"]);
    expect(change).toHaveBeenCalledWith(false);
    expect(cookie).toHaveBeenLastCalledWith("sidebar_state=false; path=/; max-age=604800");
  });

  it("honors shortcut cancellation from a real descendant input", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <SidebarInput
          aria-label='Shortcut owner'
          onKeyDown={(event) => event.preventDefault()}
        />
        <ContextProbe />
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("textbox", {name: "Shortcut owner"}));
    await user.keyboard("{Control>}b{/Control}");
    expectState({open: true, state: "expanded", isMobile: false, openMobile: false});
  });

  it("keeps state handlers current and removes keyboard/media subscriptions on unmount", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const remove = vi.spyOn(globalThis.window, "removeEventListener");
    const removeMedia = vi.spyOn(mobileQuery, "removeEventListener");
    const {unmount} = renderNavigation({onOpenChange: change});
    unmount();
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(removeMedia).toHaveBeenCalledWith("change", expect.any(Function));
    changeMobile(true);
    await user.keyboard("{Control>}b{/Control}");
    expect(change).not.toHaveBeenCalled();
  });

  it.each(["sidebar", "floating", "inset"] as const)("exposes expanded/offcanvas/icon state for %s geometry", async (variant) => {
    const user = userEvent.setup();
    const sidebarRef = React.createRef<HTMLDivElement>();
    const {rerender} = render(
      <SidebarProvider>
        <Sidebar
          ref={sidebarRef}
          variant={variant}
          side='right'
          collapsible='offcanvas'>
          <SidebarContent>Geometry</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    const root = sidebarRef.current;
    expect(root).toHaveAttribute("data-state", "expanded");
    expect(root).toHaveAttribute("data-collapsible", "");
    expect(root).toHaveAttribute("data-side", "right");
    expect(root).toHaveAttribute("data-variant", variant);
    expect(root?.querySelector(`.${styles.gap}`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));
    expect(root).toHaveAttribute("data-collapsible", "offcanvas");
    rerender(
      <SidebarProvider>
        <Sidebar
          ref={sidebarRef}
          variant={variant}
          side='right'
          collapsible='icon'>
          <SidebarContent>Geometry</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    expect(root).toHaveAttribute("data-collapsible", "icon");
  });

  it("limits floating/inset icon gap sizing to collapsed icon state and preserves RTL logical placement", () => {
    expect(stylesheet).toContain('.desktopRoot[data-variant="floating"][data-collapsible="icon"] .gap');
    expect(stylesheet).toContain('.desktopRoot[data-variant="inset"][data-collapsible="icon"] .gap');
    expect(stylesheet).not.toContain('.desktopRoot[data-variant="floating"] .gap');
    expect(stylesheet).not.toContain('.desktopRoot[data-variant="inset"] .gap');
    expect(stylesheet).toContain("width: calc(var(--ac-sidebar-width-icon) + var(--ac-space-4))");
    expect(stylesheet).toContain("inset-inline-start: calc(var(--ac-sidebar-width) * -1)");
    expect(stylesheet).toContain("inset-inline-end: calc(var(--ac-sidebar-width) * -1)");
    expect(stylesheet).toContain("border-inline-start");
    expect(stylesheet).toContain("padding-inline-start: var(--ac-space-3)");
    expect(stylesheet).toContain("text-align: start");
    expect(stylesheet).toMatch(/\.desktopRoot\[data-collapsible="icon"\] \.menuButton \{[^}]*min-height: 2rem;/u);
    render(
      <SidebarProvider dir='rtl'>
        <Sidebar
          dir='rtl'
          side='right'>
          <SidebarContent>RTL</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );
    expect(screen.getByText("RTL").closest("[data-side]")).toHaveAttribute("dir", "rtl");
  });

  it("keeps the static sidebar nonmodal on mobile", () => {
    changeMobile(true);
    const ref = React.createRef<HTMLDivElement>();
    render(
      <SidebarProvider>
        <Sidebar
          ref={ref}
          collapsible='none'>
          Always present
        </Sidebar>
      </SidebarProvider>,
    );
    expect(ref.current).toHaveTextContent("Always present");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("preserves the physical left/right edge contract under RTL with logical internal spacing", () => {
    expect(stylesheet).toContain('.desktopRoot:dir(rtl)[data-side="left"] .panelWrap');
    expect(stylesheet).toContain('.desktopRoot:dir(rtl)[data-side="right"] .panelWrap');
    expect(stylesheet).toContain('.desktopRoot:dir(rtl)[data-side="left"][data-collapsible="offcanvas"] .panelWrap');
    expect(stylesheet).toContain('.desktopRoot:dir(rtl)[data-side="right"][data-collapsible="offcanvas"] .panelWrap');
    expect(stylesheet).not.toContain('.mobilePanel:dir(rtl)[data-side="left"][data-starting-style]');
  });

  it("accounts for floating icon borders and inset margins on either sibling order and direction", () => {
    expect(stylesheet).toContain("width: calc(var(--ac-sidebar-width-icon) + var(--ac-space-4) + 2px)");
    expect(stylesheet).toContain('.inset:has(~ .desktopRoot[data-variant="inset"])');
    expect(stylesheet).toContain('.inset:dir(ltr):has(~ .desktopRoot[data-state="expanded"][data-variant="inset"][data-side="right"])');
    expect(stylesheet).toContain('.inset:dir(rtl):has(~ .desktopRoot[data-state="expanded"][data-variant="inset"][data-side="left"])');
  });

  it("passes an individual sidebar's explicit direction to real descendant primitives", () => {
    render(
      <SidebarProvider>
        <Sidebar
          dir='rtl'
          collapsible='none'>
          <DirectionProbe />
        </Sidebar>
      </SidebarProvider>,
    );
    expect(screen.getByTestId("direction")).toHaveTextContent("rtl");
  });

  it("renders all structural parts with the correct native refs and slots", () => {
    const refs = {
      provider: React.createRef<HTMLDivElement>(),
      header: React.createRef<HTMLDivElement>(),
      footer: React.createRef<HTMLDivElement>(),
      input: React.createRef<HTMLInputElement>(),
      inset: React.createRef<HTMLElement>(),
      content: React.createRef<HTMLDivElement>(),
      group: React.createRef<HTMLDivElement>(),
      groupContent: React.createRef<HTMLDivElement>(),
      menu: React.createRef<HTMLUListElement>(),
      item: React.createRef<HTMLLIElement>(),
      badge: React.createRef<HTMLDivElement>(),
      skeleton: React.createRef<HTMLDivElement>(),
      sub: React.createRef<HTMLUListElement>(),
      subItem: React.createRef<HTMLLIElement>(),
      separator: React.createRef<HTMLDivElement>(),
    };
    render(
      <SidebarProvider
        ref={refs.provider}
        data-testid='provider'>
        <Sidebar>
          <SidebarHeader
            ref={refs.header}
            data-testid='header'>
            <SidebarInput
              ref={refs.input}
              aria-label='Search'
              data-testid='input'
            />
          </SidebarHeader>
          <SidebarSeparator
            ref={refs.separator}
            data-testid='separator'
          />
          <SidebarContent
            ref={refs.content}
            data-testid='content'>
            <SidebarGroup
              ref={refs.group}
              data-testid='group'>
              <SidebarGroupLabel>Group</SidebarGroupLabel>
              <SidebarGroupContent
                ref={refs.groupContent}
                data-testid='groupContent'>
                <SidebarMenu
                  ref={refs.menu}
                  data-testid='menu'>
                  <SidebarMenuItem
                    ref={refs.item}
                    data-testid='item'>
                    <SidebarMenuButton>Item</SidebarMenuButton>
                    <SidebarMenuBadge
                      ref={refs.badge}
                      data-testid='badge'>
                      3
                    </SidebarMenuBadge>
                    <SidebarMenuSub
                      ref={refs.sub}
                      data-testid='sub'>
                      <SidebarMenuSubItem
                        ref={refs.subItem}
                        data-testid='subItem'>
                        <SidebarMenuSubButton href='#nested'>Nested</SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton
                      ref={refs.skeleton}
                      data-testid='skeleton'
                      showIcon
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter
            ref={refs.footer}
            data-testid='footer'>
            Footer
          </SidebarFooter>
        </Sidebar>
        <SidebarInset
          ref={refs.inset}
          data-testid='inset'>
          Main
        </SidebarInset>
      </SidebarProvider>,
    );
    for (const [name, ref] of Object.entries(refs)) expect(ref.current).toBe(screen.getByTestId(name));
    expect(refs.inset.current?.tagName).toBe("MAIN");
    expect(refs.sub.current?.tagName).toBe("UL");
    expect(refs.subItem.current?.tagName).toBe("LI");
    expect(refs.separator.current).toHaveAttribute("data-sidebar", "separator");
    expect(refs.skeleton.current?.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeInTheDocument();
    expect(refs.skeleton.current?.querySelector('[data-sidebar="menu-skeleton-text"]')).toBeInTheDocument();
  });

  it("requires the provider for useSidebar", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<ContextProbe />)).toThrow("useSidebar must be used within a SidebarProvider.");
    consoleSpy.mockRestore();
  });
});

describe("Sidebar real responsive modal controller (not native inert/paint proof)", () => {
  beforeEach(() => {
    // Happy DOM has no layout engine: tabbable needs nonempty native geometry.
    const rect = new DOMRect(0, 0, 100, 30);
    const rects: DOMRectList = {
      0: rect,
      length: 1,
      item: (index) => (index === 0 ? rect : null),
      [Symbol.iterator]: () => [rect][Symbol.iterator](),
    };
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(rects);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
  });

  it("uses Sheet/Dialog naming, enters/contains/returns focus and marks the outside tree inert", async () => {
    changeMobile(true);
    const user = userEvent.setup();
    const {container} = renderNavigation();
    const trigger = screen.getByRole("button", {name: "Toggle Sidebar"});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", {name: "Sidebar"});
    expect(dialog).toHaveAttribute("data-slot", "sheet-content");
    expect(dialog).toHaveAttribute("data-mobile", "true");
    expect(dialog).toHaveAccessibleDescription("Displays the mobile sidebar.");
    await waitFor(() => expect(within(dialog).getByRole("textbox", {name: "Search navigation"})).toHaveFocus());
    expect(container).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveAttribute("data-base-ui-inert");
    await user.tab();
    expect(within(dialog).getByRole("link", {name: "Home"})).toHaveFocus();
    await user.tab({shift: true});
    expect(within(dialog).getByRole("textbox", {name: "Search navigation"})).toHaveFocus();
    await user.tab({shift: true});
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(container).not.toHaveAttribute("aria-hidden");
    expect(container).not.toHaveAttribute("data-base-ui-inert");
  });

  it("dismisses on the real Sheet backdrop and forwards the popup ref and right-side props", async () => {
    changeMobile(true);
    const user = userEvent.setup();
    const ref = React.createRef<HTMLDivElement>();
    render(
      <SidebarProvider>
        <Sidebar
          ref={ref}
          side='right'
          dir='rtl'
          className='mobile-custom'>
          <SidebarMenuButton>Inside</SidebarMenuButton>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));
    const dialog = await screen.findByRole("dialog", {name: "Sidebar"});
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveAttribute("data-side", "right");
    expect(dialog).toHaveAttribute("dir", "rtl");
    expect(dialog).toHaveClass("mobile-custom");
    const backdrop = document.querySelector<HTMLElement>('[data-slot="sheet-overlay"]');
    if (!backdrop) throw new Error("Missing real Sheet backdrop");
    await user.click(backdrop);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("preserves provider RTL direction across the actual mobile portal boundary", async () => {
    changeMobile(true);
    const user = userEvent.setup();
    render(
      <SidebarProvider dir='rtl'>
        <Sidebar>
          <SidebarMenuButton>Inside</SidebarMenuButton>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));
    expect(await screen.findByRole("dialog", {name: "Sidebar"})).toHaveAttribute("dir", "rtl");
  });

  it("keeps desktop and mobile state independent across real breakpoint changes", async () => {
    const user = userEvent.setup();
    const cookie = vi.spyOn(document, "cookie", "set");
    renderNavigation({defaultOpen: false});
    changeMobile(true);
    expectState({open: false, state: "collapsed", isMobile: true, openMobile: false});
    await user.keyboard("{Control>}b{/Control}");
    await screen.findByRole("dialog", {name: "Sidebar"});
    expect(cookie).not.toHaveBeenCalled();
    changeMobile(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expectState({open: false, state: "collapsed", isMobile: false, openMobile: true});
    changeMobile(true);
    await screen.findByRole("dialog", {name: "Sidebar"});
    await user.keyboard("{Meta>}b{/Meta}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expectState({open: false, state: "collapsed", isMobile: true, openMobile: false});
  });
});

describe("Sidebar real Tooltip and portaled action composition", () => {
  it("preserves the focused original navigation node while its tooltip is disabled by expansion", async () => {
    const user = userEvent.setup();
    renderNavigation({defaultOpen: false});
    const link = screen.getByRole("link", {name: "Home"});
    await user.tab();
    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard("{Control>}b{/Control}");
    expect(screen.getByRole("link", {name: "Home"})).toBe(link);
    expect(link).toHaveFocus();
    expect(screen.queryByText("Home details")).not.toBeInTheDocument();
  });

  it("opens collapsed desktop tooltip content through the real primitive without a duplicate anchor", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible='icon'>
          <SidebarMenuButton
            tooltip={{children: "Home details"}}
            render={<a href='#tooltip'>Home</a>}
          />
        </Sidebar>
      </SidebarProvider>,
    );
    const link = screen.getByRole("link", {name: "Home"});
    expect(screen.getAllByRole("link", {name: "Home"})).toHaveLength(1);
    await user.hover(link);
    const tooltip = await screen.findByText("Home details");
    expect(tooltip).toHaveTextContent("Home details");
    expect(tooltip).toHaveAttribute("data-open");
    expect(tooltip).toHaveAttribute("tabindex", "-1");
    expect(link).toHaveAttribute("data-popup-open");
    expect(link.closest("[data-sidebar='sidebar']")?.contains(tooltip)).toBe(false);
  });

  describe("Sidebar real stories", () => {
    it.each(Object.entries(composeStories(stories)))(
      "renders the %s story with real sidebar parts and a single Home anchor",
      (_name, Story) => {
        render(<Story />);
        expect(screen.getAllByRole("link", {name: "Home"})).toHaveLength(1);
        expect(screen.getByRole("textbox", {name: "Search navigation"})).toBeInTheDocument();
        expect(document.querySelector('[data-sidebar="trigger"]')).toHaveAccessibleName("Toggle Sidebar");
      },
    );
  });

  it("does not mount tooltip behavior in expanded or mobile layouts", async () => {
    const user = userEvent.setup();
    renderNavigation();
    await user.hover(screen.getByRole("link", {name: "Home"}));
    expect(screen.queryByText("Home details")).not.toBeInTheDocument();
    changeMobile(true);
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));
    const dialog = await screen.findByRole("dialog", {name: "Sidebar"});
    await user.hover(within(dialog).getByRole("link", {name: "Home"}));
    expect(screen.queryByText("Home details")).not.toBeInTheDocument();
  });

  it("retains a hover action's real primitive open state while focus moves into its portal", async () => {
    installDesktopStyles();
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>Home</SidebarMenuButton>
            <BaseMenu.Root>
              <BaseMenu.Trigger
                render={
                  <SidebarMenuAction
                    showOnHover
                    aria-label='More actions'
                  />
                }>
                More
              </BaseMenu.Trigger>
              <BaseMenu.Portal>
                <BaseMenu.Positioner>
                  <BaseMenu.Popup>
                    <BaseMenu.Item>Rename</BaseMenu.Item>
                    <BaseMenu.Item>Archive</BaseMenu.Item>
                  </BaseMenu.Popup>
                </BaseMenu.Positioner>
              </BaseMenu.Portal>
            </BaseMenu.Root>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarProvider>,
    );
    const action = screen.getByRole("button", {name: "More actions"});
    await user.hover(action);
    await user.click(action);
    const popup = await screen.findByRole("menu");
    await user.hover(within(popup).getByRole("menuitem", {name: "Rename"}));
    expect(action).toHaveAttribute("data-popup-open");
    expect(action).toHaveAttribute("aria-expanded", "true");
    expect(globalThis.window.getComputedStyle(action).opacity).toBe("1");
    expect(stylesheet).toContain(".menuActionShowOnHover[data-popup-open]");
    expect(stylesheet).toContain('.menuActionShowOnHover[data-state="open"]');
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(action).not.toHaveAttribute("data-popup-open");
  });
});
