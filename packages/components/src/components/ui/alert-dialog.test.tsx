import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, beforeEach, describe, expect, it, vi as vitest} from "vitest";
import * as AlertDialogModule from "./alert-dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import {Button} from "./button";
import styles from "./alert-dialog.module.css";
import * as stories from "./alert-dialog.stories";

const {FocusContract: FocusContractStory, CustomTrigger: CustomTriggerStory} = composeStories(stories);

function requiredStyle(name: string): string {
  const className = styles[name];
  if (!className) throw new Error(`Missing alert dialog CSS class: ${name}`);
  return className;
}

function renderAlertDialog({
  className,
  defaultOpen = false,
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  triggerAsChild?: boolean;
}>) {
  return render(
    <AlertDialog defaultOpen={defaultOpen}>
      <AlertDialogTrigger asChild={triggerAsChild}>
        {triggerAsChild ? <button type='button'>Open alert dialog</button> : "Open alert dialog"}
      </AlertDialogTrigger>
      <AlertDialogContent
        className={className}
        data-testid='alert-dialog-content'>
        <AlertDialogTitle>Alert title</AlertDialogTitle>
        <AlertDialogDescription>Alert description</AlertDialogDescription>
        <AlertDialogCancel>Close alert dialog</AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>,
  );
}

function AsyncConfirmation({work}: Readonly<{work: Promise<void>}>): React.ReactElement {
  const [open, setOpen] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  async function confirm(): Promise<void> {
    setPending(true);
    setError("");
    try {
      await work;
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setPending(false);
    }
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogTitle>Async confirmation</AlertDialogTitle>
        <AlertDialogDescription>Owner closes only on success</AlertDialogDescription>
        {error && <p role='alert'>{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={confirm}>
            {pending ? "Working" : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("customizes the CustomTrigger story's trigger instead of its confirmation action", async () => {
    const user = userEvent.setup();
    render(<CustomTriggerStory />);
    const trigger = screen.getByRole("button", {name: "Review confirmation"});
    expect(trigger).toHaveAttribute("data-variant", "secondary");
    await user.click(trigger);
    expect(screen.getByRole("button", {name: "Confirm"})).toHaveAttribute("data-variant", "default");
  });

  it("renders the actual FocusContract story and exercises its owner-controlled rejected/successful work", async () => {
    const user = userEvent.setup();
    render(<FocusContractStory />);
    await user.click(screen.getByRole("button", {name: "Controlled async confirmation"}));
    await user.click(screen.getByRole("button", {name: "Start work"}));
    expect(screen.getByRole("status")).toHaveTextContent("Work is pending");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog", {name: "Wait for work to finish"})).toBeVisible();
    await user.click(screen.getByRole("button", {name: "Simulate rejection"}));
    expect(screen.getByRole("alert")).toHaveTextContent("Work rejected; try again.");
    expect(screen.getByRole("alertdialog")).toBeVisible();
    await user.click(screen.getByRole("button", {name: "Start work"}));
    await user.click(screen.getByRole("button", {name: "Simulate success"}));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
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
      <AlertDialog>
        <AlertDialogTrigger
          ref={ref}
          asChild>
          <Button>Composed trigger</Button>
        </AlertDialogTrigger>
      </AlertDialog>,
    );
    expect(screen.getByRole("button", {name: "Composed trigger"}).querySelector("button")).toBeNull();
    expect(events).toEqual(["BUTTON"]);
    unmount();
    expect(events).toEqual(["BUTTON", "cleanup"]);
  });

  it("preserves canonical non-native action rendering and does not dismiss on navigation", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Navigation confirmation</AlertDialogTitle>
          <AlertDialogAction
            ref={ref}
            nativeButton={false}
            render={(props) => (
              <a
                {...props}
                href='#details'
              />
            )}>
            View details
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const action = screen.getByRole("button", {name: "View details"});
    expect(ref.current).toBe(action);
    expect(action).toHaveAttribute("href", "#details");
    expect(action).not.toHaveAttribute("type");
    await user.click(action);
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it("rejects invalid trigger slot input without faking a Root", () => {
    expect(() =>
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>Invalid trigger</AlertDialogTrigger>
        </AlertDialog>,
      ),
    ).toThrow(TypeError);
  });

  it("keeps pending confirmation open and lets its controlled owner close explicitly on success", async () => {
    const request = Promise.withResolvers<void>();
    const user = userEvent.setup();
    render(<AsyncConfirmation work={request.promise} />);
    await user.click(screen.getByRole("button", {name: "Confirm"}));
    expect(screen.getByRole("alertdialog", {name: "Async confirmation"})).toBeVisible();
    expect(screen.getByRole("button", {name: "Working"})).toBeDisabled();
    await act(async () => {
      request.resolve();
      await request.promise;
    });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("keeps rejected confirmation open and exposes the owner's error instead of reporting success", async () => {
    const request = Promise.withResolvers<void>();
    const user = userEvent.setup();
    render(<AsyncConfirmation work={request.promise} />);
    await user.click(screen.getByRole("button", {name: "Confirm"}));
    await act(async () => {
      request.reject(new Error("Work failed"));
    });
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Work failed");
    expect(screen.getByRole("button", {name: "Confirm"})).toBeEnabled();
  });

  it("lets the owner close explicitly through the primitive actions ref", async () => {
    const actions = React.createRef<AlertDialog.Actions>();
    render(
      <AlertDialog
        defaultOpen
        actionsRef={actions}>
        <AlertDialogContent>
          <AlertDialogTitle>Imperative success</AlertDialogTitle>
          <AlertDialogAction>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    act(() => actions.current?.close());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("preserves ordinary Button form semantics instead of forcing close or submit", async () => {
    const user = userEvent.setup();
    const submissions: string[] = [];
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Form confirmation</AlertDialogTitle>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submissions.push("submitted");
            }}>
            <AlertDialogAction>Ordinary action</AlertDialogAction>
            <AlertDialogAction type='submit'>Submit action</AlertDialogAction>
          </form>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByRole("button", {name: "Ordinary action"})).toHaveAttribute("type", "button");
    await user.click(screen.getByRole("button", {name: "Ordinary action"}));
    expect(submissions).toEqual([]);
    await user.click(screen.getByRole("button", {name: "Submit action"}));
    expect(submissions).toEqual(["submitted"]);
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it.each(["default", "sm"] as const)("renders %s media, layout children and forwarded refs", (size) => {
    const mediaRef = React.createRef<HTMLElement>();
    const headerRef = React.createRef<HTMLElement>();
    const footerRef = React.createRef<HTMLElement>();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent size={size}>
          <AlertDialogHeader
            ref={headerRef}
            render={(props) => <header {...props} />}>
            <AlertDialogMedia
              ref={mediaRef}
              className='custom-media'
              render={(props) => <figure {...props} />}>
              <svg
                aria-hidden='true'
                viewBox='0 0 24 24'>
                <path d='M12 2v20' />
              </svg>
            </AlertDialogMedia>
            <AlertDialogTitle>Media confirmation</AlertDialogTitle>
            <AlertDialogDescription>Media description</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            ref={footerRef}
            render={(props) => <footer {...props} />}>
            <AlertDialogCancel
              size='sm'
              variant='secondary'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              size='sm'
              variant='destructive'>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByRole("alertdialog", {name: "Media confirmation"})).toHaveAttribute("data-size", size);
    expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription("Media description");
    expect(mediaRef.current?.tagName).toBe("FIGURE");
    expect(mediaRef.current).toHaveClass(requiredStyle("media"), "custom-media");
    expect(headerRef.current?.tagName).toBe("HEADER");
    expect(footerRef.current?.tagName).toBe("FOOTER");
    expect(
      within(footerRef.current ?? document.body)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Cancel", "Confirm"]);
    expect(screen.getByRole("button", {name: "Cancel"})).toHaveAttribute("data-size", "sm");
    expect(screen.getByRole("button", {name: "Cancel"})).toHaveAttribute("data-variant", "secondary");
  });

  it("forwards actual trigger, popup, backdrop, title, description, action and cancel render states and refs", async () => {
    const user = userEvent.setup();
    const triggerRef = React.createRef<HTMLElement>();
    const popupRef = React.createRef<HTMLDivElement>();
    const backdropRef = React.createRef<HTMLDivElement>();
    const titleRef = React.createRef<HTMLHeadingElement>();
    const descriptionRef = React.createRef<HTMLParagraphElement>();
    const actionRef = React.createRef<HTMLElement>();
    const cancelRef = React.createRef<HTMLButtonElement>();
    render(
      <AlertDialog>
        <AlertDialogTrigger
          ref={triggerRef}
          render={(props, state) => (
            <button
              {...props}
              data-state={String(state.open)}
            />
          )}>
          Open state
        </AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogOverlay
            ref={backdropRef}
            render={(props, state) => (
              <div
                {...props}
                data-testid='alert-backdrop'
                data-state={String(state.open)}
              />
            )}
          />
        </AlertDialogPortal>
        <AlertDialogContent
          ref={popupRef}
          render={(props, state) => (
            <section
              {...props}
              data-state={String(state.open)}
            />
          )}>
          <AlertDialogTitle
            ref={titleRef}
            render={(props) => <h3 {...props} />}>
            State confirmation
          </AlertDialogTitle>
          <AlertDialogDescription
            ref={descriptionRef}
            render={(props) => <p {...props} />}>
            Real state description
          </AlertDialogDescription>
          <AlertDialogAction
            ref={actionRef}
            disabled
            size='xs'
            render={(props, state) => (
              <button
                {...props}
                data-disabled={String(state.disabled)}
                data-action-size={state.size}
              />
            )}>
            Confirm
          </AlertDialogAction>
          <AlertDialogCancel
            ref={cancelRef}
            disabled
            render={(props, state) => (
              <button
                {...props}
                data-disabled={String(state.disabled)}
              />
            )}>
            Cancel
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const trigger = screen.getByRole("button", {name: "Open state"});
    expect(trigger).toHaveAttribute("data-state", "false");
    expect(triggerRef.current).toBe(trigger);
    await user.click(trigger);
    expect(trigger).toHaveAttribute("data-state", "true");
    expect(popupRef.current).toBe(screen.getByRole("alertdialog", {name: "State confirmation"}));
    expect(popupRef.current).toHaveAttribute("data-state", "true");
    expect(backdropRef.current).toHaveAttribute("data-state", "true");
    expect(titleRef.current).toBe(screen.getByRole("heading", {name: "State confirmation"}));
    expect(descriptionRef.current).toBe(screen.getByText("Real state description"));
    expect(actionRef.current).toHaveAttribute("data-disabled", "true");
    expect(actionRef.current).toHaveAttribute("data-action-size", "xs");
    expect(cancelRef.current).toHaveAttribute("data-disabled", "true");
  });

  it("merges legacy trigger refs and preserves native prevention and primitive cancellation", async () => {
    const childRef = React.createRef<HTMLAnchorElement>();
    const triggerRef = React.createRef<HTMLElement>();
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger
          asChild
          ref={triggerRef}
          onClick={(event) => event.preventBaseUIHandler()}>
          <a
            href='#confirm'
            ref={childRef}
            onClick={(event) => event.preventDefault()}>
            Cancelled trigger
          </a>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Cancelled confirmation</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const trigger = screen.getByRole("button", {name: "Cancelled trigger"});
    expect(childRef.current).toBe(trigger);
    expect(triggerRef.current).toBe(trigger);
    expect(trigger).toHaveAttribute("href", "#confirm");
    expect(trigger).not.toHaveAttribute("type");
    await user.click(trigger);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps cancellation separate from confirmation and honors event prevention", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel request</AlertDialogTitle>
          <AlertDialogCancel
            onClick={(event) => event.preventBaseUIHandler()}
            render={<Button variant='outline' />}>
            Stay
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const cancel = screen.getByRole("button", {name: "Stay"});
    expect(cancel.querySelector("button")).toBeNull();
    await user.click(cancel);
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it("surfaces invalid slots and consumer render failures", () => {
    expect(() => render(<AlertDialogHeader asChild>Invalid slot</AlertDialogHeader>)).toThrow(TypeError);
    expect(() =>
      render(
        <AlertDialogFooter asChild>
          <>Invalid fragment</>
        </AlertDialogFooter>,
      ),
    ).toThrow(TypeError);
    expect(() =>
      render(
        <AlertDialogMedia
          render={() => {
            throw new Error("media render failed");
          }}
        />,
      ),
    ).toThrow("media render failed");
  });

  it("exports the media presentation part", () => {
    expect(AlertDialogModule).toHaveProperty("AlertDialogMedia");
  });

  it("marks small content for the compact media and action layout", () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent size='sm'>
          <AlertDialogTitle>Compact confirmation</AlertDialogTitle>
          <AlertDialogDescription>Compact description</AlertDialogDescription>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByRole("alertdialog")).toHaveAttribute("data-size", "sm");
  });

  it("keeps canonical confirmation open until its owner explicitly closes it", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm work</AlertDialogTitle>
          <AlertDialogDescription>Wait for success</AlertDialogDescription>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", {name: "Continue"}));
    expect(screen.getByRole("alertdialog", {name: "Confirm work"})).toBeVisible();
  });

  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderAlertDialog({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {hidden: true, name: "Open alert dialog"})).toBeInTheDocument();
    expect(await screen.findByRole("alertdialog", {name: "Alert title"})).toBeVisible();
  });

  it("opens the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderAlertDialog({defaultOpen: false});

    // Act
    await user.click(screen.getByRole("button", {name: "Open alert dialog"}));

    // Assert
    expect(await screen.findByRole("alertdialog", {name: "Alert title"})).toBeVisible();
  });

  it("closes when the close button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderAlertDialog({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open alert dialog"}));

    // Act
    await user.click(await screen.findByRole("button", {name: "Close alert dialog"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog", {name: "Alert title"})).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderAlertDialog({className: "custom-alert-dialog-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("alert-dialog-content")).toHaveClass("custom-alert-dialog-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderAlertDialog({triggerAsChild: true});

    // Act
    await user.click(screen.getByRole("button", {name: "Open alert dialog"}));

    // Assert
    expect(await screen.findByRole("alertdialog", {name: "Alert title"})).toBeVisible();
  });

  it("exposes alert dialog accessibility semantics", async () => {
    // Arrange
    renderAlertDialog({defaultOpen: true});

    // Assert
    const alertDialog = await screen.findByRole("alertdialog", {name: "Alert title"});
    const trigger = screen.getByRole("button", {hidden: true, name: "Open alert dialog"});

    expect(alertDialog).toHaveAccessibleDescription("Alert description");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("renders AlertDialogHeader with children", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader data-testid='alert-header'>
            <AlertDialogTitle>Header Title</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const header = await screen.findByTestId("alert-header");
    expect(header).toBeInTheDocument();
    expect(screen.getByText("Header Title")).toBeInTheDocument();
  });

  it("renders AlertDialogFooter with children", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Title</AlertDialogTitle>
          <AlertDialogDescription>Description</AlertDialogDescription>
          <AlertDialogFooter data-testid='alert-footer'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const footer = await screen.findByTestId("alert-footer");
    expect(footer).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Cancel"})).toBeInTheDocument();
  });

  it("renders AlertDialogHeader with asChild prop and valid element", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader
            asChild
            data-testid='alert-header'>
            <header>Custom Header</header>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const header = await screen.findByTestId("alert-header");
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe("HEADER");
    expect(screen.getByText("Custom Header")).toBeInTheDocument();
  });

  it("renders AlertDialogFooter with asChild prop and valid element", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Title</AlertDialogTitle>
          <AlertDialogFooter
            asChild
            data-testid='alert-footer'>
            <footer>Custom Footer</footer>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const footer = await screen.findByTestId("alert-footer");
    expect(footer).toBeInTheDocument();
    expect(footer.tagName).toBe("FOOTER");
    expect(screen.getByText("Custom Footer")).toBeInTheDocument();
  });

  it("renders AlertDialogOverlay", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const alertDialog = await screen.findByRole("alertdialog", {name: "Title"});
    expect(alertDialog).toBeVisible();
  });

  it("preserves Base UI 1.9's Escape dismissal rather than inventing an alert policy", async () => {
    const user = userEvent.setup();
    renderAlertDialog({defaultOpen: true});
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("renders AlertDialogAction with click handler", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleClick = vitest.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>Are you sure?</AlertDialogDescription>
          <AlertDialogAction onClick={handleClick}>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Act
    const confirmButton = await screen.findByRole("button", {name: "Confirm"});
    await user.click(confirmButton);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders AlertDialogCancel with click handler", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleClick = vitest.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>Are you sure?</AlertDialogDescription>
          <AlertDialogCancel onClick={handleClick}>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Act
    const cancelButton = await screen.findByRole("button", {name: "Cancel"});
    await user.click(cancelButton);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  describe("observable focus and dismissal controller (not native inert proof)", () => {
    beforeEach(() => {
      vitest.useFakeTimers();
      vitest.stubGlobal("jest", {advanceTimersByTime: vitest.advanceTimersByTime});
      const rect = new DOMRect(0, 0, 100, 20);
      const rects: DOMRectList = {
        0: rect,
        length: 1,
        item: (index) => (index === 0 ? rect : null),
        [Symbol.iterator]: () => [rect][Symbol.iterator](),
      };
      vitest.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(rects);
      vitest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    });
    afterEach(() => {
      cleanup();
      vitest.clearAllTimers();
      vitest.useRealTimers();
      vitest.restoreAllMocks();
      vitest.unstubAllGlobals();
    });
    async function settle(): Promise<void> {
      await act(async () => {
        await vitest.advanceTimersByTimeAsync(150);
      });
    }

    it("enters the named confirmation, observes Tab/Shift+Tab and returns focus after Cancel", async () => {
      const user = userEvent.setup({advanceTimers: vitest.advanceTimersByTime});
      const {container} = render(
        <AlertDialog>
          <AlertDialogTrigger>Open focus confirmation</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Confirmation focus</AlertDialogTitle>
            <AlertDialogDescription>Focus controller observations</AlertDialogDescription>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>,
      );
      const trigger = screen.getByRole("button", {name: "Open focus confirmation"});
      await user.click(trigger);
      await settle();
      expect(screen.getByRole("alertdialog", {name: "Confirmation focus"})).toHaveAccessibleDescription("Focus controller observations");
      expect(screen.getByRole("button", {name: "Cancel"})).toHaveFocus();
      expect(container).toHaveAttribute("aria-hidden", "true");
      expect(container).toHaveAttribute("data-base-ui-inert");
      await user.tab();
      expect(screen.getByRole("button", {name: "Confirm"})).toHaveFocus();
      await user.tab({shift: true});
      expect(screen.getByRole("button", {name: "Cancel"})).toHaveFocus();
      await user.click(screen.getByRole("button", {name: "Cancel"}));
      await settle();
      expect(trigger).toHaveFocus();
      expect(container).not.toHaveAttribute("aria-hidden");
    });

    it("ignores backdrop presses but emits cancellable Escape requests", async () => {
      const reasons: string[] = [];
      const user = userEvent.setup({advanceTimers: vitest.advanceTimersByTime});
      render(
        <AlertDialog
          defaultOpen
          onOpenChange={(open, details) => {
            if (!open) {
              reasons.push(details.reason);
              details.cancel();
            }
          }}>
          <AlertDialogContent>
            <AlertDialogTitle>Explicit owner policy</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>,
      );
      await settle();
      const backdrop = document.querySelector<HTMLElement>('[data-slot="alert-dialog-overlay"]');
      if (!backdrop) throw new Error("Missing alert backdrop");
      await user.click(backdrop);
      expect(reasons).toEqual([]);
      await user.keyboard("{Escape}");
      expect(reasons).toEqual(["escape-key"]);
      expect(screen.getByRole("alertdialog")).toBeVisible();
      fireEvent.click(screen.getByRole("button", {name: "Cancel"}));
      expect(reasons).toEqual(["escape-key", "close-press"]);
      expect(screen.getByRole("alertdialog")).toBeVisible();
    });
  });
});
