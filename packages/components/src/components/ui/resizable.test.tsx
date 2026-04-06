import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {GroupImperativeHandle, ResizableHandle, ResizablePanel, ResizablePanelGroup} from "./resizable";

describe("Resizable", () => {
  function renderResizable(className?: string): ReturnType<typeof render> {
    return render(
      <ResizablePanelGroup
        className={className}
        orientation='horizontal'>
        <ResizablePanel defaultSize='50%'>Left panel</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize='50%'>Right panel</ResizablePanel>
      </ResizablePanelGroup>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderResizable();

    // Assert
    expect(screen.getByText("Left panel")).toBeInTheDocument();
    expect(screen.getByText("Right panel")).toBeInTheDocument();
  });

  it("renders the resize handle", () => {
    // Arrange
    renderResizable();

    // Assert
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders a visual grip when withHandle is enabled", () => {
    // Arrange
    const {container} = renderResizable();

    // Assert
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("merges the group className", () => {
    // Arrange
    const {container} = renderResizable("custom-group");

    // Assert
    expect(container.firstElementChild).toHaveClass("custom-group");
  });

  it("renders panel children", () => {
    // Arrange
    renderResizable();

    // Assert
    expect(screen.getByText("Left panel")).toBeInTheDocument();
    expect(screen.getByText("Right panel")).toBeInTheDocument();
  });

  it("exports the GroupImperativeHandle type", () => {
    // Assert — type-level check; if this compiles, the type is exported
    const handle: GroupImperativeHandle | null = null;
    expect(handle).toBeNull();
  });

  it("renders grip content alongside consumer children", () => {
    // Arrange
    render(
      <ResizablePanelGroup orientation='horizontal'>
        <ResizablePanel defaultSize='50%'>Left panel</ResizablePanel>
        <ResizableHandle withHandle>
          <span>Custom handle content</span>
        </ResizableHandle>
        <ResizablePanel defaultSize='50%'>Right panel</ResizablePanel>
      </ResizablePanelGroup>,
    );

    // Assert
    expect(screen.getByText("Custom handle content")).toBeInTheDocument();
    expect(screen.getByRole("separator").querySelector("svg")).not.toBeNull();
  });
});
