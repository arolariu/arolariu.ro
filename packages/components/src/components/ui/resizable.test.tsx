import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "./resizable";

describe("Resizable", () => {
  function renderResizable(className?: string): ReturnType<typeof render> {
    return render(
      <ResizablePanelGroup
        className={className}
        direction='horizontal'>
        <ResizablePanel defaultSize={50}>Left panel</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>Right panel</ResizablePanel>
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
});
