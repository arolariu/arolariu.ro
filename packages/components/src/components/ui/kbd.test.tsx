import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Kbd, KbdGroup} from "./kbd";

describe("Kbd", () => {
  it("renders Kbd components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const groupRef = {current: null as HTMLElement | null};
    const keyRef = {current: null as HTMLElement | null};

    // Act
    render(
      <KbdGroup
        ref={groupRef}
        className='kbd-group-class'
        data-testid='kbd-group'>
        <Kbd
          ref={keyRef}
          className='kbd-class'
          data-testid='kbd-key'>
          ⌘K
        </Kbd>
      </KbdGroup>,
    );

    // Assert
    const keyGroup = screen.getByTestId("kbd-group");
    const key = screen.getByTestId("kbd-key");

    expect(keyGroup).toHaveClass("kbd-group-class");
    expect(key).toHaveClass("kbd-class");
    expect(key).toHaveTextContent("⌘K");
    expect(groupRef.current).toBe(keyGroup);
    expect(keyRef.current).toBe(key);
  });

  it("renders Kbd text content", () => {
    // Arrange
    render(<Kbd>⌘K</Kbd>);

    // Assert
    const key = screen.getByText("⌘K");
    expect(key).toBeInTheDocument();
    expect(key.tagName).toBe("KBD");
  });

  it("forwards ref to Kbd", () => {
    // Arrange
    const ref = createRef<HTMLElement>();

    render(<Kbd ref={ref}>⌘K</Kbd>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe("KBD");
  });

  it("applies custom className to Kbd alongside default styles", () => {
    // Arrange
    render(
      <Kbd
        className='kbd-custom'
        data-testid='kbd-custom'>
        ⌘K
      </Kbd>,
    );

    // Assert
    const key = screen.getByTestId("kbd-custom");
    expect(key).toHaveClass("kbd-custom");
    expect(key.className).not.toBe("kbd-custom");
  });

  it("sets the data-slot attribute on Kbd", () => {
    // Arrange
    render(<Kbd data-testid='kbd-slot'>K</Kbd>);

    // Assert
    expect(screen.getByTestId("kbd-slot")).toHaveAttribute("data-slot", "kbd");
  });
});
