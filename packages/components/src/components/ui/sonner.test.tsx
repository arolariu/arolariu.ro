import {act, render, screen, waitFor} from "@testing-library/react";

import {Toaster, toast} from "./sonner";

interface Deferred<Value> {
  promise: Promise<Value>;
  reject: (reason?: unknown) => void;
  resolve: (value: Value) => void;
}

function createDeferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, reject, resolve};
}

describe("sonner", () => {
  it("should render an imperative toast with a description", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast("Profile updated", {
        description: "Your changes were saved successfully.",
      });
    });

    // Assert
    expect(await screen.findByText("Profile updated")).toBeInTheDocument();
    expect(screen.getByText("Your changes were saved successfully.")).toBeInTheDocument();
  });

  it("should render status variants through convenience methods", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.success("Success state");
      toast.error("Error state");
      toast.info("Info state");
      toast.warning("Warning state");
    });

    // Assert
    expect((await screen.findByText("Success state")).closest("[data-variant='success']")).toBeInTheDocument();
    expect(screen.getByText("Error state").closest("[data-variant='error']")).toBeInTheDocument();
    expect(screen.getByText("Info state").closest("[data-variant='info']")).toBeInTheDocument();
    expect(screen.getByText("Warning state").closest("[data-variant='warning']")).toBeInTheDocument();
  });

  it("should dismiss an existing toast by identifier", async () => {
    // Arrange
    render(<Toaster />);

    let toastId = "";

    // Act
    act(() => {
      toastId = toast.loading("Uploading invoice");
    });

    expect(await screen.findByText("Uploading invoice")).toBeInTheDocument();

    act(() => {
      toast.dismiss(toastId);
    });

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Uploading invoice")).not.toBeInTheDocument();
    });
  });

  it("should resolve toast.promise into a success toast", async () => {
    // Arrange
    render(<Toaster />);
    const deferredPromise = createDeferred<string>();

    // Act
    let resultPromise!: Promise<string>;

    await act(async () => {
      resultPromise = toast.promise(deferredPromise.promise, {
        loading: "Saving invoice",
        success: (value) => ({description: "Invoice is now ready.", message: `Saved ${value}`}),
      });
    });

    // Assert
    expect(await screen.findByText("Saving invoice")).toBeInTheDocument();

    await act(async () => {
      deferredPromise.resolve("invoice-42");
      await resultPromise;
    });

    await expect(resultPromise).resolves.toBe("invoice-42");
    expect(await screen.findByText("Saved invoice-42")).toBeInTheDocument();
    expect(screen.getByText("Invoice is now ready.")).toBeInTheDocument();
  });

  it("should resolve toast.promise into an error toast", async () => {
    // Arrange
    render(<Toaster />);
    const deferredPromise = createDeferred<never>();

    // Act
    let resultPromise!: Promise<never>;

    await act(async () => {
      resultPromise = toast.promise(deferredPromise.promise, {
        error: (error) => ({description: "Please try again later.", message: error instanceof Error ? error.message : "Unknown error"}),
        loading: "Sending feedback",
      });
    });

    // Assert
    expect(await screen.findByText("Sending feedback")).toBeInTheDocument();

    await act(async () => {
      deferredPromise.reject(new Error("Network offline"));
      await resultPromise.catch(() => undefined);
    });

    await expect(resultPromise).rejects.toThrow("Network offline");
    expect(await screen.findByText("Network offline")).toBeInTheDocument();
    expect(screen.getByText("Please try again later.")).toBeInTheDocument();
  });

  it("should render custom toast content", async () => {
    // Arrange
    render(<Toaster closeButton={false} />);

    // Act
    act(() => {
      toast.custom((toastId) => <div data-testid='custom-toast'>Custom toast {toastId}</div>);
    });

    // Assert
    expect(await screen.findByTestId("custom-toast")).toBeInTheDocument();
  });

  it("should expose toast history and active toasts", async () => {
    // Arrange
    render(<Toaster />);

    // Act
    act(() => {
      toast.message("History item");
    });

    // Assert
    expect(await screen.findByText("History item")).toBeInTheDocument();
    expect(toast.getHistory().some((entry) => entry.title === "History item")).toBe(true);
    expect(toast.getToasts().some((entry) => entry.title === "History item")).toBe(true);
  });
});
