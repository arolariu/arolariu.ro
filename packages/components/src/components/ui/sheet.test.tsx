import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {Button} from "./button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import styles from "./sheet.module.css";
import * as stories from "./sheet.stories";

const {FocusContract: FocusContractStory} = composeStories(stories);

function requiredStyle(name: string): string {
  const className = styles[name];
  if (!className) throw new Error(`Missing sheet CSS class: ${name}`);
  return className;
}

function renderSheet({
  className,
  defaultOpen = false,
  side = "right",
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  triggerAsChild?: boolean;
}>) {
  return render(
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger asChild={triggerAsChild}>{triggerAsChild ? <button type='button'>Open sheet</button> : "Open sheet"}</SheetTrigger>
      <SheetContent
        className={className}
        side={side}
        data-testid='sheet-content'>
        <SheetTitle>Sheet title</SheetTitle>
        <SheetDescription>Sheet description</SheetDescription>
      </SheetContent>
    </Sheet>,
  );
}

describe("Sheet", () => {
  it("renders the actual four-edge FocusContract story with a real sheet", async () => {
    const user = userEvent.setup();
    render(<FocusContractStory />);
    expect(screen.getByRole("button", {name: "Open from top"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Open from bottom"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Open from left"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Open from right"}));
    expect(screen.getByRole("dialog", {name: "Edit preferences"})).toHaveAttribute("data-side", "right");
    await user.click(screen.getByRole("button", {name: "Done"}));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
      <Sheet>
        <SheetTrigger
          ref={ref}
          asChild>
          <Button>Composed trigger</Button>
        </SheetTrigger>
      </Sheet>,
    );
    expect(screen.getByRole("button", {name: "Composed trigger"}).querySelector("button")).toBeNull();
    expect(events).toEqual(["BUTTON"]);
    unmount();
    expect(events).toEqual(["BUTTON", "cleanup"]);
  });

  it("rejects invalid trigger slot input without faking a Root", () => {
    expect(() =>
      render(
        <Sheet>
          <SheetTrigger asChild>Invalid trigger</SheetTrigger>
        </Sheet>,
      ),
    ).toThrow(TypeError);
  });

  it("keeps embedded render-element children alongside the automatic close", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent
          render={
            <section>
              <SheetTitle>Embedded sheet</SheetTitle>
              <SheetDescription>Embedded preferences</SheetDescription>
            </section>
          }
        />
      </Sheet>,
    );
    expect(screen.getByRole("dialog", {name: "Embedded sheet"})).toHaveAccessibleDescription("Embedded preferences");
    expect(screen.getByRole("button", {name: "Close"})).toBeInTheDocument();
  });

  it.each(["top", "right", "bottom", "left"] as const)("places the close after the content for the %s edge", (side) => {
    render(
      <Sheet defaultOpen>
        <SheetContent side={side}>
          <SheetTitle>Directional sheet</SheetTitle>
          <SheetDescription>Directional preferences</SheetDescription>
          <SheetFooter>
            <Button>Save</Button>
            <SheetClose>Cancel</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog", {name: "Directional sheet"});
    expect(sheet).toHaveAttribute("data-side", side);
    expect(sheet).toHaveClass(requiredStyle(side));
    expect(screen.getAllByRole("button").map((button) => button.textContent || button.getAttribute("aria-label"))).toEqual([
      "Save",
      "Cancel",
      "Close",
    ]);
    expect(screen.getByRole("button", {name: "Cancel"})).not.toHaveClass(requiredStyle("close"));
  });

  it("forwards primitive trigger, popup, backdrop, close, title and description callback state and refs", async () => {
    const user = userEvent.setup();
    const triggerRef = React.createRef<HTMLElement>();
    const popupRef = React.createRef<HTMLDivElement>();
    const backdropRef = React.createRef<HTMLDivElement>();
    const closeRef = React.createRef<HTMLButtonElement>();
    const titleRef = React.createRef<HTMLHeadingElement>();
    const descriptionRef = React.createRef<HTMLParagraphElement>();
    render(
      <Sheet>
        <SheetTrigger
          ref={triggerRef}
          render={(props, state) => (
            <button
              {...props}
              data-state={String(state.open)}
            />
          )}>
          Open state
        </SheetTrigger>
        <SheetPortal>
          <SheetOverlay
            ref={backdropRef}
            render={(props, state) => (
              <div
                {...props}
                data-testid='sheet-backdrop'
                data-state={String(state.open)}
              />
            )}
          />
        </SheetPortal>
        <SheetContent
          ref={popupRef}
          showCloseButton={false}
          render={(props, state) => (
            <section
              {...props}
              data-state={String(state.open)}
            />
          )}>
          <SheetHeader render={(props) => <header {...props} />}>
            <SheetTitle
              ref={titleRef}
              render={(props) => <h3 {...props} />}>
              Composed sheet
            </SheetTitle>
            <SheetDescription
              ref={descriptionRef}
              render={(props) => <p {...props} />}>
              Composed preferences
            </SheetDescription>
          </SheetHeader>
          <SheetFooter render={(props) => <footer {...props} />}>
            <SheetClose
              ref={closeRef}
              disabled
              render={(props, state) => (
                <button
                  {...props}
                  data-disabled={String(state.disabled)}
                />
              )}>
              Cancel
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    const trigger = screen.getByRole("button", {name: "Open state"});
    expect(triggerRef.current).toBe(trigger);
    expect(trigger).toHaveAttribute("data-state", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("data-state", "true");
    expect(popupRef.current).toBe(screen.getByRole("dialog", {name: "Composed sheet"}));
    expect(popupRef.current).toHaveAttribute("data-state", "true");
    expect(popupRef.current).toHaveAccessibleDescription("Composed preferences");
    expect(backdropRef.current).toHaveAttribute("data-state", "true");
    expect(closeRef.current).toHaveAttribute("data-disabled", "true");
    expect(titleRef.current).toBe(screen.getByRole("heading", {name: "Composed sheet"}));
    expect(descriptionRef.current).toBe(screen.getByText("Composed preferences"));
    await user.click(screen.getByRole("button", {name: "Cancel"}));
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("preserves composed child content, native link behavior and both trigger refs", async () => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLAnchorElement>();
    const triggerRef = React.createRef<HTMLElement>();
    render(
      <Sheet>
        <SheetTrigger
          asChild
          ref={triggerRef}>
          <a
            ref={childRef}
            href='#preferences'>
            Open preferences
          </a>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Linked preferences</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    const trigger = screen.getByRole("button", {name: "Open preferences"});
    expect(trigger).toHaveAttribute("href", "#preferences");
    expect(trigger).not.toHaveAttribute("type");
    expect(childRef.current).toBe(trigger);
    expect(triggerRef.current).toBe(trigger);
    await user.click(trigger);
    expect(screen.getByRole("dialog", {name: "Linked preferences"})).toBeVisible();
  });

  it("preserves polymorphic layout refs and children on anchor and label callbacks", () => {
    const headerRef = React.createRef<HTMLElement>();
    const footerRef = React.createRef<HTMLElement>();
    render(
      <>
        <SheetHeader
          ref={headerRef}
          render={(props) => (
            <label
              {...props}
              htmlFor='preferences'
            />
          )}>
          Preferences label
        </SheetHeader>
        <SheetFooter
          ref={footerRef}
          render={(props) => (
            <a
              {...props}
              href='#help'
            />
          )}>
          Help
        </SheetFooter>
      </>,
    );
    expect(headerRef.current).toBe(screen.getByText("Preferences label"));
    expect(headerRef.current?.tagName).toBe("LABEL");
    expect(footerRef.current).toBe(screen.getByRole("link", {name: "Help"}));
  });

  it("preserves close cancellation while rendering a single real Button", async () => {
    const user = userEvent.setup();
    render(
      <Sheet defaultOpen>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Unsaved preferences</SheetTitle>
          <SheetClose render={<Button onClick={(event) => event.preventBaseUIHandler()} />}>Stay</SheetClose>
        </SheetContent>
      </Sheet>,
    );
    const close = screen.getByRole("button", {name: "Stay"});
    expect(close.querySelector("button")).toBeNull();
    await user.click(close);
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("surfaces invalid slot props and render failures", () => {
    expect(() => render(<SheetHeader asChild>Invalid slot</SheetHeader>)).toThrow(TypeError);
    expect(() =>
      render(
        <SheetFooter asChild>
          <>Invalid fragment</>
        </SheetFooter>,
      ),
    ).toThrow(TypeError);
    expect(() =>
      render(
        <Sheet>
          <SheetTrigger
            render={() => {
              throw new Error("trigger failed");
            }}
          />
        </Sheet>,
      ),
    ).toThrow("trigger failed");
  });

  it("allows Sheet's automatic close button to be disabled", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Preferences</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.queryByRole("button", {name: "Close"})).not.toBeInTheDocument();
  });

  it("places the automatic close after content in every direction", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side='left'>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Preferences</SheetDescription>
          <button type='button'>Save</button>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getAllByRole("button").map((button) => button.textContent || button.getAttribute("aria-label"))).toEqual([
      "Save",
      "Close",
    ]);
  });

  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderSheet({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {hidden: true, name: "Open sheet"})).toBeInTheDocument();
    expect(await screen.findByRole("dialog", {name: "Sheet title"})).toBeVisible();
  });

  it("opens the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderSheet({defaultOpen: false});

    // Act
    await user.click(screen.getByRole("button", {name: "Open sheet"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Sheet title"})).toBeVisible();
  });

  it("closes when the close button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderSheet({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open sheet"}));

    // Act
    await user.click(await screen.findByRole("button", {name: "Close"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Sheet title"})).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderSheet({className: "custom-sheet-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass("custom-sheet-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderSheet({triggerAsChild: true});

    // Act
    await user.click(screen.getByRole("button", {name: "Open sheet"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Sheet title"})).toBeVisible();
  });

  it("closes the sheet when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    renderSheet({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open sheet"}));
    expect(await screen.findByRole("dialog", {name: "Sheet title"})).toBeVisible();

    // Act — Sheet is built on the Dialog primitive; Escape closes it the same way
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Sheet title"})).not.toBeInTheDocument();
    });
  });

  it("applies the requested side positioning class", async () => {
    // Arrange
    renderSheet({defaultOpen: true, side: "left"});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass(requiredStyle("left"));
  });

  it("exposes modal sheet accessibility semantics", async () => {
    // Arrange
    renderSheet({defaultOpen: true});

    // Assert
    const sheet = await screen.findByRole("dialog", {name: "Sheet title"});
    const trigger = screen.getByRole("button", {hidden: true, name: "Open sheet"});

    expect(sheet).toHaveAccessibleDescription("Sheet description");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  describe("SheetHeader", () => {
    it("renders header inside sheet content", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader data-testid='sheet-header'>
              <SheetTitle>Header Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-header")).toBeInTheDocument();
      expect(screen.getByText("Header Title")).toBeInTheDocument();
    });

    it("applies custom className to header", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader
              className='custom-header'
              data-testid='sheet-header'>
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-header")).toHaveClass("custom-header");
    });
  });

  describe("SheetFooter", () => {
    it("renders footer inside sheet content", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter data-testid='sheet-footer'>
              <button type='button'>Cancel</button>
              <button type='button'>Save</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-footer")).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Cancel"})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Save"})).toBeInTheDocument();
    });

    it("applies custom className to footer", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter
              className='custom-footer'
              data-testid='sheet-footer'>
              Footer content
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-footer")).toHaveClass("custom-footer");
    });
  });

  describe("SheetTitle", () => {
    it("renders title inside sheet content", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle data-testid='sheet-title'>Custom Title</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-title")).toHaveTextContent("Custom Title");
    });

    it("applies custom className to title", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle
              className='custom-title'
              data-testid='sheet-title'>
              Title
            </SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-title")).toHaveClass("custom-title");
    });
  });

  describe("SheetDescription", () => {
    it("renders description inside sheet content", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription data-testid='sheet-description'>This is a detailed description</SheetDescription>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-description")).toHaveTextContent("This is a detailed description");
    });

    it("applies custom className to description", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription
              className='custom-description'
              data-testid='sheet-description'>
              Description
            </SheetDescription>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-description")).toHaveClass("custom-description");
    });
  });

  it("renders SheetContent with side='top' positioning", async () => {
    // Arrange
    renderSheet({defaultOpen: true, side: "top"});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass(requiredStyle("top"));
  });

  it("renders SheetContent with side='bottom' positioning", async () => {
    // Arrange
    renderSheet({defaultOpen: true, side: "bottom"});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass(requiredStyle("bottom"));
  });

  it("renders SheetContent with side='right' positioning by default", async () => {
    // Arrange
    renderSheet({defaultOpen: true, side: "right"});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass(requiredStyle("right"));
  });

  it("renders SheetOverlay with custom className", async () => {
    // Arrange
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    // Assert
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeVisible();
  });

  it("renders SheetHeader with asChild prop", async () => {
    // Arrange
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader asChild>
            <header data-testid='custom-header-element'>
              <SheetTitle>Title</SheetTitle>
            </header>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    // Assert
    expect(await screen.findByTestId("custom-header-element")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("renders SheetFooter with asChild prop", async () => {
    // Arrange
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
          <SheetFooter asChild>
            <footer data-testid='custom-footer-element'>
              <button type='button'>Action</button>
            </footer>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    // Assert
    expect(await screen.findByTestId("custom-footer-element")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Action"})).toBeInTheDocument();
  });

  describe("observable focus and dismissal controller (not native inert proof)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
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

    it("enters the named sheet before its close, observes Tab/Shift+Tab and restores trigger focus", async () => {
      const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
      const {container} = render(
        <Sheet>
          <SheetTrigger>Open focus sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Preferences focus</SheetTitle>
            <SheetDescription>Controller observations</SheetDescription>
            <input aria-label='Preference' />
            <Button>Save</Button>
          </SheetContent>
        </Sheet>,
      );
      const trigger = screen.getByRole("button", {name: "Open focus sheet"});
      await user.click(trigger);
      await settle();
      expect(screen.getByRole("dialog", {name: "Preferences focus"})).toHaveAccessibleDescription("Controller observations");
      expect(screen.getByRole("textbox", {name: "Preference"})).toHaveFocus();
      expect(container).toHaveAttribute("aria-hidden", "true");
      expect(container).toHaveAttribute("data-base-ui-inert");
      await user.tab();
      expect(screen.getByRole("button", {name: "Save"})).toHaveFocus();
      await user.tab({shift: true});
      expect(screen.getByRole("textbox", {name: "Preference"})).toHaveFocus();
      await user.click(screen.getByRole("button", {name: "Close"}));
      await settle();
      expect(trigger).toHaveFocus();
      expect(container).not.toHaveAttribute("aria-hidden");
      expect(container).not.toHaveAttribute("data-base-ui-inert");
    });

    it("emits cancellable Escape and outside-press requests then allows explicit close", async () => {
      const reasons: string[] = [];
      const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
      render(
        <Sheet
          defaultOpen
          onOpenChange={(open, details) => {
            if (!open) {
              reasons.push(details.reason);
              if (details.reason !== "close-press") details.cancel();
            }
          }}>
          <SheetContent>
            <SheetTitle>Pending preferences</SheetTitle>
          </SheetContent>
        </Sheet>,
      );
      await settle();
      await user.keyboard("{Escape}");
      const backdrop = document.querySelector<HTMLElement>('[data-slot="sheet-overlay"]');
      if (!backdrop) throw new Error("Missing sheet backdrop");
      await user.click(backdrop);
      await settle();
      expect(screen.getByRole("dialog")).toBeVisible();
      expect(reasons).toEqual(["escape-key", "outside-press"]);
      await user.click(screen.getByRole("button", {name: "Close"}));
      await settle();
      expect(reasons).toEqual(["escape-key", "outside-press", "close-press"]);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
