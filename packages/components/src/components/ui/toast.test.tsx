import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";

import {toast, Toaster} from "./sonner";

describe("Sonner", () => {
  afterEach(() => {
    act(() => {
      toast.dismiss();
    });
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
    void toast.promise(promise, {
      loading: "Saving profile",
      success: "Profile saved",
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
    const user = userEvent.setup();
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

    const pendingToast = toast.promise(promise, {
      loading: "Saving profile",
      error: () => ({
        description: "Please retry.",
        message: "Profile failed",
      }),
      finally: handleFinally,
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

  it("renders no action control for non-element renderables that are not toast actions", async () => {
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
    });
  });

  it("adds updated orphan toasts to history", () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.update("orphan-toast", {
        message: "Recovered toast",
        variant: "warning",
      });
    });

    // Assert
    expect(
      toast.getHistory().some((entry) => entry.id === "orphan-toast" && entry.variant === "warning" && entry.title === "Recovered toast"),
    ).toBe(true);
  });

  it("dismisses loading toasts when a promise resolves without success content", async () => {
    // Arrange
    let resolvePromise: ((value: string) => void) | undefined;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    render(<Toaster />);

    const pendingToast = toast.promise(promise, {
      loading: "Loading only",
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
});
