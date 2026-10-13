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

  it("preserves every overlay slot and explicit image loading behavior", () => {
    const {container, rerender} = render(
      <ScanMediaPreview
        src='blob:receipt'
        mediaKind='image'
        alt='Receipt'
        loading='eager'
        topLeftOverlay={<span>Selection</span>}
        topRightOverlay={<span>Actions</span>}
        bottomLeftOverlay={<span>Status</span>}
        bottomRightOverlay={<span>Linked invoice</span>}
        centerOverlay={<span>Processing</span>}
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute("src", "blob:receipt");
    expect(container.querySelector("img")).toHaveAttribute("loading", "eager");
    for (const label of ["Selection", "Actions", "Status", "Linked invoice", "Processing"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    rerender(
      <ScanMediaPreview
        src='blob:receipt'
        mediaKind='image'
        alt='Receipt'
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
    for (const label of ["Selection", "Actions", "Status", "Linked invoice", "Processing"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it.each([
    ["", "image"],
    ["", "pdf"],
    ["blob:unknown", "unknown"],
  ] as const)("shows a missing preview for source %s and media kind %s", (src, mediaKind) => {
    render(
      <ScanMediaPreview
        src={src}
        mediaKind={mediaKind}
        alt='Unavailable scan'
      />,
    );

    expect(screen.getByText("No preview")).toBeInTheDocument();
    expect(screen.queryByText("PDF")).not.toBeInTheDocument();
  });
});
