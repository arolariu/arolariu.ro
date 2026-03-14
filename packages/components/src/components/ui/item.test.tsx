import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemHeader, ItemMedia, ItemTitle} from "./item";

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
});
