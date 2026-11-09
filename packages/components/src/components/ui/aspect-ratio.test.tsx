import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {AspectRatio} from "./aspect-ratio";

describe("AspectRatio", () => {
  it.each([
    [undefined, "1"],
    [16 / 9, "1.7777777777777777"],
    ["16 / 9", "16 / 9"],
    ["auto 4 / 3", "auto 4 / 3"],
  ] as const)("bridges ratio %s without hardcoding layout and keeps ratio authoritative", (ratio, expected) => {
    const ref = createRef<HTMLDivElement>();
    render(
      <AspectRatio
        ref={ref}
        ratio={ratio}
        style={{aspectRatio: "2 / 1", width: "80%"}}>
        Media
      </AspectRatio>,
    );
    expect(ref.current?.style.getPropertyValue("--ac-aspect-ratio")).toBe(expected);
    expect(ref.current?.style.aspectRatio).toBe("");
    expect(ref.current?.style.width).toBe("80%");
    expect(ref.current).toHaveAttribute("data-slot", "aspect-ratio");
  });
  it("renders AspectRatio with children, custom classes, and a forwarded ref", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

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

  it("keeps its ratio authoritative over a caller custom-property override as well as native ratio styles", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <AspectRatio
        ref={ref}
        ratio='3 / 2'
        style={{"--ac-aspect-ratio": "4 / 1", aspectRatio: "2 / 1", borderRadius: "12px"}}
      />,
    );
    expect(ref.current?.style.getPropertyValue("--ac-aspect-ratio")).toBe("3 / 2");
    expect(ref.current?.style.aspectRatio).toBe("");
    expect(ref.current?.style.borderRadius).toBe("12px");
  });
});
