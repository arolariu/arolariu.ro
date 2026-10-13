import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {Features, transform, transformStyleAttribute} from "lightningcss";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, describe, expect, it, vi} from "vitest";

import {legacyToast as toast, LegacyToaster as Toaster} from "./legacy-toast";
import {toast as canonicalToast, Toaster as CanonicalToaster, createToastManager} from "./toast";
import * as LegacyToastStories from "./legacy-toast.stories";
import buttonStyles from "./button.module.css";
import canonicalStyles from "./toast.module.css";
import legacyStyles from "./legacy-toast.module.css";

interface OutlineWinner {
  readonly value: unknown;
  readonly specificity: number;
  readonly important: boolean;
}

function focusedOutline(element: HTMLElement, forcedColors: boolean): Map<string, OutlineWinner> {
  const winners = new Map<string, OutlineWinner>();
  for (const [name, classes] of [
    ["button", buttonStyles],
    ["toast", canonicalStyles],
    ["legacy-toast", legacyStyles],
  ] as const) {
    const filename = join(dirname(fileURLToPath(import.meta.url)), `${name}.module.css`);
    const compiled = transform({
      filename,
      code: readFileSync(filename),
      include: Features.Nesting,
      cssModules: true,
      pseudoClasses: {focusVisible: "keyboard-focus", focus: "programmatic-focus", hover: "pointer-hover", active: "pointer-active"},
    });
    const exports = compiled.exports ?? {};
    const names = new Map(Object.entries(exports).map(([key, value]) => [value.name, key]));
    postcss.parse(compiled.code.toString()).walkRules((rule) => {
      let parent = rule.parent;
      while (parent && parent.type !== "root") {
        if (parent.type === "atrule" && parent.name === "media") {
          if (parent.params.includes("forced-colors") ? !forcedColors : true) {
            return;
          }
        }
        parent = parent.parent;
      }
      const selectors = selectorParser().astSync(rule.selector);
      for (const selector of selectors.nodes) {
        let specificity = 0;
        selector.walk((node) => {
          if (node.type === "id") {
            specificity += 10000;
          }
          if (node.type === "class" || node.type === "attribute" || node.type === "pseudo") {
            specificity += 100;
          }
          if (node.type === "tag") {
            specificity += 1;
          }
          if (node.type === "class") {
            const original = names.get(node.value);
            if (original === "keyboard-focus") {
              node.value = "keyboard-focus";
            } else if (original === "programmatic-focus") {
              node.value = "programmatic-focus";
            } else if (original) {
              node.value = classes[original] ?? node.value;
            }
          }
        });
        if (!element.matches(selector.toString())) {
          continue;
        }
        for (const declaration of rule.nodes) {
          if (declaration.type !== "decl" || !declaration.prop.startsWith("outline")) {
            continue;
          }
          const apply = (property: string, value: unknown): void => {
            const previous = winners.get(property);
            const important = Boolean(declaration.important);
            if (
              !previous
              || (important && !previous.important)
              || (important === previous.important && specificity >= previous.specificity)
            ) {
              winners.set(property, {value, specificity, important});
            }
          };
          transformStyleAttribute({
            code: Buffer.from(`${declaration.prop}: ${declaration.value.replaceAll("var(--ac-ring)", "#123456")};`),
            visitor: {
              Declaration(parsed) {
                if (parsed.property === "outline") {
                  apply("outline-width", parsed.value.width);
                  apply("outline-style", parsed.value.style);
                  apply("outline-color", parsed.value.color);
                } else if (parsed.property.startsWith("outline-") && "value" in parsed) {
                  apply(parsed.property, parsed.value);
                }
              },
            },
          });
        }
      }
    });
  }
  return winners;
}

describe("legacyToast compatibility", () => {
  afterEach(() => {
    act(() => {
      toast.dismiss();
    });
    vi.useRealTimers();
  });

  it("renders the toaster viewport without crashing", () => {
    // Arrange
    render(<Toaster />);

    // Assert
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });

  it("renders toast content when toast() is called imperatively", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Profile updated", {
        description: "Your changes were saved.",
      });
    });

    // Assert
    expect(await screen.findByText("Profile updated")).toBeInTheDocument();
    expect(screen.getByText("Your changes were saved.")).toBeInTheDocument();
  });

  it("merges the toaster className", () => {
    // Arrange
    render(<Toaster className='custom-toaster' />);

    // Assert
    expect(screen.getByLabelText("Notifications")).toHaveClass("custom-toaster");
  });

  it("renders custom toast content", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.custom(() => <div>Custom toast content</div>);
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Custom toast content")).toBeInTheDocument();
    });
  });

  it("updates an existing toast in place", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    let toastId = "";
    act(() => {
      toastId = toast.loading("Uploading avatar", {
        description: "Please wait.",
      });
    });

    expect(await screen.findByText("Uploading avatar")).toBeInTheDocument();

    act(() => {
      toast.update(toastId, {
        description: "Avatar uploaded successfully.",
        message: "Upload complete",
        variant: "success",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Upload complete")).toBeInTheDocument();
      expect(screen.getByText("Avatar uploaded successfully.")).toBeInTheDocument();
      expect(screen.queryByText("Uploading avatar")).not.toBeInTheDocument();
    });
  });

  it("updates promise toasts in place instead of creating a new toast", async () => {
    // Arrange
    let resolvePromise: ((value: string) => void) | undefined;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });

    render(<Toaster />);

    // Act
    act(() => {
      void toast.promise(promise, {
        loading: "Saving profile",
        success: "Profile saved",
      });
    });

    expect(await screen.findByText("Saving profile")).toBeInTheDocument();

    await act(async () => {
      resolvePromise?.("done");
      await promise;
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Profile saved")).toBeInTheDocument();
      expect(screen.queryByText("Saving profile")).not.toBeInTheDocument();
      expect(toast.getToasts()).toHaveLength(1);
      expect(toast.getToasts()[0]?.variant).toBe("success");
    });
  });

  it("renders success toast with correct variant", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.success("Operation successful", {
        description: "Your action completed successfully.",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Operation successful")).toBeInTheDocument();
      expect(screen.getByText("Your action completed successfully.")).toBeInTheDocument();
      expect(toast.getToasts()[0]?.variant).toBe("success");
    });
  });

  it("normalizes explicit toast ids to strings", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Explicit id toast", {id: 123});
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Explicit id toast")).toBeInTheDocument();
      expect(toast.getToasts()[0]?.id).toBe("123");
    });
  });

  it("falls back to sequence ids when crypto.randomUUID is unavailable", async () => {
    // Arrange
    render(<Toaster />);
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        ...originalCrypto,
        randomUUID: undefined,
      },
    });

    try {
      // Act
      act(() => {
        toast("Sequence id toast");
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Sequence id toast")).toBeInTheDocument();
        expect(toast.getToasts()[0]?.id.startsWith("toast-")).toBe(true);
      });
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it("renders error toast with correct variant", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.error("Operation failed", {
        description: "Something went wrong.",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Operation failed")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
      expect(toast.getToasts()[0]?.variant).toBe("error");
    });
  });

  it("renders warning toast with correct variant", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.warning("Warning message", {
        description: "Please be careful.",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Warning message")).toBeInTheDocument();
      expect(screen.getByText("Please be careful.")).toBeInTheDocument();
      expect(toast.getToasts()[0]?.variant).toBe("warning");
    });
  });

  it("renders info toast with correct variant", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.info("Information", {
        description: "Here is some useful info.",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Information")).toBeInTheDocument();
      expect(screen.getByText("Here is some useful info.")).toBeInTheDocument();
      expect(toast.getToasts()[0]?.variant).toBe("info");
    });
  });

  it("renders toast with action button", async () => {
    // Arrange
    const mockAction = {
      label: "Undo",
      onClick: () => {
        /* noop */
      },
    };
    render(<Toaster />);

    // Act
    act(() => {
      toast("Item deleted", {
        description: "Your item was removed.",
        action: mockAction,
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Item deleted")).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Undo"})).toBeInTheDocument();
    });
  });

  it("renders Toaster with all supported positions", () => {
    // Arrange
    const positions = ["top-left", "top-right", "top-center", "bottom-left", "bottom-right", "bottom-center"] as const;

    // Act / Assert
    for (const position of positions) {
      const {unmount} = render(<Toaster position={position} />);
      expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
      unmount();
    }
  });

  it("renders toast without description when only message is provided", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Simple message");
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Simple message")).toBeInTheDocument();
    });
  });

  it("renders toast with cancel button", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Item deleted", {
        cancel: {
          label: "Cancel",
          onClick: () => {
            /* noop */
          },
        },
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Item deleted")).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Cancel"})).toBeInTheDocument();
    });
  });

  it("renders Toaster with different theme props", () => {
    // Arrange & Act
    const {unmount} = render(<Toaster duration={10_000} />);
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    unmount();
  });

  it("renders toast with custom duration", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Custom duration", {
        duration: 10_000,
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Custom duration")).toBeInTheDocument();
    });
  });

  it("renders Toaster with custom visibleToasts limit", () => {
    // Arrange
    const {unmount} = render(<Toaster visibleToasts={5} />);
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    unmount();
  });

  it("renders Toaster with closeButton={false}", () => {
    // Arrange
    const {unmount} = render(<Toaster closeButton={false} />);
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    unmount();
  });

  it("renders Toaster with custom containerAriaLabel", () => {
    // Arrange
    render(<Toaster containerAriaLabel='Custom Notifications' />);

    // Assert
    expect(screen.getByLabelText("Custom Notifications")).toBeInTheDocument();
  });

  it("renders loading toast with correct variant", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.loading("Loading operation", {
        description: "Please wait...",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Loading operation")).toBeInTheDocument();
      expect(screen.getByText("Please wait...")).toBeInTheDocument();
      expect(toast.getToasts()[0]?.variant).toBe("loading");
    });
  });

  it("dismisses specific toast by id", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    let toastId = "";
    act(() => {
      toastId = toast("First toast");
      toast("Second toast");
    });

    await waitFor(() => {
      expect(screen.getByText("First toast")).toBeInTheDocument();
      expect(screen.getByText("Second toast")).toBeInTheDocument();
    });

    act(() => {
      toast.dismiss(toastId);
    });

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("First toast")).not.toBeInTheDocument();
      expect(screen.getByText("Second toast")).toBeInTheDocument();
    });
  });

  it("dismisses all active toasts when called without an id", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("First toast");
      toast("Second toast");
    });

    await waitFor(() => {
      expect(screen.getByText("First toast")).toBeInTheDocument();
      expect(screen.getByText("Second toast")).toBeInTheDocument();
    });

    act(() => {
      toast.dismiss();
    });

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("First toast")).not.toBeInTheDocument();
      expect(screen.queryByText("Second toast")).not.toBeInTheDocument();
      expect(toast.getToasts()).toHaveLength(0);
    });
  });

  it("returns toast history via getHistory", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Toast 1");
      toast("Toast 2");
    });

    await waitFor(() => {
      expect(screen.getByText("Toast 1")).toBeInTheDocument();
    });

    // Assert
    const history = toast.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Toaster with custom toastOptions", async () => {
    // Arrange
    render(
      <Toaster
        toastOptions={{
          className: "custom-toast-class",
        }}
      />,
    );

    // Act
    act(() => {
      toast("Toast with options");
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Toast with options")).toBeInTheDocument();
    });
  });

  it("supports function-based titles and descriptions", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast(() => "Factory title", {
        description: () => "Factory description",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Factory title")).toBeInTheDocument();
      expect(screen.getByText("Factory description")).toBeInTheDocument();
    });
  });

  it("omits the close button when disabled via toaster defaults", async () => {
    // Arrange
    render(<Toaster closeButton={false} />);

    // Act
    act(() => {
      toast("No close button toast");
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("No close button toast")).toBeInTheDocument();
      expect(screen.queryByLabelText("Close notification")).not.toBeInTheDocument();
    });
  });

  it("renders toast with custom style", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Styled toast", {
        style: {backgroundColor: "red"},
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Styled toast")).toBeInTheDocument();
    });
  });

  it("renders toast with priority prop", () => {
    // Arrange
    render(<Toaster />);

    // Act - Just verify it doesn't throw
    act(() => {
      toast("High priority", {
        priority: "high",
      });
    });

    // Assert - Basic check that toast was created
    expect(toast.getToasts().length).toBeGreaterThan(0);
  });

  it("renders toast with closeButton and custom closeButtonAriaLabel", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Closeable toast", {
        closeButton: true,
        closeButtonAriaLabel: "Custom close",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Closeable toast")).toBeInTheDocument();
      expect(screen.getByLabelText("Custom close")).toBeInTheDocument();
    });
  });

  it("handles toast.message as alias for toast", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.message("Message toast");
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Message toast")).toBeInTheDocument();
    });
  });

  it("renders toast with cancel as ReactNode", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Toast with node cancel", {
        cancel: <button type='button'>Custom Cancel</button>,
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Toast with node cancel")).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Custom Cancel"})).toBeInTheDocument();
    });
  });

  it("shows a resolved promise toast even without a loading state", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    const promise = toast.promise(Promise.resolve("profile"), {
      success: (value) => ({message: `Saved ${value}`}),
    });

    await act(async () => {
      await promise;
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Saved profile")).toBeInTheDocument();
      expect(toast.getToasts()[0]?.variant).toBe("success");
    });
  });

  it("updates rejected promise toasts and runs finally callbacks", async () => {
    // Arrange
    let rejectPromise: ((reason?: unknown) => void) | undefined;
    const promise = new Promise<string>((_resolve, reject) => {
      rejectPromise = reject;
    });
    const handleFinally = vi.fn();
    render(<Toaster />);

    let pendingToast: Promise<string> | undefined;
    act(() => {
      pendingToast = toast.promise(promise, {
        loading: "Saving profile",
        error: () => ({
          description: "Please retry.",
          message: "Profile failed",
        }),
        finally: handleFinally,
      });
    });

    expect(await screen.findByText("Saving profile")).toBeInTheDocument();

    let rejectionMessage = "";

    // Act
    await act(async () => {
      rejectPromise?.(new Error("Boom"));

      try {
        await pendingToast;
      } catch (error) {
        rejectionMessage = error instanceof Error ? error.message : String(error);
      }
    });

    // Assert
    expect(rejectionMessage).toBe("Boom");
    await waitFor(() => {
      expect(screen.getByText("Profile failed")).toBeInTheDocument();
      expect(screen.getByText("Please retry.")).toBeInTheDocument();
      expect(toast.getToasts()[0]?.variant).toBe("error");
      expect(handleFinally).toHaveBeenCalledOnce();
    });
  });

  it("dismisses toasts after action button clicks", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleAction = vi.fn();
    render(<Toaster />);

    act(() => {
      toast("Undoable toast", {
        action: {
          label: "Undo",
          onClick: handleAction,
        },
      });
    });

    const actionButton = await screen.findByRole("button", {name: "Undo"});

    // Act
    await user.click(actionButton);

    // Assert
    expect(handleAction).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByText("Undoable toast")).not.toBeInTheDocument();
    });
  });

  it("renders toast actions passed as React nodes", async () => {
    // Arrange
    render(<Toaster />);

    act(() => {
      toast("Toast with custom action", {
        action: <button type='button'>Custom Action</button>,
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Toast with custom action")).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Custom Action"})).toBeInTheDocument();
    });
  });

  it("preserves valid non-element action content", async () => {
    // Arrange
    render(<Toaster />);

    act(() => {
      toast("Toast with ignored action", {
        action: "Ignored action",
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Toast with ignored action")).toBeInTheDocument();
      expect(screen.queryByRole("button", {name: "Ignored action"})).not.toBeInTheDocument();
      expect(screen.getByText("Ignored action")).toBeInTheDocument();
    });
  });

  it("rejects orphan updates rather than fabricating history", () => {
    render(<Toaster />);
    const history = toast.getHistory();
    expect(() =>
      toast.update("orphan-toast", {
        message: "Recovered toast",
        variant: "warning",
      }),
    ).toThrow(/unknown|inactive/iu);
    expect(toast.getHistory()).toEqual(history);
    expect(toast.getToasts()).toHaveLength(0);
  });

  it("preserves numeric zero titles, descriptions and promise states", async () => {
    render(<Toaster />);
    await act(async () => {
      await toast.promise(Promise.resolve(0), {id: "zero", loading: 0, success: (value) => value, description: 0});
    });
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "zero", title: 0, description: 0, variant: "success"})]);
  });

  it("does not resurrect dismissed loading toasts when their promise settles", async () => {
    const {promise, resolve} = Promise.withResolvers<string>();
    render(<Toaster />);
    let pending: Promise<string> | undefined;
    act(() => {
      pending = toast.promise(promise, {id: "pending", loading: "Pending", success: "Done"});
    });
    act(() => {
      toast.dismiss("pending");
    });
    await act(async () => {
      resolve("done");
      await pending;
    });
    expect(toast.getToasts()).toHaveLength(0);
    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });

  it("honors action cancellation", async () => {
    render(<Toaster />);
    act(() => {
      toast("Keep open", {action: {label: "Stay", onClick: (event) => event.preventDefault()}});
    });
    await userEvent.setup().click(screen.getByRole("button", {name: "Stay"}));
    expect(screen.getByText("Keep open")).toBeInTheDocument();
  });

  it("does not evaluate factories or custom renderers before React renders them", async () => {
    render(<Toaster />);
    const factory = vi.fn(() => "Lazy title");
    const renderer = vi.fn(() => <div>Lazy custom</div>);
    act(() => {
      toast(factory);
      toast.custom(renderer);
      expect(factory).not.toHaveBeenCalled();
      expect(renderer).not.toHaveBeenCalled();
    });
    expect(await screen.findByText("Lazy title")).toBeInTheDocument();
    expect(screen.getByText("Lazy custom")).toBeInTheDocument();
  });

  it("supports Hook-using lazy factories and custom renderers inside React boundaries", () => {
    render(<Toaster />);
    function HookTitle(): React.ReactNode {
      const [title] = React.useState("Hook title");
      return title;
    }
    function hookRenderer(id: string): React.ReactElement {
      const [text] = React.useState("Hook custom");
      return (
        <button
          type='button'
          onClick={() => toast.dismiss(id)}>
          {text}
        </button>
      );
    }
    act(() => {
      toast(HookTitle);
      toast.custom(hookRenderer);
    });
    expect(screen.getByText("Hook title")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Hook custom"})).toBeInTheDocument();
  });

  it("does not overwrite a replacement toast when an old promise settles", async () => {
    const {promise, resolve} = Promise.withResolvers<string>();
    render(<Toaster />);
    let pending: Promise<string> | undefined;
    act(() => {
      pending = toast.promise(promise, {id: "reuse", loading: "Old pending", success: "Stale"});
    });
    act(() => {
      toast.dismiss("reuse");
      toast("Replacement", {id: "reuse"});
    });
    await act(async () => {
      resolve("value");
      await pending;
    });
    expect(screen.getByText("Replacement")).toBeInTheDocument();
    expect(screen.queryByText("Stale")).not.toBeInTheDocument();
    expect(toast.getToasts()).toEqual([expect.objectContaining({title: "Replacement"})]);
  });

  it("handles synchronous promise factory failures and awaits finally", async () => {
    render(<Toaster />);
    const error = new Error("Factory failure");
    const handleFinally = vi.fn(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await expect(
        toast.promise(
          () => {
            throw error;
          },
          {loading: "Pending", error: "Failed", finally: handleFinally},
        ),
      ).rejects.toBe(error);
    });
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(handleFinally).toHaveBeenCalledOnce();
  });

  it("cleans up pending state when a promise error formatter throws", async () => {
    render(<Toaster />);
    const failure = new Error("Formatter failure");
    await act(async () => {
      await expect(
        toast.promise(Promise.reject(new Error("Source failure")), {
          loading: "Pending",
          error: () => {
            throw failure;
          },
        }),
      ).rejects.toBe(failure);
    });
    expect(toast.getToasts()).toHaveLength(0);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid duration %s without history changes", (duration) => {
    render(<Toaster />);
    const history = toast.getHistory();
    expect(() => toast("Invalid", {duration})).toThrow(/duration/iu);
    expect(toast.getHistory()).toEqual(history);
  });

  it("rejects invalid ids, variants, action descriptors and non-promise inputs at explicit boundaries", async () => {
    render(<Toaster />);
    expect(() => toast("Invalid", {id: ""})).toThrow(/id/iu);
    expect(() => toast("Invalid", {id: Number.NaN})).toThrow(/id/iu);
    expect(() => {
      // @ts-expect-error Deliberately invalid external action descriptor.
      toast("Invalid", {action: {label: "No handler", onClick: "not callable"}});
    }).toThrow(/action/iu);
    let id = "";
    act(() => {
      id = toast("Valid");
    });
    expect(() => {
      // @ts-expect-error Deliberately invalid external variant.
      toast.update(id, {variant: "invalid"});
    }).toThrow(/variant/iu);
    await expect(
      // @ts-expect-error Deliberately invalid external promise factory.
      toast.promise(() => 123),
    ).rejects.toThrow(/promise/iu);
  });

  it("requires a mounted legacy provider and clears active snapshots on unmount", () => {
    expect(() => toast("No provider")).toThrow(/LegacyToaster/iu);
    const {unmount} = render(<Toaster />);
    act(() => {
      toast("Mounted");
    });
    unmount();
    expect(toast.getToasts()).toHaveLength(0);
  });
  it("dismisses loading toasts when a promise resolves without success content", async () => {
    // Arrange
    let resolvePromise: ((value: string) => void) | undefined;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    render(<Toaster />);

    let pendingToast: Promise<string> | undefined;
    act(() => {
      pendingToast = toast.promise(promise, {
        loading: "Loading only",
      });
    });

    expect(await screen.findByText("Loading only")).toBeInTheDocument();

    // Act
    await act(async () => {
      resolvePromise?.("done");
      await pendingToast;
    });

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Loading only")).not.toBeInTheDocument();
      expect(toast.getToasts()).toHaveLength(0);
    });
  });

  it("keeps canonical and legacy manager state independent", () => {
    render(
      <>
        <CanonicalToaster viewportProps={{"aria-label": "Canonical"}} />
        <Toaster containerAriaLabel='Legacy' />
      </>,
    );
    act(() => {
      canonicalToast.add({title: "Canonical only", timeout: 0});
      toast("Legacy only", {duration: 0});
    });
    expect(screen.getByText("Canonical only").closest("[aria-label=Canonical]")).toBeInTheDocument();
    expect(screen.getByText("Legacy only").closest("[aria-label=Legacy]")).toBeInTheDocument();
    act(() => {
      toast.dismiss();
    });
    expect(screen.getByText("Canonical only")).toBeInTheDocument();
    act(() => {
      canonicalToast.close();
    });
  });

  it("reports actual close/removal callbacks and makes the deprecated alias accurate", async () => {
    const onDismiss = vi.fn();
    const onRemove = vi.fn();
    const onAutoClose = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Before", {id: "callbacks", onDismiss, onRemove, onAutoClose});
    });
    act(() => {
      toast.update("callbacks", {message: "After", variant: "warning"});
    });
    await userEvent.setup().click(screen.getByLabelText("Close notification"));
    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledOnce();
    });
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: "callbacks", title: "After", variant: "warning"}));
    expect(onAutoClose).not.toHaveBeenCalled();
    expect(toast.getToasts()).toHaveLength(0);
    act(() => {
      toast("Alias manually removed", {onAutoClose});
    });
    act(() => {
      toast.dismiss();
    });
    await waitFor(() => {
      expect(onAutoClose).toHaveBeenCalledOnce();
    });
    expect(onAutoClose.mock.calls[0]).toHaveLength(1);
  });

  it("times out with both close and remove callbacks, while duration zero remains active", async () => {
    const onDismiss = vi.fn();
    const onRemove = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Timer", {duration: 10, onDismiss, onRemove});
      toast("Persistent", {duration: 0});
    });
    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledOnce();
    });
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(toast.getToasts()).toEqual([expect.objectContaining({title: "Persistent"})]);
  });

  it("awaits asynchronous promise formatters and finally before resolving", async () => {
    vi.useFakeTimers();
    const source = Promise.withResolvers<number>();
    const formatter = Promise.withResolvers<{message: number; description: number}>();
    const finalizer = Promise.withResolvers<void>();
    const onFinally = vi.fn(() => finalizer.promise);
    let completed = false;
    render(<Toaster duration={1} />);
    let pending: Promise<number> | undefined;
    act(() => {
      pending = toast.promise(source.promise, {
        id: "async-format",
        loading: {message: 0, description: 0},
        success: () => formatter.promise,
        finally: onFinally,
      });
      void pending.then(() => {
        completed = true;
      });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(toast.getToasts()[0]?.variant).toBe("loading");
    await act(async () => {
      source.resolve(42);
      await Promise.resolve();
    });
    expect(onFinally).not.toHaveBeenCalled();
    expect(toast.getToasts()[0]?.variant).toBe("loading");
    await act(async () => {
      formatter.resolve({message: 0, description: 0});
      await Promise.resolve();
    });
    expect(onFinally).toHaveBeenCalledOnce();
    expect(completed).toBe(false);
    expect(toast.getToasts()[0]).toEqual(expect.objectContaining({id: "async-format", title: 0, description: 0, variant: "success"}));
    await act(async () => {
      finalizer.resolve();
      expect(await pending).toBe(42);
    });
    expect(completed).toBe(true);
  });

  it("surfaces success formatter and finally errors instead of returning fake success", async () => {
    render(<Toaster />);
    const formatterError = new Error("Success formatter failed");
    await act(async () => {
      await expect(
        toast.promise(Promise.resolve(42), {
          loading: "Pending",
          success: () => {
            throw formatterError;
          },
        }),
      ).rejects.toBe(formatterError);
    });
    expect(toast.getToasts()).toHaveLength(0);
    const finalError = new Error("Finalizer failed");
    await expect(
      toast.promise(Promise.resolve(42), {
        finally: () => {
          throw finalError;
        },
      }),
    ).rejects.toBe(finalError);
  });

  it("upserts explicit IDs, maintains immutable detached history and preserves update content", () => {
    render(<Toaster />);
    act(() => {
      toast("First", {id: 0, description: "Description"});
      toast("Replacement", {id: 0, description: 0});
    });
    act(() => {
      toast.update(0, {className: "updated"});
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "0", title: "Replacement", description: 0})]);
    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.getByText("Replacement").closest("[data-slot=toast]")).toHaveClass("updated");
    const first = toast.getHistory();
    expect(first).not.toBe(toast.getHistory());
    expect(Object.isFrozen(first.at(-1))).toBe(true);
  });

  it("honors cancel prevention and renders zero-valued action content", async () => {
    render(<Toaster />);
    act(() => {
      toast("Keep cancel", {action: 0, cancel: {label: "Cancel", onClick: (event) => event.preventDefault()}});
    });
    expect(screen.getByText("0")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", {name: "Cancel"}));
    expect(screen.getByText("Keep cancel")).toBeInTheDocument();
  });

  it("rejects malformed options and partial descriptors without registering snapshots", () => {
    render(<Toaster />);
    const history = toast.getHistory();
    expect(() => {
      // @ts-expect-error Deliberately invalid external options container.
      toast("Invalid", null);
    }).toThrow(/options/iu);
    expect(() => {
      // @ts-expect-error Deliberately invalid external options container.
      toast("Invalid", []);
    }).toThrow(/options/iu);
    expect(() => {
      // @ts-expect-error Deliberately invalid external partial action descriptor.
      toast("Invalid", {action: {label: "No handler"}});
    }).toThrow(/action/iu);
    expect(() => {
      // @ts-expect-error Deliberately invalid external identifier.
      toast("Invalid", {id: {value: "not an id"}});
    }).toThrow(/id/iu);
    expect(toast.getHistory()).toEqual(history);
    expect(toast.getToasts()).toHaveLength(0);
  });

  it("validates provider duration independently of toastOptions and rejects invalid limits", () => {
    expect(() =>
      render(
        <Toaster
          duration={-1}
          toastOptions={{duration: 0}}
        />,
      ),
    ).toThrow(/duration/iu);
    expect(() => render(<Toaster visibleToasts={0} />)).toThrow(/visibleToasts/iu);
  });

  it("rejects invalid custom renderers immediately rather than recording orphan content", () => {
    render(<Toaster />);
    const history = toast.getHistory();
    expect(() => {
      // @ts-expect-error Deliberately invalid external custom renderer.
      toast.custom("not callable");
    }).toThrow(/renderer/iu);
    expect(toast.getHistory()).toEqual(history);
    expect(toast.getToasts()).toHaveLength(0);
  });

  it("keeps top legacy swipes useful instead of only offering bottom-edge directions", async () => {
    render(<Toaster position='top-center' />);
    act(() => {
      toast("Top legacy swipe", {duration: 0});
    });
    const root = screen.getByText("Top legacy swipe").closest("[data-slot=toast]");
    if (!root) {
      throw new Error("Missing top legacy root");
    }
    fireEvent.pointerDown(root, {button: 0, pointerId: 1, pointerType: "touch", clientX: 0, clientY: 0});
    fireEvent.pointerMove(root, {pointerId: 1, clientX: 0, clientY: -1, movementX: 0, movementY: -1});
    fireEvent.pointerMove(root, {pointerId: 1, clientX: 0, clientY: -80, movementX: 0, movementY: -79});
    expect(root).toHaveAttribute("data-swipe-direction", "up");
    fireEvent.pointerUp(root, {pointerId: 1});
    await waitFor(() => {
      expect(toast.getToasts()).toHaveLength(0);
    });
  });

  it.each(Object.entries(composeStories(LegacyToastStories)))("mounts the real composed legacy %s story", (_name, Story) => {
    render(<Story />);
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });

  it("does not clip the canonical expanded-stack hover bridge and retains focus/media contracts", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "legacy-toast.module.css"), "utf8");
    expect(css).not.toMatch(/\.root\s*\{[^}]*overflow:\s*hidden/u);
    expect(css).toContain(".primaryAction:focus-visible");
    expect(css).toContain("outline: 2px solid Highlight");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("preserves active records when toaster defaults change instead of treating rerender as unmount", async () => {
    const {rerender} = render(<Toaster toastOptions={{duration: 0}} />);
    await act(async () => {
      toast("Before defaults", {id: "rerender"});
    });
    await act(async () => {
      rerender(
        <Toaster
          closeButton={false}
          toastOptions={{duration: 0, description: "New defaults"}}
        />,
      );
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "rerender"})]);
    await act(async () => {
      toast.update("rerender", {message: "Updated after defaults"});
      toast("New notification");
    });
    expect(screen.getByText("Updated after defaults")).toBeInTheDocument();
    expect(screen.getByText("New defaults")).toBeInTheDocument();
    expect(toast.getToasts()).toHaveLength(2);
    expect(screen.getAllByLabelText("Close notification")).toHaveLength(1);
  });

  it.each(["resolve", "reject"] as const)(
    "owns a no-loading %s operation without overwriting a later same-ID notification",
    async (outcome) => {
      const source = Promise.withResolvers<string>();
      const failure = new Error("Source rejected");
      const success = vi.fn((value: string) => `Stale ${value}`);
      const error = vi.fn(() => "Stale error");
      const onFinally = vi.fn();
      render(<Toaster />);
      const history = toast.getHistory();
      let pending: Promise<string> | undefined;
      act(() => {
        pending = toast.promise(source.promise, {id: "no-loader-replacement", success, error, finally: onFinally});
      });
      expect(toast.getToasts()).toHaveLength(0);
      expect(toast.getHistory()).toEqual(history);
      act(() => {
        toast("Replacement", {id: "no-loader-replacement", duration: 0});
      });
      await act(async () => {
        if (outcome === "resolve") {
          source.resolve("value");
          expect(await pending).toBe("value");
        } else {
          source.reject(failure);
          await expect(pending).rejects.toBe(failure);
        }
      });
      expect(toast.getToasts()).toEqual([expect.objectContaining({title: "Replacement"})]);
      expect(toast.getHistory().slice(history.length)).toEqual([expect.objectContaining({title: "Replacement"})]);
      expect(outcome === "resolve" ? success : error).toHaveBeenCalledOnce();
      expect(onFinally).toHaveBeenCalledOnce();
    },
  );

  it("supersedes older no-loader operations without reserving fake active/history snapshots", async () => {
    const first = Promise.withResolvers<number>();
    const second = Promise.withResolvers<number>();
    render(<Toaster />);
    const history = toast.getHistory();
    const earlier = toast.promise(first.promise, {id: "no-loader-operation", success: "Old result"});
    const later = toast.promise(second.promise, {id: "no-loader-operation", success: "New result"});
    expect(toast.getToasts()).toHaveLength(0);
    expect(toast.getHistory()).toEqual(history);
    await act(async () => {
      first.resolve(1);
      expect(await earlier).toBe(1);
    });
    expect(toast.getToasts()).toHaveLength(0);
    await act(async () => {
      second.resolve(2);
      expect(await later).toBe(2);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({title: "New result"})]);
    expect(toast.getHistory().slice(history.length)).toHaveLength(1);
  });

  it.each(["specific", "all"] as const)("invalidates no-loader operation ownership on %s dismissal", async (kind) => {
    const source = Promise.withResolvers<number>();
    render(<Toaster />);
    const history = toast.getHistory();
    const pending = toast.promise(source.promise, {id: "no-loader-dismiss", success: "Should not publish"});
    act(() => {
      toast.dismiss(kind === "specific" ? "no-loader-dismiss" : undefined);
    });
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(toast.getToasts()).toHaveLength(0);
    expect(toast.getHistory()).toEqual(history);
  });

  it.each(["resolve", "reject"] as const)("does not publish no-loader %s work into a remounted provider lifetime", async (outcome) => {
    const source = Promise.withResolvers<number>();
    const failure = new Error("Previous lifetime failed");
    const success = vi.fn(() => "Previous lifetime succeeded");
    const error = vi.fn(() => "Previous lifetime failed");
    const onFinally = vi.fn();
    const history = toast.getHistory();
    const {unmount} = render(<Toaster />);
    const pending = toast.promise(source.promise, {success, error, finally: onFinally});
    unmount();
    render(<Toaster />);
    await act(async () => {
      if (outcome === "resolve") {
        source.resolve(42);
        expect(await pending).toBe(42);
      } else {
        source.reject(failure);
        await expect(pending).rejects.toBe(failure);
      }
    });
    expect(toast.getToasts()).toHaveLength(0);
    expect(toast.getHistory()).toEqual(history);
    expect(outcome === "resolve" ? success : error).toHaveBeenCalledOnce();
    expect(onFinally).toHaveBeenCalledOnce();
  });

  it("keeps no-loader formatter/finally promises intact when unmount happens after source settlement", async () => {
    const formatted = Promise.withResolvers<string>();
    const finalized = Promise.withResolvers<void>();
    const onFinally = vi.fn(() => finalized.promise);
    const success = vi.fn(() => formatted.promise);
    const {unmount} = render(<Toaster />);
    const history = toast.getHistory();
    const pending = toast.promise(Promise.resolve(42), {success, finally: onFinally});
    await act(async () => {
      await Promise.resolve();
    });
    expect(success).toHaveBeenCalledOnce();
    unmount();
    render(<Toaster />);
    await act(async () => {
      formatted.resolve("Old formatted content");
      await Promise.resolve();
    });
    expect(onFinally).toHaveBeenCalledOnce();
    expect(toast.getToasts()).toHaveLength(0);
    await act(async () => {
      finalized.resolve();
      expect(await pending).toBe(42);
    });
    expect(toast.getHistory()).toEqual(history);
  });

  it("settles no-loader sources after unmount without throwing a missing-provider UI error", async () => {
    const source = Promise.withResolvers<number>();
    const success = vi.fn(() => "Unmounted completion");
    const onFinally = vi.fn();
    const {unmount} = render(<Toaster />);
    const history = toast.getHistory();
    const pending = toast.promise(source.promise, {success, finally: onFinally});
    unmount();
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(success).toHaveBeenCalledOnce();
    expect(onFinally).toHaveBeenCalledOnce();
    expect(toast.getHistory()).toEqual(history);
  });

  it("preserves resolved-state IDs without overwriting a notification created during the operation", async () => {
    const source = Promise.withResolvers<number>();
    render(<Toaster />);
    const pending = toast.promise(source.promise, {success: () => ({id: "resolved-target", message: "Old completion"})});
    act(() => {
      toast("Target replacement", {id: "resolved-target", duration: 0});
    });
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "resolved-target", title: "Target replacement"})]);
  });

  it.each([false, true])(
    "keeps real action/cancel keyboard outlines after the full CSS cascade (forced colors %s)",
    async (forcedColors) => {
      const user = userEvent.setup();
      render(<Toaster />);
      act(() => {
        toast("Focus contract", {
          duration: 0,
          action: {label: "Action", onClick: (event) => event.preventDefault()},
          cancel: {label: "Cancel", onClick: (event) => event.preventDefault()},
        });
      });
      for (const label of ["Cancel", "Action"]) {
        const button = screen.getByRole("button", {name: label});
        for (let count = 0; count < 5 && document.activeElement !== button; count += 1) {
          await user.tab();
        }
        expect(button).toHaveFocus();
        button.classList.add("keyboard-focus");
        const outline = focusedOutline(button, forcedColors);
        expect(outline.get("outline-style")?.value).toEqual({type: "line-style", value: "solid"});
        expect(outline.get("outline-width")?.value).toEqual({type: "length", value: {type: "value", value: {unit: "px", value: 2}}});
        if (forcedColors) {
          expect(outline.get("outline-color")?.value).toBe("highlight");
        }
        button.classList.remove("keyboard-focus");
      }
    },
  );

  it.each([false, true])(
    "keeps canonical action/close keyboard outlines in the combined module cascade (forced colors %s)",
    async (forcedColors) => {
      const user = userEvent.setup();
      const manager = createToastManager();
      render(
        <CanonicalToaster
          toastManager={manager}
          timeout={0}
        />,
      );
      act(() => {
        manager.add({title: "Canonical focus", actionProps: {children: "Canonical action"}});
      });
      for (const label of ["Canonical action", "Close toast"]) {
        const button = label === "Close toast" ? screen.getByLabelText(label) : screen.getByRole("button", {name: label});
        for (let count = 0; count < 5 && document.activeElement !== button; count += 1) {
          await user.tab();
        }
        expect(button).toHaveFocus();
        button.classList.add("keyboard-focus");
        const outline = focusedOutline(button, forcedColors);
        expect(outline.get("outline-style")?.value).toEqual({type: "line-style", value: "solid"});
        expect(outline.get("outline-width")?.value).toEqual({type: "length", value: {type: "value", value: {unit: "px", value: 2}}});
        if (forcedColors) {
          expect(outline.get("outline-color")?.value).toBe("highlight");
        }
        button.classList.remove("keyboard-focus");
      }
    },
  );

  it("preserves untouched resolved-state IDs and zero-valued no-loader content", async () => {
    render(<Toaster />);
    const history = toast.getHistory();
    await act(async () => {
      expect(
        await toast.promise(Promise.resolve(42), {
          id: "operation-key",
          success: () => ({id: "result-key", message: 0, description: 0, duration: 0}),
        }),
      ).toBe(42);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "result-key", title: 0, description: 0})]);
    expect(toast.getHistory().slice(history.length)).toHaveLength(1);
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("keeps no-loader ownership independent of canonical managers and unrelated legacy IDs", async () => {
    const source = Promise.withResolvers<number>();
    const canonical = createToastManager();
    render(
      <>
        <Toaster />
        <CanonicalToaster
          toastManager={canonical}
          timeout={0}
          viewportProps={{"aria-label": "Canonical independent"}}
        />
      </>,
    );
    const pending = toast.promise(source.promise, {id: "isolated-operation", success: "Owned completion"});
    act(() => {
      canonical.add({id: "isolated-operation", title: "Canonical same ID"});
      canonical.close("isolated-operation");
      toast("Unrelated", {id: "unrelated", duration: 0});
      toast.dismiss("unrelated");
    });
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "isolated-operation", title: "Owned completion"})]);
    expect(screen.getByText("Owned completion").closest("[aria-label=Notifications]")).toBeInTheDocument();
  });

  it("does not invalidate no-loader ownership during a defaults rerender", async () => {
    const source = Promise.withResolvers<number>();
    const {rerender} = render(<Toaster toastOptions={{duration: 0, description: "Initial default"}} />);
    const pending = toast.promise(source.promise, {id: "no-loader-rerender", success: "Still owned"});
    rerender(
      <Toaster
        closeButton={false}
        toastOptions={{duration: 0, className: "updated-defaults", description: "Current default"}}
      />,
    );
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "no-loader-rerender", title: "Still owned"})]);
    expect(screen.getByText("Current default")).toBeInTheDocument();
  });

  it("does not let a superseded finalizer erase newer no-loader ownership", async () => {
    const finalizer = Promise.withResolvers<void>();
    const source = Promise.withResolvers<number>();
    const entered = vi.fn(() => finalizer.promise);
    render(<Toaster />);
    const earlier = toast.promise(Promise.resolve(1), {id: "finally-owner", finally: entered});
    await act(async () => {
      await Promise.resolve();
    });
    expect(entered).toHaveBeenCalledOnce();
    const later = toast.promise(source.promise, {id: "finally-owner", success: "Newer operation"});
    const finalError = new Error("Old finalizer rejected");
    await act(async () => {
      finalizer.reject(finalError);
      await expect(earlier).rejects.toBe(finalError);
    });
    await act(async () => {
      source.resolve(2);
      expect(await later).toBe(2);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "finally-owner", title: "Newer operation"})]);
  });

  it("runs no-loader source/formatters/finally before the first provider without adopting a later lifetime", async () => {
    const source = Promise.withResolvers<number>();
    const success = vi.fn(() => "Should not adopt");
    const onFinally = vi.fn();
    const history = toast.getHistory();
    const pending = toast.promise(() => source.promise, {success, finally: onFinally});
    render(<Toaster />);
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(success).toHaveBeenCalledExactlyOnceWith(42);
    expect(onFinally).toHaveBeenCalledOnce();
    expect(toast.getToasts()).toHaveLength(0);
    expect(toast.getHistory()).toEqual(history);
  });

  it("does not overwrite an explicitly updated resolved target with stale no-loader completion", async () => {
    const source = Promise.withResolvers<number>();
    const success = vi.fn(() => ({id: "updated-target", message: "Stale result"}));
    const onFinally = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Initial target", {id: "updated-target", duration: 0});
    });
    const pending = toast.promise(source.promise, {success, finally: onFinally});
    await act(async () => {
      toast.update("updated-target", {message: "Newer explicit update"});
    });
    const updatedHistory = toast.getHistory();
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "updated-target", title: "Newer explicit update"})]);
    expect(toast.getHistory()).toEqual(updatedHistory);
    expect(success).toHaveBeenCalledExactlyOnceWith(42);
    expect(onFinally).toHaveBeenCalledOnce();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects raw invalid resolved-state ID %s before coercion without active/history entries and awaits finally",
    async (id) => {
      const finalizer = Promise.withResolvers<void>();
      const onFinally = vi.fn(() => finalizer.promise);
      const success = vi.fn(() => ({id, message: "Invalid ID"}));
      render(<Toaster />);
      const history = toast.getHistory();
      let completed = false;
      let rejected: Promise<void> | undefined;
      await act(async () => {
        const pending = toast.promise(Promise.resolve(42), {success, finally: onFinally});
        rejected = pending.then(
          () => {
            completed = true;
            throw new Error("Invalid numeric ID unexpectedly resolved");
          },
          (error: unknown) => {
            completed = true;
            expect(error).toBeInstanceOf(TypeError);
            expect(error).toHaveProperty("message", expect.stringMatching(/id/iu));
          },
        );
        await Promise.resolve();
      });
      expect(onFinally).toHaveBeenCalledOnce();
      expect(completed).toBe(false);
      expect(toast.getToasts()).toHaveLength(0);
      expect(toast.getHistory()).toEqual(history);
      await act(async () => {
        finalizer.resolve();
        await rejected;
      });
      expect(completed).toBe(true);
      expect(success).toHaveBeenCalledExactlyOnceWith(42);
      expect(toast.getToasts()).toHaveLength(0);
      expect(toast.getHistory()).toEqual(history);
    },
  );

  it.each([0, 17, -4, 1.25])("preserves finite resolved-state numeric ID %s and current default styling", async (id) => {
    render(<Toaster toastOptions={{duration: 0, className: "valid-resolved-default", description: "Default description"}} />);
    const history = toast.getHistory();
    await act(async () => {
      expect(await toast.promise(Promise.resolve(42), {success: {id, message: 0}})).toBe(42);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: String(id), title: 0, description: "Default description"})]);
    expect(toast.getHistory().slice(history.length)).toHaveLength(1);
    expect(screen.getByText("0").closest("[data-slot=toast]")).toHaveClass("valid-resolved-default");
  });

  it("does not suppress resolved-target completion when only an unrelated ID is explicitly updated", async () => {
    const source = Promise.withResolvers<number>();
    render(<Toaster />);
    act(() => {
      toast("Initial target", {id: "unchanged-target", duration: 0});
      toast("Unrelated", {id: "updated-unrelated", duration: 0});
    });
    const pending = toast.promise(source.promise, {success: {id: "unchanged-target", message: "Owned target completion"}});
    await act(async () => {
      toast.update("updated-unrelated", {message: "New unrelated content"});
    });
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(toast.getToasts()).toEqual([
      expect.objectContaining({id: "unchanged-target", title: "Owned target completion"}),
      expect.objectContaining({id: "updated-unrelated", title: "New unrelated content"}),
    ]);
  });

  it("keeps actual loading-operation ownership during explicit progress updates", async () => {
    const source = Promise.withResolvers<number>();
    render(<Toaster />);
    let pending: Promise<number> | undefined;
    act(() => {
      pending = toast.promise(source.promise, {id: "loading-progress", loading: "Starting", success: "Completed"});
    });
    await act(async () => {
      toast.update("loading-progress", {message: "Explicit progress", description: "Halfway"});
    });
    expect(screen.getByText("Explicit progress")).toBeInTheDocument();
    await act(async () => {
      source.resolve(42);
      expect(await pending).toBe(42);
    });
    expect(toast.getToasts()).toEqual([expect.objectContaining({id: "loading-progress", title: "Completed"})]);
  });
});
