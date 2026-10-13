import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {ScanMediaPreview} from "./ScanMediaPreview";

describe("ScanMediaPreview", () => {
  it("activates the preview on click, Enter and Space, but not unrelated keys", () => {
    const activate = vi.fn();
    render(
      <ScanMediaPreview
        src='blob:receipt'
        mediaKind='image'
        alt='Receipt preview'
        onPreviewActivate={activate}
      />,
    );
    const preview = screen.getByRole("button", {name: "Receipt preview"});

    fireEvent.click(preview);
    fireEvent.keyDown(preview, {key: "Enter"});
    fireEvent.keyDown(preview, {key: " "});
    fireEvent.keyDown(preview, {key: "ArrowRight"});

    expect(activate).toHaveBeenCalledTimes(3);
    expect(preview).toHaveAttribute("tabindex", "0");
  });

  it("keeps a noninteractive preview outside the tab order", () => {
    const {container} = render(
      <ScanMediaPreview
        src=''
        mediaKind='unknown'
        alt='Unavailable scan'
      />,
    );

    expect(container.firstElementChild).toHaveAttribute("role", "img");
    expect(container.firstElementChild).not.toHaveAttribute("tabindex");
    expect(screen.getByText("No preview")).toBeInTheDocument();
  });

  it("shows the PDF placeholder and retains overlay controls without activating the preview", () => {
    const activate = vi.fn();
    const select = vi.fn();
    render(
      <ScanMediaPreview
        src='blob:document'
        mediaKind='pdf'
        alt='Document preview'
        onPreviewActivate={activate}
        topLeftOverlay={
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              select();
            }}>
            Select scan
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByRole("button", {name: "Select scan"}));

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(select).toHaveBeenCalledOnce();
    expect(activate).not.toHaveBeenCalled();
  });
});
