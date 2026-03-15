import {render, screen} from "@testing-library/react";
import {createRef} from "react";
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

  it("renders EmptyMedia with the default variant", () => {
    // Arrange
    render(<EmptyMedia data-testid='empty-media-default'>📦</EmptyMedia>);

    // Assert
    const media = screen.getByTestId("empty-media-default");
    expect(media).toHaveTextContent("📦");
    expect(media).toHaveAttribute("data-variant", "default");
    expect(media).toHaveAttribute("data-slot", "empty-icon");
  });

  it("renders EmptyMedia with the icon variant", () => {
    // Arrange
    render(
      <EmptyMedia
        variant='icon'
        data-testid='empty-media-icon'>
        📭
      </EmptyMedia>,
    );

    // Assert
    const media = screen.getByTestId("empty-media-icon");
    expect(media).toHaveTextContent("📭");
    expect(media).toHaveAttribute("data-variant", "icon");
    expect(media).toHaveAttribute("data-slot", "empty-icon");
  });

  it("applies distinct styling for default and icon media variants", () => {
    // Arrange
    render(
      <>
        <EmptyMedia data-testid='empty-media-default-variant'>📦</EmptyMedia>
        <EmptyMedia
          variant='icon'
          data-testid='empty-media-icon-variant'>
          📭
        </EmptyMedia>
      </>,
    );

    // Assert
    expect(screen.getByTestId("empty-media-default-variant").className).not.toBe(screen.getByTestId("empty-media-icon-variant").className);
  });

  it("forwards ref to EmptyMedia", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(<EmptyMedia ref={ref}>📦</EmptyMedia>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className to EmptyMedia alongside default styles", () => {
    // Arrange
    render(
      <EmptyMedia
        className='custom-media'
        data-testid='empty-media-custom'>
        📦
      </EmptyMedia>,
    );

    // Assert
    const media = screen.getByTestId("empty-media-custom");
    expect(media).toHaveClass("custom-media");
    expect(media.className).not.toBe("custom-media");
  });

  it("renders EmptyTitle without crashing", () => {
    // Arrange
    render(<EmptyTitle>Nothing here yet</EmptyTitle>);

    // Assert
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("forwards ref to EmptyTitle", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(<EmptyTitle ref={ref}>Nothing here yet</EmptyTitle>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className to EmptyTitle alongside default styles", () => {
    // Arrange
    render(
      <EmptyTitle
        className='custom-title'
        data-testid='empty-title'>
        Nothing here yet
      </EmptyTitle>,
    );

    // Assert
    const title = screen.getByTestId("empty-title");
    expect(title).toHaveClass("custom-title");
    expect(title.className).not.toBe("custom-title");
  });

  it("renders EmptyHeader without crashing", () => {
    // Arrange
    render(<EmptyHeader>Header content</EmptyHeader>);

    // Assert
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("forwards ref to EmptyHeader", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(<EmptyHeader ref={ref}>Header content</EmptyHeader>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className to EmptyHeader alongside default styles", () => {
    // Arrange
    render(
      <EmptyHeader
        className='custom-header'
        data-testid='empty-header-custom'>
        Header content
      </EmptyHeader>,
    );

    // Assert
    const header = screen.getByTestId("empty-header-custom");
    expect(header).toHaveClass("custom-header");
    expect(header.className).not.toBe("custom-header");
  });

  it("renders EmptyDescription as a paragraph", () => {
    // Arrange
    render(<EmptyDescription>Try adjusting your filters.</EmptyDescription>);

    // Assert
    const description = screen.getByText("Try adjusting your filters.");
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe("P");
  });

  it("forwards ref to EmptyDescription", () => {
    // Arrange
    const ref = createRef<HTMLParagraphElement>();

    render(<EmptyDescription ref={ref}>Try adjusting your filters.</EmptyDescription>);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it("applies custom className to EmptyDescription alongside default styles", () => {
    // Arrange
    render(
      <EmptyDescription
        className='custom-description'
        data-testid='empty-description'>
        Try adjusting your filters.
      </EmptyDescription>,
    );

    // Assert
    const description = screen.getByTestId("empty-description");
    expect(description).toHaveClass("custom-description");
    expect(description.className).not.toBe("custom-description");
  });
});
