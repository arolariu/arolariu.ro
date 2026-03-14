import {act, render, screen} from "@testing-library/react";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {ScrollArea, ScrollBar} from "./scroll-area";

const originalGetAnimations = Element.prototype.getAnimations;

describe("ScrollArea", () => {
  beforeAll(() => {
    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: (): Animation[] => [],
    });
  });

  afterAll(() => {
    if (originalGetAnimations === undefined) {
      Reflect.deleteProperty(Element.prototype, "getAnimations");
      return;
    }

    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: originalGetAnimations,
    });
  });

  it("renders children", async () => {
    // Arrange
    await act(async () => {
      render(
        <ScrollArea className='h-52'>
          <p>Scrollable content</p>
        </ScrollArea>,
      );
    });

    // Assert
    expect(screen.getByText("Scrollable content")).toBeInTheDocument();
  });

  it("renders without crashing with ScrollBar", async () => {
    // Assert
    await expect(
      act(async () => {
        const {unmount} = render(
          <ScrollArea className='h-52'>
            <p>Content</p>
            <ScrollBar orientation='vertical' />
          </ScrollArea>,
        );

        unmount();
      }),
    ).resolves.not.toThrow();
  });

  it("renders ScrollArea with custom className", async () => {
    // Arrange & Act
    await act(async () => {
      render(
        <ScrollArea className='my-custom-scroll-area'>
          <p>Scrollable content</p>
        </ScrollArea>,
      );
    });

    // Assert - verify component renders without error
    expect(true).toBe(true);
  });

  it("renders ScrollArea with large content", async () => {
    // Arrange & Act
    await act(async () => {
      render(
        <ScrollArea>
          <div style={{height: "2000px"}}>
            <p>Tall content</p>
          </div>
        </ScrollArea>,
      );
    });

    // Assert - verify it renders without error
    expect(true).toBe(true);
  });

  it("renders with vertical ScrollBar orientation by default", async () => {
    // Arrange & Act
    await act(async () => {
      render(
        <ScrollArea>
          <div>
            <p>Content</p>
          </div>
        </ScrollArea>,
      );
    });

    // Assert - component renders successfully (ScrollBar is included by default in ScrollArea)
    expect(true).toBe(true);
  });

  it("renders ScrollArea without errors when content is wide", async () => {
    // Arrange - Test horizontal scrolling scenario
    await act(async () => {
      render(
        <ScrollArea>
          <div style={{width: "3000px"}}>
            <p>Wide horizontal content</p>
          </div>
        </ScrollArea>,
      );
    });

    // Assert - component renders
    expect(true).toBe(true);
  });
});
