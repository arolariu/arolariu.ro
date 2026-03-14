import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "./empty";

describe("Empty", () => {
  it("renders Empty compound components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const emptyRef = {current: null as HTMLDivElement | null};
    const contentRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <Empty
        ref={emptyRef}
        className='empty-class'
        data-testid='empty-root'>
        <EmptyHeader data-testid='empty-header'>
          <EmptyMedia data-testid='empty-media'>📦</EmptyMedia>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>Add your first item to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent
          ref={contentRef}
          className='empty-content-class'
          data-testid='empty-content'>
          Action area
        </EmptyContent>
      </Empty>,
    );

    // Assert
    const emptyRoot = screen.getByTestId("empty-root");
    const emptyContent = screen.getByTestId("empty-content");

    expect(emptyRoot).toHaveClass("empty-class");
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first item to get started.")).toBeInTheDocument();
    expect(emptyContent).toHaveTextContent("Action area");
    expect(emptyContent).toHaveClass("empty-content-class");
    expect(emptyRef.current).toBe(emptyRoot);
    expect(contentRef.current).toBe(emptyContent);
  });
});
