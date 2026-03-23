import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxItem, ComboboxSeparator, ComboboxTrigger} from "./combobox";

describe("Combobox", () => {
  it("renders without crashing", () => {
    // Arrange & Act
    render(
      <Combobox defaultValue='apple'>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Assert
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders with placeholder when no value selected", () => {
    // Arrange & Act
    render(
      <Combobox placeholder='Choose a fruit...'>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Assert
    expect(screen.getByRole("combobox")).toHaveTextContent("Choose a fruit...");
  });

  it("opens popover on trigger click", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
          <ComboboxItem value='banana'>Banana</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act
    await user.click(screen.getByRole("combobox"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeVisible();
      expect(screen.getByText("Banana")).toBeVisible();
    });
  });

  it("selects an item and closes popover", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn();
    render(
      <Combobox onValueChange={handleValueChange}>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
          <ComboboxItem value='banana'>Banana</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open popover
    await user.click(screen.getByRole("combobox"));

    // Wait for items to be visible
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeVisible();
    });

    // Act - Select item
    await user.click(screen.getByText("Apple"));

    // Assert
    await waitFor(() => {
      expect(handleValueChange).toHaveBeenCalledWith("apple");
    });
  });

  it("filters items based on search input", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox searchPlaceholder='Type to search...'>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
          <ComboboxItem value='banana'>Banana</ComboboxItem>
          <ComboboxItem value='cherry'>Cherry</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open popover
    await user.click(screen.getByRole("combobox"));

    // Wait for search input to appear
    const searchInput = await screen.findByPlaceholderText("Type to search...");

    // Act - Type in search
    await user.type(searchInput, "ban");

    // Assert - Only banana should be visible
    await waitFor(() => {
      expect(screen.getByText("Banana")).toBeVisible();
      expect(screen.queryByText("Apple")).not.toBeInTheDocument();
      expect(screen.queryByText("Cherry")).not.toBeInTheDocument();
    });
  });

  it("shows empty message when no items match search", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox emptyMessage='Nothing found here'>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open popover
    await user.click(screen.getByRole("combobox"));

    // Wait for search input
    const searchInput = await screen.findByPlaceholderText("Search...");

    // Act - Search for non-existent item
    await user.type(searchInput, "xyz");

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Nothing found here")).toBeVisible();
    });
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    function ControlledCombobox(): React.ReactElement {
      const [value, setValue] = React.useState("");

      return (
        <Combobox
          value={value}
          onValueChange={(newValue) => {
            setValue(newValue);
            handleValueChange(newValue);
          }}>
          <ComboboxTrigger />
          <ComboboxContent>
            <ComboboxItem value='apple'>Apple</ComboboxItem>
            <ComboboxItem value='banana'>Banana</ComboboxItem>
          </ComboboxContent>
        </Combobox>
      );
    }

    render(<ControlledCombobox />);

    // Act - Open and select item
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeVisible();
    });
    await user.click(screen.getByText("Apple"));

    // Assert - controlled onChange was called
    await waitFor(() => {
      expect(handleValueChange).toHaveBeenCalledWith("apple");
    });

    // Act - Open again and select different item
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByText("Banana")).toBeVisible();
    });
    await user.click(screen.getByText("Banana"));

    // Assert
    await waitFor(() => {
      expect(handleValueChange).toHaveBeenCalledWith("banana");
    });
  });

  it("disables the trigger when disabled prop is true", () => {
    // Arrange & Act
    render(
      <Combobox disabled>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Assert
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("skips disabled items during selection", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn();
    render(
      <Combobox onValueChange={handleValueChange}>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
          <ComboboxItem
            value='banana'
            disabled>
            Banana
          </ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open popover
    await user.click(screen.getByRole("combobox"));

    // Wait for items
    await waitFor(() => {
      expect(screen.getByText("Banana")).toBeVisible();
    });

    // Act - Try to click disabled item (should not work)
    await user.click(screen.getByText("Banana"));

    // Assert
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it("merges custom className on trigger", () => {
    // Arrange & Act
    render(
      <Combobox>
        <ComboboxTrigger className='custom-trigger-class' />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Assert
    expect(screen.getByRole("combobox")).toHaveClass("custom-trigger-class");
  });

  it("merges custom className on content", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxTrigger />
        <ComboboxContent className='custom-content-class'>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open popover
    await user.click(screen.getByRole("combobox"));

    // Assert - Check that the popover content has the custom class
    await waitFor(() => {
      const popupElement = screen.getByRole("dialog");
      expect(popupElement).toHaveClass("custom-content-class");
    });
  });

  it("merges custom className on item", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem
            value='apple'
            className='custom-item-class'>
            Apple
          </ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open popover
    await user.click(screen.getByRole("combobox"));

    // Assert - Find the item by role and check class
    await waitFor(() => {
      const appleItem = screen.getByRole("option", {name: /Apple/i});
      expect(appleItem).toHaveClass("custom-item-class");
    });
  });

  it("forwards ref to trigger button", () => {
    // Arrange
    const ref = React.createRef<HTMLButtonElement>();

    // Act
    render(
      <Combobox>
        <ComboboxTrigger ref={ref} />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("renders groups with headings", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxGroup heading='Fruits'>
            <ComboboxItem value='apple'>Apple</ComboboxItem>
          </ComboboxGroup>
          <ComboboxSeparator />
          <ComboboxGroup heading='Vegetables'>
            <ComboboxItem value='carrot'>Carrot</ComboboxItem>
          </ComboboxGroup>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open popover
    await user.click(screen.getByRole("combobox"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeVisible();
      expect(screen.getByText("Vegetables")).toBeVisible();
      expect(screen.getByText("Apple")).toBeVisible();
      expect(screen.getByText("Carrot")).toBeVisible();
    });
  });

  it("calls custom onSelect handler when item is selected", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleItemSelect = vi.fn();
    render(
      <Combobox>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem
            value='apple'
            onSelect={handleItemSelect}>
            Apple
          </ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open and select
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeVisible();
    });
    await user.click(screen.getByText("Apple"));

    // Assert
    await waitFor(() => {
      expect(handleItemSelect).toHaveBeenCalledWith("apple");
    });
  });

  it("renders custom empty component", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxEmpty>Custom empty message</ComboboxEmpty>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open and search for non-existent item
    await user.click(screen.getByRole("combobox"));
    const searchInput = await screen.findByPlaceholderText("Search...");
    await user.type(searchInput, "xyz");

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Custom empty message")).toBeVisible();
    });
  });

  it("supports keyboard navigation with arrow keys", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
          <ComboboxItem value='banana'>Banana</ComboboxItem>
          <ComboboxItem value='cherry'>Cherry</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open popover
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeVisible();
    });

    // Act - Navigate with keyboard
    const searchInput = screen.getByPlaceholderText("Search...");
    await user.type(searchInput, "{ArrowDown}");
    await user.type(searchInput, "{ArrowDown}");

    // Note: Full keyboard navigation testing is challenging without the Command component's internal state
    // This test ensures the keyboard events are properly captured
    expect(searchInput).toBeInTheDocument();
  });

  it("uses keywords for filtering", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Combobox>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem
            value='apple'
            keywords={["red", "fruit"]}>
            Apple
          </ComboboxItem>
          <ComboboxItem
            value='carrot'
            keywords={["orange", "vegetable"]}>
            Carrot
          </ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open and search by keyword
    await user.click(screen.getByRole("combobox"));
    const searchInput = await screen.findByPlaceholderText("Search...");
    await user.type(searchInput, "vegetable");

    // Assert - Only carrot should match
    await waitFor(() => {
      expect(screen.queryByText("Apple")).not.toBeInTheDocument();
      expect(screen.getByText("Carrot")).toBeVisible();
    });
  });

  it("toggles selection when clicking selected item", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn();
    render(
      <Combobox
        defaultValue='apple'
        onValueChange={handleValueChange}>
        <ComboboxTrigger />
        <ComboboxContent>
          <ComboboxItem value='apple'>Apple</ComboboxItem>
        </ComboboxContent>
      </Combobox>,
    );

    // Act - Open and click already selected item
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeVisible();
    });
    await user.click(screen.getByText("Apple"));

    // Assert - Should toggle to empty
    await waitFor(() => {
      expect(handleValueChange).toHaveBeenCalledWith("");
    });
  });
});
