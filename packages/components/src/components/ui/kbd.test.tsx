import {render, screen} from "@testing-library/react";
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
});
