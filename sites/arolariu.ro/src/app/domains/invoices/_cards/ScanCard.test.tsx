import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import ScanCard from "./ScanCard";

describe("ScanCard", () => {
  it("keeps a disabled action inert when clicked while enabled actions still run", async () => {
    // Arrange
    const user = userEvent.setup();
    const rotate = vi.fn();
    const remove = vi.fn();
    render(
      <ScanCard
        media={{src: "blob:document", mediaKind: "pdf", alt: "Receipt.pdf"}}
        title='Receipt.pdf'
        actions={[
          {key: "rotate-cw", label: "Rotate 90° Clockwise", onSelect: rotate, disabled: true},
          {key: "remove", label: "Remove this file", onSelect: remove, destructive: true},
        ]}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "Open scan actions"}));
    const rotateItem = await screen.findByRole("menuitem", {name: "Rotate 90° Clockwise"});
    await user.click(rotateItem);

    // Assert
    expect(rotateItem).toHaveAttribute("aria-disabled", "true");
    expect(rotate).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", {name: "Remove this file"}));

    expect(remove).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});
