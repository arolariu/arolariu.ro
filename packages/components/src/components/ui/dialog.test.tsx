import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
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
      <DialogTrigger asChild={triggerAsChild}>{triggerAsChild ? <button type='button'>Open dialog</button> : "Open dialog"}</DialogTrigger>
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
          asChild>
          <Button>Composed trigger</Button>
        </DialogTrigger>
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

  it("rejects invalid trigger slot input without faking a Root", () => {
    expect(() =>
      render(
        <Dialog>
          <DialogTrigger asChild>Invalid trigger</DialogTrigger>
        </Dialog>,
      ),
    ).toThrow(TypeError);
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

  it("merges child and wrapper refs, click handlers and native link behavior for asChild", async () => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const calls: string[] = [];
    render(
      <Dialog>
        <DialogTrigger
          asChild
          ref={wrapperRef}
          onClick={() => calls.push("wrapper")}>
          <a
            href='#legacy-dialog'
            ref={childRef}
            onClick={() => calls.push("child")}>
            Legacy link
          </a>
        </DialogTrigger>
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
            asChild
            showCloseButton>
            <footer data-testid='footer'>
              <Button>Save</Button>
            </footer>
          </DialogFooter>
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

  it("surfaces invalid slot input and consumer render errors", () => {
    expect(() => render(<DialogHeader asChild>Not an element</DialogHeader>)).toThrow(TypeError);
    expect(() =>
      render(
        <DialogFooter asChild>
          <>Fragment</>
        </DialogFooter>,
      ),
    ).toThrow(TypeError);
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
          <DialogHeader asChild>
            <header data-testid='dialog-header'>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogDescription>Dialog description</DialogDescription>
            </header>
          </DialogHeader>
          <DialogFooter asChild>
            <footer data-testid='dialog-footer'>
              <DialogClose>Close dialog</DialogClose>
            </footer>
          </DialogFooter>
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
