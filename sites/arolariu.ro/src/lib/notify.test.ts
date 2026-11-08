import {toast} from "@arolariu/components";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {DEFAULT_CONFIRMATION_TIMEOUT_MS, notify} from "./notify";

vi.mock("@arolariu/components", () => ({
  toast: {
    add: vi.fn((options: {id?: string}) => options.id ?? "toast-1"),
    update: vi.fn(),
    close: vi.fn(),
  },
}));

describe("notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["success", notify.success],
    ["error", notify.error],
    ["info", notify.info],
    ["warning", notify.warning],
    ["loading", notify.loading],
  ] as const)("adds a %s notification with its type", (type, show) => {
    // Arrange
    const title = "Saved";

    // Act
    const id = show(title, {description: "Details", timeout: 3000});

    // Assert
    expect(id).toBe("toast-1");
    expect(toast.add).toHaveBeenCalledWith({title, description: "Details", timeout: 3000, type});
  });

  it("adds a neutral message without a type that auto-dismisses", () => {
    // Arrange & Act
    notify.message("Hello");

    // Assert
    expect(toast.add).toHaveBeenCalledWith({title: "Hello", timeout: DEFAULT_CONFIRMATION_TIMEOUT_MS});
  });

  it.each([
    ["success", notify.success],
    ["info", notify.info],
  ] as const)("auto-dismisses %s notifications by default", (type, show) => {
    // Arrange & Act
    show("Done");

    // Assert
    expect(toast.add).toHaveBeenCalledWith({title: "Done", type, timeout: DEFAULT_CONFIRMATION_TIMEOUT_MS});
  });

  it.each([
    ["error", notify.error],
    ["warning", notify.warning],
    ["loading", notify.loading],
  ] as const)("keeps %s notifications open by default", (type, show) => {
    // Arrange & Act
    show("Heads up");

    // Assert
    expect(toast.add).toHaveBeenCalledWith({title: "Heads up", type, timeout: 0});
  });

  it("does not let an error reusing a confirmation id inherit its auto-dismiss timeout", () => {
    // Arrange
    notify.success("Saved", {id: "shared"});

    // Act
    notify.error("Failed", {id: "shared"});

    // Assert
    expect(toast.add).toHaveBeenLastCalledWith({title: "Failed", type: "error", timeout: 0, id: "shared"});
  });

  it("lets an explicit timeout of 0 keep a confirmation open", () => {
    // Arrange & Act
    notify.success("Pinned", {timeout: 0});

    // Assert
    expect(toast.add).toHaveBeenCalledWith({title: "Pinned", type: "success", timeout: 0});
  });

  it("adds by id so a closed notification is shown again instead of being dropped", () => {
    // Arrange & Act
    const id = notify.success("Done", {id: "existing"});

    // Assert
    expect(id).toBe("existing");
    expect(toast.add).toHaveBeenCalledWith({title: "Done", type: "success", timeout: DEFAULT_CONFIRMATION_TIMEOUT_MS, id: "existing"});
    expect(toast.update).not.toHaveBeenCalled();
  });

  it("closes a notification by id", () => {
    // Arrange & Act
    notify.dismiss("toast-1");

    // Assert
    expect(toast.close).toHaveBeenCalledWith("toast-1");
  });
});
