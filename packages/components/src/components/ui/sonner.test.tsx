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
});
