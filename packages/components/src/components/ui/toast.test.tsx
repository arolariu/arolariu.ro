import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Toaster,
  createToastManager,
  toast,
  useToastManager,
  type ToastData,
  type ToastProps,
  type ToastState,
  type ToasterProps,
} from "./toast";
import * as ToastStories from "./toast.stories";

function CompoundList(): React.JSX.Element {
  const {toasts} = useToastManager();
  return (
    <ToastPortal>
      <ToastViewport aria-label='Compound notifications'>
        {toasts.map((item) => (
          <Toast
            key={item.id}
            toast={item}
            data-testid={item.id}>
            <ToastContent>
              <ToastTitle />
              <ToastDescription />
              <ToastAction />
              <ToastClose />
            </ToastContent>
          </Toast>
        ))}
      </ToastViewport>
    </ToastPortal>
  );
}

describe("canonical Toast", () => {
  afterEach(() => {
    act(() => {
      toast.close();
    });
    vi.useRealTimers();
  });

  it("exports all 13 pinned runtime values and a real non-callable manager", () => {
    expect([
      Toast,
      ToastAction,
      ToastClose,
      ToastContent,
      ToastDescription,
      ToastPortal,
      ToastProvider,
      ToastTitle,
      ToastViewport,
      Toaster,
      createToastManager,
      toast,
      useToastManager,
    ]).toHaveLength(13);
    expect(typeof toast).toBe("object");
    expect(toast).toEqual(
      expect.objectContaining({
        add: expect.any(Function),
        close: expect.any(Function),
        update: expect.any(Function),
        promise: expect.any(Function),
      }),
    );
    expect(Toast).toHaveProperty("$$typeof", Symbol.for("react.forward_ref"));
    expect(Toaster).toHaveProperty("$$typeof", Symbol.for("react.forward_ref"));
  });

  it("renders compound parts, valid zero content, manager action props and default close", async () => {
    const manager = createToastManager();
    const action = vi.fn();
    render(
      <ToastProvider
        toastManager={manager}
        timeout={0}>
        <CompoundList />
      </ToastProvider>,
    );
    act(() => {
      manager.add({id: "zero", title: 0, description: 0, actionProps: {children: "Undo", onClick: action}});
    });
    const root = screen.getByTestId("zero");
    expect(within(root).getAllByText("0")).toHaveLength(2);
    expect(root).toHaveAttribute("aria-labelledby", within(root).getByRole("heading").id);
    await userEvent.setup().click(within(root).getByRole("button", {name: "Undo"}));
    expect(action).toHaveBeenCalledOnce();
    await userEvent.setup().click(within(root).getByRole("button", {name: "Close toast"}));
    await waitFor(() => {
      expect(screen.queryByTestId("zero")).not.toBeInTheDocument();
    });
  });

  it("keeps independent provider/manager contexts and nested hooks isolated", () => {
    const first = createToastManager();
    const second = createToastManager();
    render(
      <>
        <Toaster
          toastManager={first}
          timeout={0}
          viewportProps={{"aria-label": "First"}}
        />
        <Toaster
          toastManager={second}
          timeout={0}
          viewportProps={{"aria-label": "Second"}}
        />
      </>,
    );
    act(() => {
      first.add({title: "One"});
      second.add({title: "Two"});
    });
    expect(within(screen.getByLabelText("First")).getByText("One")).toBeInTheDocument();
    expect(within(screen.getByLabelText("First")).queryByText("Two")).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Second")).getByText("Two")).toBeInTheDocument();
    act(() => {
      first.close();
    });
    expect(within(screen.getByLabelText("Second")).getByText("Two")).toBeInTheDocument();
  });

  it("emits actual limited/behind/expanded data attributes and uses matching CSS contracts", () => {
    const manager = createToastManager();
    render(
      <Toaster
        toastManager={manager}
        limit={1}
        timeout={0}
      />,
    );
    act(() => {
      manager.add({title: "Old"});
      manager.add({title: "Front"});
    });
    expect(screen.getByText("Old").closest("[data-slot=toast]")).toHaveAttribute("data-limited");
    expect(screen.getByText("Old").closest("[data-slot=toast-content]")).toHaveAttribute("data-behind");
    fireEvent.focusIn(screen.getByLabelText("Notifications"));
    expect(screen.getByText("Front").closest("[data-slot=toast]")).toHaveAttribute("data-expanded");
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "toast.module.css"), "utf8");
    for (const attribute of ["limited", "starting-style", "ending-style", "expanded", "behind", "swiping", "swipe-direction"]) {
      expect(css).toContain(`[data-${attribute}`);
    }
    expect(css).not.toMatch(/\[data-(?:starting|ending)\]/u);
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("forced-colors");
  });

  it("forwards canonical callbacks without inventing reasons for manual close or timeout", async () => {
    const manager = createToastManager();
    const onClose = vi.fn();
    const onRemove = vi.fn();
    render(
      <Toaster
        toastManager={manager}
        timeout={0}
      />,
    );
    act(() => {
      manager.add({title: "Manual", onClose, onRemove});
    });
    fireEvent.focusIn(screen.getByLabelText("Notifications"));
    await userEvent.setup().click(screen.getByRole("button", {name: "Close toast"}));
    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledOnce();
    });
    expect(onClose.mock.calls).toEqual([[]]);
    expect(onRemove.mock.calls).toEqual([[]]);
    act(() => {
      manager.add({title: "Timed", timeout: 10, onClose, onRemove});
    });
    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledTimes(2);
    });
    expect(onClose.mock.calls).toEqual([[], []]);
    expect(onRemove.mock.calls).toEqual([[], []]);
  });

  it("passes actual primitive state through className and render callbacks, with correct refs", () => {
    const manager = createToastManager<{code: number}>();
    const rootRef = React.createRef<HTMLDivElement>();
    const titleRef = React.createRef<HTMLHeadingElement>();
    const contentRef = React.createRef<HTMLDivElement>();
    const descriptionRef = React.createRef<HTMLParagraphElement>();
    const actionRef = React.createRef<HTMLButtonElement>();
    const closeRef = React.createRef<HTMLButtonElement>();
    const viewportRef = React.createRef<HTMLDivElement>();
    const portalRef = React.createRef<HTMLDivElement>();
    const rootRender = vi.fn((props: React.HTMLAttributes<HTMLDivElement>, state: {type: string | undefined; limited: boolean}) => (
      <div
        {...props}
        data-render-type={state.type}
        data-render-limited={String(state.limited)}
      />
    ));
    function List(): React.JSX.Element {
      const {toasts} = useToastManager<{code: number}>();
      return (
        <ToastPortal
          ref={portalRef}
          className={() => "portal-class"}>
          <ToastViewport
            ref={viewportRef}
            className={(state) => (state.expanded ? "viewport-expanded" : "viewport-collapsed")}>
            {toasts.map((item) => (
              <Toast
                key={item.id}
                toast={item}
                ref={rootRef}
                render={(props, state) => rootRender(props, state)}
                className={(state) => (state.limited ? "limited" : "visible")}>
                <ToastContent
                  ref={contentRef}
                  className={(state) => (state.expanded ? "content-expanded" : "content-collapsed")}>
                  <ToastTitle
                    ref={titleRef}
                    className={(state) => `title-${state.type}`}>
                    Explicit title
                  </ToastTitle>
                  <ToastDescription
                    ref={descriptionRef}
                    className={(state) => `description-${state.type}`}>
                    Explicit description
                  </ToastDescription>
                  <ToastAction
                    ref={actionRef}
                    className={(state) => `action-${state.type}`}>
                    Explicit action
                  </ToastAction>
                  <ToastClose
                    ref={closeRef}
                    className={(state) => `close-${state.type}`}>
                    0
                  </ToastClose>
                </ToastContent>
              </Toast>
            ))}
          </ToastViewport>
        </ToastPortal>
      );
    }
    render(
      <ToastProvider
        toastManager={manager}
        timeout={0}>
        <List />
      </ToastProvider>,
    );
    act(() => {
      manager.add({title: "Ignored title", type: "success", data: {code: 200}});
    });
    expect(rootRef.current).toHaveAttribute("data-render-type", "success");
    expect(rootRef.current).toHaveAttribute("data-render-limited", "false");
    expect(rootRef.current).toHaveClass("visible");
    expect(rootRender).toHaveBeenCalled();
    expect(titleRef.current).toHaveTextContent("Explicit title");
    expect(descriptionRef.current).toHaveTextContent("Explicit description");
    expect(actionRef.current).toHaveTextContent("Explicit action");
    expect(closeRef.current).toHaveTextContent("0");
    expect(contentRef.current).toHaveClass("content-collapsed");
    expect(viewportRef.current).toHaveClass("viewport-collapsed");
    expect(portalRef.current).toHaveClass("portal-class");
    fireEvent.focusIn(viewportRef.current ?? screen.getByLabelText("Notifications"));
    expect(contentRef.current).toHaveClass("content-expanded");
    expect(viewportRef.current).toHaveClass("viewport-expanded");
  });

  it.each(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"] as const)(
    "retains useful %s positioning, viewport props and refs",
    (position) => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Toaster
          position={position}
          ref={ref}
          viewportProps={{className: "consumer"}}
        />,
      );
      expect(ref.current).toHaveAttribute("data-position", position);
      expect(ref.current).toHaveClass("consumer");
    },
  );

  it("supports provider-local hook operations without attaching the global manager", async () => {
    function Local(): React.JSX.Element {
      const {add, update, close, toasts} = useToastManager<{key: number}>();
      return (
        <>
          <button
            type='button'
            onClick={() => {
              const id = add({title: "Local", data: {key: 1}});
              update(id, (previous) => ({title: `Local ${previous.data?.key}`}));
            }}>
            Add local
          </button>
          <button
            type='button'
            onClick={() => close()}>
            Close local
          </button>
          <output>{toasts.length}</output>
          <CompoundList />
        </>
      );
    }
    render(
      <ToastProvider timeout={0}>
        <Local />
      </ToastProvider>,
    );
    await userEvent.setup().click(screen.getByRole("button", {name: "Add local"}));
    expect(screen.getByText("Local 1")).toBeInTheDocument();
    act(() => {
      toast.add({title: "Global should not appear"});
    });
    expect(screen.queryByText("Global should not appear")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", {name: "Close local"}));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("0");
    });
  });

  it("uses actual manager promise timing and updates the same toast", async () => {
    const manager = createToastManager();
    const {promise, resolve} = Promise.withResolvers<number>();
    render(
      <Toaster
        toastManager={manager}
        timeout={0}
      />,
    );
    let pending: Promise<number> | undefined;
    act(() => {
      pending = manager.promise(promise, {
        loading: {title: 0},
        success: (value) => ({title: value}),
        error: (error) => (error instanceof Error ? error.message : String(error)),
      });
    });
    const root = screen.getByText("0").closest("[data-slot=toast]");
    expect(root).toHaveAttribute("data-type", "loading");
    await act(async () => {
      resolve(42);
      expect(await pending).toBe(42);
    });
    expect(screen.getByText("42").closest("[data-slot=toast]")).toBe(root);
    expect(root).toHaveAttribute("data-type", "success");
  });

  it.each(["success", "info", "warning", "error", "loading", "custom"])("renders %s default composition", (type) => {
    const manager = createToastManager();
    render(
      <Toaster
        toastManager={manager}
        timeout={0}
      />,
    );
    act(() => {
      manager.add({title: type, type});
    });
    expect(screen.getByText(type).closest("[data-slot=toast]")).toHaveAttribute("data-type", type);
  });

  it("preserves strict generic notification-data and state types", () => {
    expectTypeOf<ToastData<{code: number}>["id"]>().toEqualTypeOf<string>();
    expectTypeOf<NonNullable<ToastData<{code: number}>["data"]>["code"]>().toEqualTypeOf<number>();
    expectTypeOf<ToastProps<{code: number}>["toast"]>().toEqualTypeOf<ToastData<{code: number}>>();
    expectTypeOf<ToastState["swipeDirection"]>().toEqualTypeOf<"up" | "down" | "left" | "right" | undefined>();
    expectTypeOf<"children" extends keyof NonNullable<ToasterProps["viewportProps"]> ? true : false>().toEqualTypeOf<false>();
  });

  it("emits real starting-style/ending-style props without wrapper-owned transition state", async () => {
    const manager = createToastManager();
    const observations: Array<{state: ToastState; props: object}> = [];
    function List(): React.JSX.Element {
      const {toasts} = useToastManager();
      return (
        <ToastViewport>
          {toasts.map((item) => (
            <Toast
              key={item.id}
              toast={item}
              render={(props, state) => {
                observations.push({state, props});
                return <div {...props} />;
              }}>
              <ToastContent>
                <ToastTitle />
              </ToastContent>
            </Toast>
          ))}
        </ToastViewport>
      );
    }
    render(
      <ToastProvider
        toastManager={manager}
        timeout={0}>
        <List />
      </ToastProvider>,
    );
    let id = "";
    act(() => {
      id = manager.add({title: "Transition"});
    });
    const starting = observations.find((observation) => observation.state.transitionStatus === "starting");
    expect(starting).toBeDefined();
    expect(starting?.props).toHaveProperty("data-starting-style");
    act(() => {
      manager.close(id);
    });
    const ending = observations.find((observation) => observation.state.transitionStatus === "ending");
    expect(ending?.props).toHaveProperty("data-ending-style");
    await waitFor(() => {
      expect(screen.queryByText("Transition")).not.toBeInTheDocument();
    });
  });

  it("supports actual pointer swipe state and emitted swipe direction", async () => {
    const manager = createToastManager();
    const observations: ToastState[] = [];
    function List(): React.JSX.Element {
      const {toasts} = useToastManager();
      return (
        <ToastViewport>
          {toasts.map((item) => (
            <Toast
              key={item.id}
              toast={item}
              swipeDirection='right'
              render={(props, state) => {
                observations.push(state);
                return <div {...props} />;
              }}>
              <ToastContent>
                <ToastTitle />
              </ToastContent>
            </Toast>
          ))}
        </ToastViewport>
      );
    }
    render(
      <ToastProvider
        toastManager={manager}
        timeout={0}>
        <List />
      </ToastProvider>,
    );
    act(() => {
      manager.add({title: "Swipe"});
    });
    const root = screen.getByText("Swipe").closest("[data-slot=toast]");
    if (!root) {
      throw new Error("Missing swipe root");
    }
    fireEvent.pointerDown(root, {button: 0, pointerId: 1, pointerType: "touch", clientX: 0, clientY: 0});
    expect(root).toHaveAttribute("data-swiping");
    fireEvent.pointerMove(root, {pointerId: 1, clientX: 1, clientY: 0, movementX: 1, movementY: 0});
    fireEvent.pointerMove(root, {pointerId: 1, clientX: 80, clientY: 0, movementX: 79, movementY: 0});
    expect(root).toHaveAttribute("data-swipe-direction", "right");
    fireEvent.pointerUp(root, {pointerId: 1});
    expect(observations.some((state) => state.transitionStatus === "ending" && state.swipeDirection === "right")).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText("Swipe")).not.toBeInTheDocument();
    });
  });

  it("supports React lazy render elements without evaluating them outside a Suspense boundary", async () => {
    const {promise, resolve} = Promise.withResolvers<{default: React.ComponentType<React.ComponentPropsWithRef<"div">>}>();
    const LazyRoot = React.lazy(() => promise);
    const manager = createToastManager();
    const ref = React.createRef<HTMLDivElement>();
    function List(): React.JSX.Element {
      const {toasts} = useToastManager();
      return (
        <ToastViewport>
          {toasts.map((item) => (
            <Toast
              key={item.id}
              toast={item}
              ref={ref}
              render={<LazyRoot />}>
              <ToastContent>
                <ToastTitle />
              </ToastContent>
            </Toast>
          ))}
        </ToastViewport>
      );
    }
    render(
      <React.Suspense fallback={<div>Suspended</div>}>
        <ToastProvider
          toastManager={manager}
          timeout={0}>
          <List />
        </ToastProvider>
      </React.Suspense>,
    );
    act(() => {
      manager.add({title: "Lazy root content"});
    });
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    await act(async () => {
      resolve({default: (props) => <div {...props} />});
      await promise;
    });
    expect(await screen.findByText("Lazy root content")).toBeInTheDocument();
    expect(ref.current).toHaveAttribute("data-slot", "toast");
  });

  it("keeps loading manager toasts alive, then starts the success timeout", async () => {
    vi.useFakeTimers();
    const manager = createToastManager();
    const source = Promise.withResolvers<number>();
    const onClose = vi.fn();
    render(
      <Toaster
        toastManager={manager}
        timeout={20}
      />,
    );
    let pending: Promise<number> | undefined;
    act(() => {
      pending = manager.promise(source.promise, {
        loading: {title: "Still loading", onClose},
        success: {title: "Timed success"},
        error: "Failed",
      });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Still loading")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      source.resolve(42);
      await pending;
    });
    expect(screen.getByText("Timed success")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps top-position default swipes directed off the top edge", async () => {
    const manager = createToastManager();
    render(
      <Toaster
        toastManager={manager}
        position='top-right'
        timeout={0}
      />,
    );
    act(() => {
      manager.add({title: "Top swipe"});
    });
    const root = screen.getByText("Top swipe").closest("[data-slot=toast]");
    if (!root) {
      throw new Error("Missing top root");
    }
    fireEvent.pointerDown(root, {button: 0, pointerId: 1, pointerType: "touch", clientX: 0, clientY: 0});
    fireEvent.pointerMove(root, {pointerId: 1, clientX: 0, clientY: -1, movementX: 0, movementY: -1});
    fireEvent.pointerMove(root, {pointerId: 1, clientX: 0, clientY: -80, movementX: 0, movementY: -79});
    expect(root).toHaveAttribute("data-swipe-direction", "up");
    fireEvent.pointerUp(root, {pointerId: 1});
    await waitFor(() => {
      expect(screen.queryByText("Top swipe")).not.toBeInTheDocument();
    });
  });

  it.each(Object.entries(composeStories(ToastStories)))("mounts the real composed %s story", (_name, Story) => {
    render(<Story />);
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });

  it.each(["constructor", "toString", "__proto__"])("treats custom type %s as iconless without prototype lookups", (type) => {
    const manager = createToastManager();
    render(
      <Toaster
        toastManager={manager}
        timeout={0}
      />,
    );
    act(() => {
      manager.add({title: type, type});
    });
    expect(screen.getByText(type).closest("[data-slot=toast]")?.querySelector("[data-slot=toast-icon]")).toBeNull();
  });
});
