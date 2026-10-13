import * as React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {CommandInput, CommandItem, CommandList} from "./command";
import {LegacyCommandDialog} from "./legacy-command-dialog";

describe("LegacyCommandDialog", () => {
  it("provides the automatic Command root for old direct compound children", () => {
    const onSelect = vi.fn();
    const ref = React.createRef<HTMLDivElement>();
    render(
      <LegacyCommandDialog
        open
        title='Legacy actions'
        description='Old direct children'
        ref={ref}
        className='custom-dialog'>
        <CommandInput aria-label='Search legacy commands' />
        <CommandList>
          <CommandItem onSelect={onSelect}>Apple</CommandItem>
        </CommandList>
      </LegacyCommandDialog>,
    );
    const dialog = screen.getByRole("dialog", {name: "Legacy actions", description: "Old direct children"});
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveClass("custom-dialog");
    expect(screen.getAllByRole("toolbar")).toHaveLength(1);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Apple"}).id);
    fireEvent.keyDown(screen.getByRole("combobox"), {key: "Enter"});
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("Apple");
  });

  it("forwards the opt-in close control and its dismissal request", () => {
    const onOpenChange = vi.fn();
    render(
      <LegacyCommandDialog
        open
        showCloseButton
        onOpenChange={onOpenChange}>
        <CommandList>
          <CommandItem>Apple</CommandItem>
        </CommandList>
      </LegacyCommandDialog>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Close"}));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({reason: "close-press"}));
  });

  it("preserves primitive cancellation of an uncontrolled close request", () => {
    render(
      <LegacyCommandDialog
        defaultOpen
        showCloseButton
        onOpenChange={(_open, details) => details.cancel()}>
        <CommandList>
          <CommandItem>Apple</CommandItem>
        </CommandList>
      </LegacyCommandDialog>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Close"}));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
