import {toast} from "@arolariu/components";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {notify} from "./notify";

vi.mock("@arolariu/components", () => ({
  toast: {
    add: vi.fn(() => "toast-1"),
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

  it("adds a neutral message without a type", () => {
    // Arrange & Act
    notify.message("Hello");

    // Assert
    expect(toast.add).toHaveBeenCalledWith({title: "Hello"});
  });

  it("updates an existing notification when an id is given", () => {
    // Arrange & Act
    const id = notify.success("Done", {id: "existing"});

    // Assert
    expect(id).toBe("existing");
    expect(toast.update).toHaveBeenCalledWith("existing", {title: "Done", type: "success"});
    expect(toast.add).not.toHaveBeenCalled();
  });

  it("closes a notification by id", () => {
    // Arrange & Act
    notify.dismiss("toast-1");

    // Assert
    expect(toast.close).toHaveBeenCalledWith("toast-1");
  });
});
