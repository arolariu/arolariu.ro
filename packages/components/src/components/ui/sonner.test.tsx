import {act, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

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
});
