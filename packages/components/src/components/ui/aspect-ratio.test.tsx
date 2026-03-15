import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {AspectRatio} from "./aspect-ratio";

describe("AspectRatio", () => {
  it("renders AspectRatio with children, custom classes, and a forwarded ref", () => {
    // Arrange
    const ref = {current: null as HTMLDivElement | null};

    // Act
    render(
      <AspectRatio
        ref={ref}
        className='aspect-ratio-class'
        data-testid='aspect-ratio'>
        Media
      </AspectRatio>,
    );

    // Assert
    const aspectRatio = screen.getByTestId("aspect-ratio");

    expect(aspectRatio).toHaveClass("aspect-ratio-class");
    expect(aspectRatio).toHaveTextContent("Media");
    expect(ref.current).toBe(aspectRatio);
  });
});
