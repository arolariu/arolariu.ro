import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./item";

describe("Item", () => {
  it("renders Item compound components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const itemGroupRef = {current: null as HTMLDivElement | null};
    const itemRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <ItemGroup
        ref={itemGroupRef}
        className='item-group-class'
        data-testid='item-group'>
        <Item
          ref={itemRef}
          className='item-class'
          data-testid='item'>
          <ItemMedia>👤</ItemMedia>
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Alex Olariu</ItemTitle>
            </ItemHeader>
            <ItemDescription>Frontend Engineer</ItemDescription>
          </ItemContent>
          <ItemActions>
            <button type='button'>Invite</button>
          </ItemActions>
        </Item>
      </ItemGroup>,
    );

    // Assert
    const itemGroup = screen.getByTestId("item-group");
    const item = screen.getByTestId("item");

    expect(itemGroup).toHaveClass("item-group-class");
    expect(item).toHaveClass("item-class");
    expect(screen.getByText("Alex Olariu")).toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Invite"})).toBeInTheDocument();
    expect(itemGroupRef.current).toBe(itemGroup);
    expect(itemRef.current).toBe(item);
  });

  it("renders Item with asChild prop, cloning child element with merged props", () => {
    // Arrange & Act
    render(
      <Item
        asChild
        className='custom-item'
        data-testid='item-wrapper'>
        <article className='child-class'>
          <span>Child content</span>
        </article>
      </Item>,
    );

    // Assert
    const article = screen.getByText("Child content").closest("article");
    expect(article).toHaveClass("custom-item");
    expect(article).toHaveClass("child-class");
    expect(article).toHaveAttribute("data-testid", "item-wrapper");
    expect(article).toHaveAttribute("data-slot", "item");
    expect(article).toHaveAttribute("data-variant", "default");
    expect(article).toHaveAttribute("data-size", "default");
  });

  it("renders Item with outline variant", () => {
    // Arrange & Act
    render(
      <Item
        variant='outline'
        data-testid='item-outline'>
        Outline Item
      </Item>,
    );

    // Assert
    expect(screen.getByTestId("item-outline")).toHaveAttribute("data-variant", "outline");
  });

  it("renders Item with muted variant", () => {
    // Arrange & Act
    render(
      <Item
        variant='muted'
        data-testid='item-muted'>
        Muted Item
      </Item>,
    );

    // Assert
    expect(screen.getByTestId("item-muted")).toHaveAttribute("data-variant", "muted");
  });

  it("renders Item with sm size", () => {
    // Arrange & Act
    render(
      <Item
        size='sm'
        data-testid='item-sm'>
        Small Item
      </Item>,
    );

    // Assert
    expect(screen.getByTestId("item-sm")).toHaveAttribute("data-size", "sm");
  });

  it("renders ItemFooter component", () => {
    // Arrange & Act
    render(
      <Item>
        <ItemContent>
          <ItemHeader>
            <ItemTitle>Title</ItemTitle>
          </ItemHeader>
          <ItemFooter data-testid='item-footer'>Footer content</ItemFooter>
        </ItemContent>
      </Item>,
    );

    // Assert
    const footer = screen.getByTestId("item-footer");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute("data-slot", "item-footer");
    expect(footer).toHaveTextContent("Footer content");
  });

  it("renders ItemSeparator component", () => {
    // Arrange & Act
    render(
      <ItemGroup>
        <Item>Item 1</Item>
        <ItemSeparator data-testid='item-separator' />
        <Item>Item 2</Item>
      </ItemGroup>,
    );

    // Assert
    const separator = screen.getByTestId("item-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("data-slot", "item-separator");
  });

  it("renders ItemMedia with icon variant", () => {
    // Arrange & Act
    render(
      <Item>
        <ItemMedia
          variant='icon'
          data-testid='item-media-icon'>
          ⭐
        </ItemMedia>
        <ItemContent>Content</ItemContent>
      </Item>,
    );

    // Assert
    const media = screen.getByTestId("item-media-icon");
    expect(media).toHaveAttribute("data-variant", "icon");
  });

  it("renders ItemMedia with image variant", () => {
    // Arrange & Act
    render(
      <Item>
        <ItemMedia
          variant='image'
          data-testid='item-media-image'>
          <img
            src='/avatar.png'
            alt='Avatar'
          />
        </ItemMedia>
        <ItemContent>Content</ItemContent>
      </Item>,
    );

    // Assert
    const media = screen.getByTestId("item-media-image");
    expect(media).toHaveAttribute("data-variant", "image");
  });
});
