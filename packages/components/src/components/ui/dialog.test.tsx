import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {Button} from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import styles from "./dialog.module.css";
import * as stories from "./dialog.stories";

const {FocusContract: FocusContractStory} = composeStories(stories);

// Models the resolved Flight slot accepted by the actual React/Base UI renderer.
function resolvedLazySlot(element: React.ReactElement): React.ReactElement
  & Readonly<{
    $$typeof: symbol;
    _payload: React.ReactElement;
    _init: () => React.ReactElement;
  }> {
  return {...element, $$typeof: Symbol.for("react.lazy"), _payload: element, _init: () => element};
}

function requiredStyle(name: string): string {
  const className = styles[name];
  if (!className) throw new Error(`Missing dialog CSS class: ${name}`);
  return className;
}

function renderDialog({
  className,
  defaultOpen = false,
  onOpenChange,
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerAsChild?: boolean;
}>) {
  return render(
    <Dialog
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}>
      <DialogTrigger render={triggerAsChild ? <button type='button'>Open dialog</button> : undefined}>
        {triggerAsChild ? undefined : "Open dialog"}
      </DialogTrigger>
      <DialogContent
        className={className}
        data-testid='dialog-content'>
        <DialogTitle>Dialog title</DialogTitle>
        <DialogDescription>Dialog description</DialogDescription>
        <DialogClose>Close dialog</DialogClose>
      </DialogContent>
    </Dialog>,
  );
}

describe("Dialog", () => {
  it.each([
    ["alert-dialog", "control"],
    ["dialog", "control"],
    ["sheet", "control"],
    ["drawer", "control"],
    ["popover", "control"],
    ["hover-card", "control"],
    ["context-menu", "control"],
    ["dropdown-menu", "trigger"],
    ["tooltip", "trigger"],
    ["command", "item"],
  ])("refresh accessibility: %s authors minimum standalone control targets", (family, part) => {
    const css = readFileSync(join(import.meta.dirname, `${family}.module.css`), "utf8");
    expect(css).toMatch(new RegExp(`\\.${part}\\s*\\{[^}]*display:\\s*(?:inline-flex|flex|block)`, "u"));
    expect(css).toMatch(new RegExp(`\\.${part}\\s*\\{[^}]*min-width:\\s*1\\.5rem`, "u"));
    expect(css).toMatch(new RegExp(`\\.${part}\\s*\\{[^}]*min-height:\\s*1\\.5rem`, "u"));
  });

  it("refresh accessibility: does not disable popup touch scrolling or pinch zoom", () => {
    const css = readFileSync(join(import.meta.dirname, "dialog.module.css"), "utf8");
    expect(css).toMatch(/\.popup\s*\{[^}]*touch-action:\s*pan-y pinch-zoom/u);
  });

  it("refresh accessibility: localizes both automatic dismissal controls", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent closeLabel='Fermer la fenêtre'>
          <DialogTitle>Préférences</DialogTitle>
          <DialogFooter
            showCloseButton
            closeLabel='Terminer'
          />
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", {name: "Fermer la fenêtre"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Terminer"})).toBeInTheDocument();
  });

  it.each([
    {modal: true, blocking: true},
    {modal: false, blocking: false},
    {modal: "trap-focus", blocking: false},
  ] as const)("renders the page-blocking backdrop only for a fully modal root (modal=$modal)", ({modal, blocking}) => {
    render(
      <Dialog
        defaultOpen
        modal={modal}>
        <DialogContent>
          <DialogTitle>Modality dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", {name: "Modality dialog"})).toBeVisible();
    expect(Boolean(document.querySelector('[data-slot="dialog-overlay"]'))).toBe(blocking);
  });

  it.each([false, "trap-focus"] as const)("leaves outside controls usable without a dimming backdrop for modal=%s", async (modal) => {
    const user = userEvent.setup();
    const outsidePress = vi.fn<() => void>();
    render(
      <>
        <button
          type='button'
          onClick={outsidePress}>
          Outside control
        </button>
        <Dialog
          defaultOpen
          modal={modal}
          disablePointerDismissal>
          <DialogContent>
            <DialogTitle>Nonblocking dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      </>,
    );
    expect(document.querySelector(`.${requiredStyle("backdrop")}`)).not.toBeInTheDocument();
    await user.click(screen.getByText("Outside control"));
    expect(outsidePress).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", {name: "Nonblocking dialog"})).toBeVisible();
  });

  it("keeps the styled popup and its form state mounted through portalProps.keepMounted", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Reopen kept dialog</DialogTrigger>
        <DialogContent portalProps={{keepMounted: true}}>
          <DialogTitle>Kept dialog</DialogTitle>
          <input aria-label='Draft note' />
        </DialogContent>
      </Dialog>,
    );
    const popup = screen.getByRole("dialog", {name: "Kept dialog"});
    await user.type(screen.getByRole("textbox", {name: "Draft note"}), "unsaved");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(popup).toHaveAttribute("hidden"));
    expect(popup).toBeInTheDocument();
    expect(popup).toHaveClass(requiredStyle("popup"));
    await user.click(screen.getByRole("button", {name: "Reopen kept dialog"}));
    expect(screen.getByRole("dialog", {name: "Kept dialog"})).toBe(popup);
    expect(screen.getByRole("textbox", {name: "Draft note"})).toHaveValue("unsaved");
  });

  it("portals the styled popup and backdrop into portalProps.container with the remaining Portal props", () => {
    const host = document.createElement("section");
    document.body.append(host);
    const view = render(
      <Dialog defaultOpen>
        <DialogContent portalProps={{container: host, className: "caller-portal"}}>
          <DialogTitle>Contained dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const popup = screen.getByRole("dialog", {name: "Contained dialog"});
    expect(host).toContainElement(popup);
    expect(host).toContainElement(document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]'));
    expect(popup.closest(".caller-portal")?.parentElement).toBe(host);
    view.unmount();
    host.remove();
  });

  it.each([
    ["element", true],
    ["element", false],
    ["resolved lazy", true],
    ["resolved lazy", false],
  ] as const)("preserves %s popup children over fallback children with showCloseButton=%s", async (kind, showCloseButton) => {
    const user = userEvent.setup();
    const slotRef = React.createRef<HTMLElement>();
    const popupRef = React.createRef<HTMLDivElement>();
    const closeRef = React.createRef<HTMLButtonElement>();
    const events: string[] = [];
    const slot = (
      <section
        ref={slotRef}
        className='slot-popup'
        onClick={() => events.push("slot")}>
        <DialogTitle>Slot title</DialogTitle>
        <DialogDescription>Slot description</DialogDescription>
        <DialogClose
          ref={closeRef}
          title='Embedded close props'
          onClick={() => events.push("close")}>
          Embedded Close
        </DialogClose>
      </section>
    );
    render(
      <Dialog defaultOpen>
        <DialogContent
          ref={popupRef}
          className='wrapper-popup'
          showCloseButton={showCloseButton}
          onClick={() => events.push("wrapper")}
          render={kind === "element" ? slot : resolvedLazySlot(slot)}>
          <DialogTitle>Wrapper fallback</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const popup = screen.getByRole("dialog", {name: "Slot title"});
    expect(popup).toHaveAccessibleDescription("Slot description");
    expect(screen.queryByText("Wrapper fallback")).not.toBeInTheDocument();
    expect(popup).toHaveClass("slot-popup", "wrapper-popup");
    expect(slotRef.current).toBe(popup);
    expect(popupRef.current).toBe(popup);
    expect(closeRef.current).toHaveAttribute("title", "Embedded close props");
    expect(screen.getAllByRole("button").map((button) => button.textContent || button.getAttribute("aria-label"))).toEqual(
      showCloseButton ? ["Embedded Close", "Close"] : ["Embedded Close"],
    );
    await user.click(screen.getByRole("button", {name: "Embedded Close"}));
    expect(events).toEqual(["close", "slot", "wrapper"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["element", "resolved lazy"] as const)("appends footer Close after %s actions rather than wrapper fallback", async (kind) => {
    const user = userEvent.setup();
    const slotRef = React.createRef<HTMLElement>();
    const footerRef = React.createRef<HTMLElement>();
    const events: string[] = [];
    const slot = (
      <footer
        ref={slotRef}
        className='slot-footer'
        onClick={() => events.push("slot")}>
        <Button>Slot action</Button>
      </footer>
    );
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Footer precedence</DialogTitle>
          <DialogFooter
            ref={footerRef}
            className='wrapper-footer'
            showCloseButton
            onClick={() => events.push("wrapper")}
            render={kind === "element" ? slot : resolvedLazySlot(slot)}>
            <Button>Wrapper fallback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole("button", {name: "Wrapper fallback"})).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Slot action", "Close"]);
    expect(slotRef.current).toBe(footerRef.current);
    expect(footerRef.current).toHaveClass("slot-footer", "wrapper-footer");
    await user.click(screen.getByRole("button", {name: "Close"}));
    expect(events).toEqual(["slot", "wrapper"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("decorates a resolved lazy footer compatibility slot without losing its content", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Lazy footer slot</DialogTitle>
          <DialogFooter
            showCloseButton
            render={resolvedLazySlot(
              <footer>
                <Button>Slot action</Button>
              </footer>,
            )}
          />
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Slot action", "Close"]);
  });

  it("does not resolve a pending popup slot while closed and adds Close after it resolves while mounted", async () => {
    const request = Promise.withResolvers<React.ReactElement>();
    let resolved: React.ReactElement | undefined;
    let reads = 0;
    void request.promise.then((element) => {
      resolved = element;
    });
    const seed = <section />;
    const slot = {
      ...seed,
      $$typeof: Symbol.for("react.lazy"),
      _payload: request.promise,
      _init: () => {
        reads += 1;
        if (resolved) return resolved;
        throw request.promise;
      },
    };
    function PendingDialog({open}: Readonly<{open: boolean}>): React.ReactElement {
      return (
        <React.Suspense fallback={<p role='status'>Loading popup slot</p>}>
          <Dialog open={open}>
            <DialogContent render={slot} />
          </Dialog>
        </React.Suspense>
      );
    }
    const {rerender} = render(<PendingDialog open={false} />);
    expect(reads).toBe(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<PendingDialog open />);
    expect(reads).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Loading popup slot");
    await act(async () => {
      request.resolve(
        <section>
          <DialogTitle>Resolved title</DialogTitle>
          <DialogDescription>Resolved description</DialogDescription>
        </section>,
      );
      await request.promise;
    });
    expect(screen.getByRole("dialog", {name: "Resolved title"})).toHaveAccessibleDescription("Resolved description");
    expect(screen.getByRole("button", {name: "Close"})).toBeInTheDocument();
  });

  it("does not resolve a pending opt-in footer slot before its popup mounts", async () => {
    const request = Promise.withResolvers<React.ReactElement>();
    let resolved: React.ReactElement | undefined;
    let reads = 0;
    void request.promise.then((element) => {
      resolved = element;
    });
    const seed = <footer />;
    const slot = {
      ...seed,
      $$typeof: Symbol.for("react.lazy"),
      _payload: request.promise,
      _init: () => {
        reads += 1;
        if (resolved) return resolved;
        throw request.promise;
      },
    };
    function PendingFooter({open}: Readonly<{open: boolean}>): React.ReactElement {
      return (
        <React.Suspense fallback={<p role='status'>Loading footer slot</p>}>
          <Dialog open={open}>
            <DialogContent showCloseButton={false}>
              <DialogTitle>Pending footer</DialogTitle>
              <DialogFooter
                showCloseButton
                render={slot}>
                <Button>Fallback action</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </React.Suspense>
      );
    }
    const {rerender} = render(<PendingFooter open={false} />);
    expect(reads).toBe(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<PendingFooter open />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading footer slot");
    await act(async () => {
      request.resolve(
        <footer>
          <Button>Resolved action</Button>
        </footer>,
      );
      await request.promise;
    });
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Resolved action", "Close"]);
    expect(screen.queryByRole("button", {name: "Fallback action"})).not.toBeInTheDocument();
  });

  it("passes function render callbacks only from the actual mounted Popup with live state", () => {
    const states: DialogContent.State[] = [];
    const callback: Exclude<DialogContent.Props["render"], React.ReactElement | undefined> = (props, state) => {
      states.push(state);
      return (
        <section
          {...props}
          data-callback-open={String(state.open)}
        />
      );
    };
    const {rerender} = render(
      <Dialog open={false}>
        <DialogContent render={callback}>
          <DialogTitle>Callback title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(states).toEqual([]);
    rerender(
      <Dialog open>
        <DialogContent render={callback}>
          <DialogTitle>Callback title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const popup = screen.getByRole("dialog", {name: "Callback title"});
    expect(popup).toHaveAttribute("data-callback-open", "true");
    expect(states.length).toBeGreaterThan(0);
    expect(states.every((state) => state.open && !state.nested)).toBe(true);
    expect(screen.getByRole("button", {name: "Close"})).toBeInTheDocument();
  });

  it("keeps an explicit undefined render-element child value ahead of wrapper fallback", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent
          aria-label='Explicit empty content'
          render={<section children={undefined} />}>
          <p>Wrapper fallback</p>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText("Wrapper fallback")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", {name: "Explicit empty content"})).toBeVisible();
    expect(screen.getByRole("button", {name: "Close"})).toBeInTheDocument();
  });

  it("uses wrapper children for a render element with no own children property", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent render={<section />}>
          <DialogTitle>Fallback title</DialogTitle>
          <DialogDescription>Fallback description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", {name: "Fallback title"})).toHaveAccessibleDescription("Fallback description");
    expect(screen.getByRole("button", {name: "Close"})).toBeInTheDocument();
  });

  it.each(["element", "resolved lazy"] as const)("preserves %s Close props, child precedence and cancellation", async (kind) => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLElement>();
    const closeRef = React.createRef<HTMLButtonElement>();
    const slot = (
      <Button
        ref={childRef}
        onClick={(event) => event.preventBaseUIHandler()}>
        Slot Close
      </Button>
    );
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Close precedence</DialogTitle>
          <DialogClose
            ref={closeRef}
            title='Close props'
            className='caller-close'
            render={kind === "element" ? slot : resolvedLazySlot(slot)}>
            Wrapper fallback
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );
    const close = screen.getByRole("button", {name: "Slot Close"});
    expect(close).toHaveAttribute("title", "Close props");
    expect(close).toHaveClass("caller-close");
    expect(closeRef.current).toBe(close);
    expect(childRef.current).toBe(close);
    await user.click(close);
    expect(screen.getByRole("dialog", {name: "Close precedence"})).toBeVisible();
  });

  it("renders the actual FocusContract story and opens its nested real modal", async () => {
    const user = userEvent.setup();
    render(<FocusContractStory />);
    await user.click(screen.getByRole("button", {name: "Open focus contract"}));
    expect(screen.getByRole("dialog", {name: "Focus contract"})).toHaveAccessibleDescription(
      "The automatic close follows all supplied content in DOM order.",
    );
    await user.click(screen.getByRole("button", {name: "Open nested dialog"}));
    expect(screen.getByRole("dialog", {name: "Nested focus contract"})).toBeVisible();
    await user.click(screen.getByRole("button", {name: "Return to parent"}));
    expect(screen.getByRole("dialog", {name: "Focus contract"})).toBeVisible();
  });

  it("preserves callback-ref cleanup and renders a single composed Button trigger", () => {
    const events: string[] = [];
    const ref: React.RefCallback<HTMLElement> = (element) => {
      if (element) events.push(element.tagName);
      return () => {
        events.push("cleanup");
      };
    };
    const {unmount} = render(
      <Dialog>
        <DialogTrigger
          ref={ref}
          render={<Button>Composed trigger</Button>}
        />
      </Dialog>,
    );
    expect(screen.getByRole("button", {name: "Composed trigger"}).querySelector("button")).toBeNull();
    expect(events).toEqual(["BUTTON"]);
    unmount();
    expect(events).toEqual(["BUTTON", "cleanup"]);
  });

  it("supports callback footer composition with optional close", () => {
    const ref = React.createRef<HTMLElement>();
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Footer composition</DialogTitle>
          <DialogFooter
            ref={ref}
            showCloseButton
            render={(props) => <footer {...props} />}>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(ref.current?.tagName).toBe("FOOTER");
    expect(ref.current).toHaveTextContent("SaveClose");
  });

  it("keeps embedded render-element content when appending the automatic close", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent
          render={
            <section>
              <DialogTitle>Embedded title</DialogTitle>
              <DialogDescription>Embedded description</DialogDescription>
            </section>
          }
        />
      </Dialog>,
    );
    expect(screen.getByRole("dialog", {name: "Embedded title"})).toHaveAccessibleDescription("Embedded description");
    expect(screen.getByRole("button", {name: "Close"})).toBeInTheDocument();
  });

  it("keeps the exported Close unstyled and the automatic close last", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Close controls</DialogTitle>
          <DialogDescription>Choose how to close</DialogDescription>
          <DialogClose>Dismiss</DialogClose>
        </DialogContent>
      </Dialog>,
    );
    const close = screen.getByRole("button", {name: "Dismiss"});
    expect(close).not.toHaveClass(requiredStyle("close"));
    expect(screen.getByRole("button", {name: "Close"})).toHaveClass(requiredStyle("close"));
    expect(screen.getAllByRole("button")).toEqual([close, screen.getByRole("button", {name: "Close"})]);
  });

  it("forwards actual popup, backdrop, close, title and description callback props and refs", () => {
    const popupRef = React.createRef<HTMLDivElement>();
    const closeRef = React.createRef<HTMLButtonElement>();
    const titleRef = React.createRef<HTMLHeadingElement>();
    const descriptionRef = React.createRef<HTMLParagraphElement>();
    const backdropRef = React.createRef<HTMLDivElement>();
    render(
      <Dialog defaultOpen>
        <DialogPortal>
          <DialogOverlay
            ref={backdropRef}
            render={(props, state) => (
              <div
                {...props}
                data-testid='backdrop'
                data-state={String(state.open)}
              />
            )}
          />
        </DialogPortal>
        <DialogContent
          ref={popupRef}
          showCloseButton={false}
          render={(props, state) => (
            <section
              {...props}
              data-state={String(state.open)}
              data-nested={String(state.nested)}
            />
          )}>
          <DialogTitle
            ref={titleRef}
            render={(props) => <h3 {...props} />}>
            Composed modal
          </DialogTitle>
          <DialogDescription
            ref={descriptionRef}
            render={(props) => <p {...props} />}>
            Composed description
          </DialogDescription>
          <DialogClose
            ref={closeRef}
            disabled
            render={(props, state) => (
              <button
                {...props}
                data-disabled={String(state.disabled)}
              />
            )}>
            Dismiss
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );
    const popup = screen.getByRole("dialog", {name: "Composed modal"});
    expect(popup).toHaveAccessibleDescription("Composed description");
    expect(popup.tagName).toBe("SECTION");
    expect(popup).toHaveAttribute("data-state", "true");
    expect(popup).toHaveAttribute("data-nested", "false");
    expect(popupRef.current).toBe(popup);
    expect(titleRef.current).toBe(screen.getByRole("heading", {name: "Composed modal"}));
    expect(descriptionRef.current).toBe(screen.getByText("Composed description"));
    expect(closeRef.current).toBe(screen.getByRole("button", {name: "Dismiss"}));
    expect(closeRef.current).toHaveAttribute("data-disabled", "true");
    expect(backdropRef.current).toBe(screen.getByTestId("backdrop"));
    expect(backdropRef.current).toHaveAttribute("data-state", "true");
  });

  it("supports callback composition onto anchors and labels without default-tag ref assumptions", () => {
    const headerRef = React.createRef<HTMLElement>();
    const triggerRef = React.createRef<HTMLElement>();
    render(
      <Dialog>
        <DialogTrigger
          ref={triggerRef}
          nativeButton={false}
          render={(props) => (
            <a
              {...props}
              href='#dialog'
            />
          )}>
          Open link
        </DialogTrigger>
        <DialogHeader
          ref={headerRef}
          render={(props) => (
            <label
              {...props}
              htmlFor='field'
            />
          )}>
          Field label
        </DialogHeader>
      </Dialog>,
    );
    expect(triggerRef.current).toBe(screen.getByRole("button", {name: "Open link"}));
    expect(triggerRef.current?.tagName).toBe("A");
    expect(headerRef.current).toBe(screen.getByText("Field label"));
    expect(headerRef.current?.tagName).toBe("LABEL");
  });

  it("merges child and wrapper refs, click handlers and native link behavior for render composition", async () => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const calls: string[] = [];
    render(
      <Dialog>
        <DialogTrigger
          ref={wrapperRef}
          onClick={() => calls.push("wrapper")}
          nativeButton={false}
          render={
            <a
              href='#legacy-dialog'
              ref={childRef}
              onClick={() => calls.push("child")}>
              Legacy link
            </a>
          }
        />
        <DialogContent>
          <DialogTitle>Legacy modal</DialogTitle>
          <DialogDescription>Preserved child content</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const link = screen.getByRole("button", {name: "Legacy link"});
    expect(link).toHaveAttribute("href", "#legacy-dialog");
    expect(link).not.toHaveAttribute("type");
    expect(childRef.current).toBe(link);
    expect(wrapperRef.current).toBe(link);
    await user.click(link);
    expect(calls).toEqual(["child", "wrapper"]);
    expect(screen.getByRole("dialog", {name: "Legacy modal"})).toBeVisible();
  });

  it("preserves child cancellation instead of opening the dialog", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger render={<Button onClick={(event) => event.preventBaseUIHandler()} />}>Do not open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Blocked modal</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", {name: "Do not open"}));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a single button when composing real Button and respects disabled controls", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Disabled close</DialogTitle>
          <DialogClose
            disabled
            render={<Button variant='outline' />}>
            Cannot close
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );
    const close = screen.getByRole("button", {name: "Cannot close"});
    expect(close.querySelector("button")).toBeNull();
    expect(close).toBeDisabled();
    await user.click(close);
    expect(screen.getByRole("dialog", {name: "Disabled close"})).toBeVisible();
  });

  it("retains rendered footer content when appending a Close control", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Footer slots</DialogTitle>
          <DialogFooter
            showCloseButton
            render={
              <footer data-testid='footer'>
                <Button>Save</Button>
              </footer>
            }
          />
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId("footer").tagName).toBe("FOOTER");
    expect(
      within(screen.getByTestId("footer"))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Save", "Close"]);
  });

  it("surfaces consumer render errors", () => {
    expect(() =>
      render(
        <Dialog>
          <DialogTrigger
            render={() => {
              throw new Error("consumer render failed");
            }}
          />
        </Dialog>,
      ),
    ).toThrow("consumer render failed");
  });

  it("passes real open state to the primitive render callback without losing children", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger
          render={(props, state) => (
            <button
              {...props}
              data-open={String(state.open)}
            />
          )}>
          Open state
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>State dialog</DialogTitle>
          <DialogDescription>State description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", {name: "Open state"});
    expect(trigger).toHaveAttribute("data-open", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("dialog", {name: "State dialog"})).toHaveAccessibleDescription("State description");
  });

  it("offers an automatic icon close and an opt-in footer close", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Footer dialog</DialogTitle>
          <DialogDescription>Footer description</DialogDescription>
          <DialogFooter showCloseButton>
            <button type='button'>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", {name: "Close"})).toHaveTextContent("Close");
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Save", "Close"]);
  });

  it("renders the trigger as an accessible button and opens the dialog", async () => {
    // Arrange — render closed first to verify trigger accessibility
    const user = userEvent.setup();
    renderDialog({defaultOpen: false});

    // Assert — trigger is accessible before dialog opens
    const trigger = screen.getByRole("button", {name: "Open dialog"});
    expect(trigger).toBeInTheDocument();
    expect(trigger).toBeVisible();

    // Act — open the dialog
    await user.click(trigger);

    // Assert — dialog is visible
    expect(await screen.findByRole("dialog", {name: "Dialog title"})).toBeVisible();
  });

  it("opens the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialog({defaultOpen: false});

    // Act
    await user.click(screen.getByRole("button", {name: "Open dialog"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Dialog title"})).toBeVisible();
  });

  it("closes when the close button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialog({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open dialog"}));

    // Act
    await user.click(await screen.findByRole("button", {name: "Close dialog"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Dialog title"})).not.toBeInTheDocument();
    });
  });

  it("calls onOpenChange with false when the dialog closes", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();

    renderDialog({defaultOpen: false, onOpenChange: handleOpenChange});

    // Act
    await user.click(screen.getByRole("button", {name: "Open dialog"}));

    // Assert
    expect(handleOpenChange.mock.calls.at(-1)?.[0]).toBe(true);

    // Act
    await user.click(await screen.findByRole("button", {name: "Close dialog"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Dialog title"})).not.toBeInTheDocument();
    });
    expect(handleOpenChange.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderDialog({className: "custom-dialog-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("dialog-content")).toHaveClass("custom-dialog-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialog({triggerAsChild: true});

    // Act
    await user.click(screen.getByRole("button", {name: "Open dialog"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Dialog title"})).toBeVisible();
  });

  it("closes the dialog when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialog({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open dialog"}));
    expect(await screen.findByRole("dialog", {name: "Dialog title"})).toBeVisible();

    // Act — Base UI Dialog traps focus inside; pressing Escape triggers the close handler
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Dialog title"})).not.toBeInTheDocument();
    });
  });

  it("exposes modal dialog accessibility semantics", async () => {
    // Arrange
    renderDialog({defaultOpen: true});

    // Assert
    const dialog = await screen.findByRole("dialog", {name: "Dialog title"});
    const trigger = screen.getByRole("button", {hidden: true, name: "Open dialog"});

    expect(dialog).toHaveAccessibleDescription("Dialog description");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("renders header and footer containers with their default wrappers", async () => {
    // Arrange
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader data-testid='dialog-header'>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
          <DialogFooter data-testid='dialog-footer'>
            <DialogClose>Close dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    // Assert
    expect((await screen.findByTestId("dialog-header")).tagName).toBe("DIV");
    expect(screen.getByTestId("dialog-footer").tagName).toBe("DIV");
    expect(screen.getByRole("button", {name: "Close dialog"})).toBeInTheDocument();
  });

  it("supports rendering header and footer as child elements", async () => {
    // Arrange
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader
            render={
              <header data-testid='dialog-header'>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogDescription>Dialog description</DialogDescription>
              </header>
            }
          />
          <DialogFooter
            render={
              <footer data-testid='dialog-footer'>
                <DialogClose>Close dialog</DialogClose>
              </footer>
            }
          />
        </DialogContent>
      </Dialog>,
    );

    // Assert
    expect((await screen.findByTestId("dialog-header")).tagName).toBe("HEADER");
    expect(screen.getByTestId("dialog-header").querySelector("header")).toBeNull();
    expect(screen.getByTestId("dialog-footer").tagName).toBe("FOOTER");
    expect(screen.getByTestId("dialog-footer").querySelector("footer")).toBeNull();
    expect(screen.getByRole("button", {name: "Close dialog"})).toBeInTheDocument();
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();

    function ControlledDialog(): React.JSX.Element {
      const [open, setOpen] = React.useState(false);

      return (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            handleOpenChange(nextOpen);
          }}>
          <DialogTrigger>Open dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Controlled dialog title</DialogTitle>
            <DialogDescription>Controlled dialog description</DialogDescription>
            <DialogClose>Close dialog</DialogClose>
          </DialogContent>
        </Dialog>
      );
    }

    render(<ControlledDialog />);

    const trigger = screen.getByRole("button", {name: "Open dialog"});

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange).toHaveBeenCalledWith(true);
    expect(await screen.findByRole("dialog", {name: "Controlled dialog title"})).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Act
    await user.click(screen.getByRole("button", {name: "Close dialog"}));

    // Assert
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Controlled dialog title"})).not.toBeInTheDocument();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  describe("observable focus and dismissal controller (not native inert proof)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Testing Library drains its async wrapper through the Jest clock interface.
      vi.stubGlobal("jest", {advanceTimersByTime: vi.advanceTimersByTime});
      const rect = new DOMRect(0, 0, 100, 20);
      const rects: DOMRectList = {
        0: rect,
        length: 1,
        item: (index) => (index === 0 ? rect : null),
        [Symbol.iterator]: () => [rect][Symbol.iterator](),
      };
      vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(rects);
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    });
    afterEach(() => {
      cleanup();
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    async function settle(): Promise<void> {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150);
      });
    }

    it("moves focus into the named modal, observes Tab/Shift+Tab, and returns focus to the trigger", async () => {
      const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
      const {container} = render(
        <Dialog>
          <DialogTrigger>Open focus contract</DialogTrigger>
          <DialogContent>
            <DialogTitle>Focus contract</DialogTitle>
            <DialogDescription>Controller observations</DialogDescription>
            <input aria-label='First field' />
            <Button>Save</Button>
          </DialogContent>
        </Dialog>,
      );
      const trigger = screen.getByRole("button", {name: "Open focus contract"});
      await user.click(trigger);
      await settle();
      expect(screen.getByRole("dialog", {name: "Focus contract"})).toHaveAccessibleDescription("Controller observations");
      expect(screen.getByRole("textbox", {name: "First field"})).toHaveFocus();
      expect(container).toHaveAttribute("aria-hidden", "true");
      expect(container).toHaveAttribute("data-base-ui-inert");
      await user.tab();
      expect(screen.getByRole("button", {name: "Save"})).toHaveFocus();
      await user.tab({shift: true});
      expect(screen.getByRole("textbox", {name: "First field"})).toHaveFocus();
      await user.keyboard("{Escape}");
      await settle();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      expect(container).not.toHaveAttribute("aria-hidden");
      expect(container).not.toHaveAttribute("data-base-ui-inert");
    });

    it("allows the owner to cancel Escape and outside-press requests", async () => {
      const reasons: string[] = [];
      const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
      render(
        <Dialog
          defaultOpen
          onOpenChange={(open, details) => {
            if (!open) {
              reasons.push(details.reason);
              details.cancel();
            }
          }}>
          <DialogContent>
            <DialogTitle>Unsaved changes</DialogTitle>
            <Button>Stay</Button>
          </DialogContent>
        </Dialog>,
      );
      await settle();
      await user.keyboard("{Escape}");
      expect(screen.getByRole("dialog")).toBeVisible();
      const backdrop = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
      expect(backdrop).not.toBeNull();
      if (!backdrop) throw new Error("Missing dialog backdrop");
      await user.click(backdrop);
      await settle();
      expect(screen.getByRole("dialog")).toBeVisible();
      expect(reasons).toEqual(["escape-key", "outside-press"]);
    });

    it("dismisses on an uncancelled owning backdrop press", async () => {
      const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Outside press</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      await settle();
      const backdrop = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
      if (!backdrop) throw new Error("Missing dialog backdrop");
      await user.click(backdrop);
      await settle();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("retains primitive hidden/closed state when a portal is kept mounted", async () => {
      const {rerender} = render(
        <Dialog open>
          <DialogPortal keepMounted>
            <DialogOverlay />
            <BaseDialog.Popup>
              <DialogTitle>Mounted dialog</DialogTitle>
              <DialogClose>Close mounted</DialogClose>
            </BaseDialog.Popup>
          </DialogPortal>
        </Dialog>,
      );
      const close = screen.getByRole("button", {name: "Close mounted"});
      rerender(
        <Dialog open={false}>
          <DialogPortal keepMounted>
            <DialogOverlay />
            <BaseDialog.Popup>
              <DialogTitle>Mounted dialog</DialogTitle>
              <DialogClose>Close mounted</DialogClose>
            </BaseDialog.Popup>
          </DialogPortal>
        </Dialog>,
      );
      await settle();
      expect(close).toBeInTheDocument();
      expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveAttribute("data-closed");
      expect(close.closest('[role="dialog"]')).toHaveAttribute("hidden");
    });

    it("closes the topmost nested modal on Escape and leaves the parent open", async () => {
      const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Parent modal</DialogTitle>
            <DialogDescription>Parent description</DialogDescription>
            <Dialog>
              <DialogTrigger>Open nested</DialogTrigger>
              <DialogContent>
                <DialogTitle>Nested modal</DialogTitle>
                <DialogDescription>Nested description</DialogDescription>
              </DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>,
      );
      await settle();
      const nestedTrigger = screen.getByRole("button", {name: "Open nested"});
      await user.click(nestedTrigger);
      await settle();
      const parent = screen.getByText("Parent modal").closest('[data-slot="dialog-content"]');
      expect(parent).toHaveAttribute("data-nested-dialog-open");
      expect(parent).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByRole("dialog", {name: "Nested modal"})).toHaveAttribute("data-nested");
      await user.keyboard("{Escape}");
      await settle();
      expect(screen.queryByRole("dialog", {name: "Nested modal"})).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", {name: "Parent modal"})).toBeVisible();
      expect(parent).not.toHaveAttribute("data-nested-dialog-open");
      expect(nestedTrigger).toHaveFocus();
    });

    it("honors explicit initial and final focus callbacks", async () => {
      const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
      render(
        <>
          <Button id='return-target'>Return here</Button>
          <Dialog defaultOpen>
            <DialogContent
              initialFocus={() => document.getElementById("entry-target")}
              finalFocus={() => document.getElementById("return-target")}>
              <DialogTitle>Explicit focus</DialogTitle>
              <input
                id='entry-target'
                aria-label='Entry target'
              />
            </DialogContent>
          </Dialog>
        </>,
      );
      await settle();
      expect(screen.getByRole("textbox", {name: "Entry target"})).toHaveFocus();
      await user.click(screen.getByRole("button", {name: "Close"}));
      await settle();
      expect(screen.getByRole("button", {name: "Return here"})).toHaveFocus();
    });

    it("exposes close cancellation through the primitive event contract", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Cancel close</DialogTitle>
            <DialogClose onClick={(event) => event.preventBaseUIHandler()}>Stay open</DialogClose>
          </DialogContent>
        </Dialog>,
      );
      await settle();
      fireEvent.click(screen.getByRole("button", {name: "Stay open"}));
      expect(screen.getByRole("dialog", {name: "Cancel close"})).toBeVisible();
    });
  });
});
