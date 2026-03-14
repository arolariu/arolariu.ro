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
});
