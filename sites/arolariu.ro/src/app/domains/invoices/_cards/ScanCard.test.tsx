import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";
import ScanCard from "./ScanCard";

describe("ScanCard", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when the card unmounts.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

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

  const media = {src: "blob:document", mediaKind: "pdf", alt: "Receipt.pdf"} as const;

  function buildRename(overrides: Partial<{isEditing: boolean; onStart: (() => void) | undefined}> = {}) {
    return {
      value: "Receipt",
      isEditing: true,
      onChange: vi.fn(),
      onCommit: vi.fn(),
      onCancel: vi.fn(),
      placeholder: "Scan name",
      ...overrides,
    };
  }

  describe("rename editing", () => {
    it("shows the rename input with save and cancel instead of the title", () => {
      const rename = buildRename();
      render(
        <ScanCard
          media={media}
          title='Receipt.pdf'
          rename={rename}
        />,
      );

      expect(screen.getByPlaceholderText("Scan name")).toHaveValue("Receipt");
      expect(screen.getByRole("button", {name: "Save rename"})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Cancel rename"})).toBeInTheDocument();
      expect(screen.queryByTitle("Receipt.pdf")).not.toBeInTheDocument();
    });

    it("forwards typed text to onChange", async () => {
      const user = userEvent.setup();
      const rename = buildRename();
      render(
        <ScanCard
          media={media}
          title='Receipt.pdf'
          rename={rename}
        />,
      );

      await user.type(screen.getByPlaceholderText("Scan name"), "X");

      expect(rename.onChange).toHaveBeenCalledWith("ReceiptX");
    });

    it("commits on Enter, cancels on Escape and ignores other keys", () => {
      const rename = buildRename();
      render(
        <ScanCard
          media={media}
          title='Receipt.pdf'
          rename={rename}
        />,
      );
      const input = screen.getByPlaceholderText("Scan name");

      fireEvent.keyDown(input, {key: "a"});
      expect(rename.onCommit).not.toHaveBeenCalled();
      expect(rename.onCancel).not.toHaveBeenCalled();

      fireEvent.keyDown(input, {key: "Enter"});
      expect(rename.onCommit).toHaveBeenCalledTimes(1);
      expect(rename.onCancel).not.toHaveBeenCalled();

      fireEvent.keyDown(input, {key: "Escape"});
      expect(rename.onCancel).toHaveBeenCalledTimes(1);
      expect(rename.onCommit).toHaveBeenCalledTimes(1);
    });

    it("cancels when the input blurs", async () => {
      const user = userEvent.setup();
      const rename = buildRename();
      render(
        <ScanCard
          media={media}
          title='Receipt.pdf'
          rename={rename}
        />,
      );

      await user.click(screen.getByPlaceholderText("Scan name"));
      expect(rename.onCancel).not.toHaveBeenCalled();
      await user.tab();

      expect(rename.onCancel).toHaveBeenCalledTimes(1);
      expect(rename.onCommit).not.toHaveBeenCalled();
    });

    it("commits and cancels from the save and cancel buttons", () => {
      const rename = buildRename();
      render(
        <ScanCard
          media={media}
          title='Receipt.pdf'
          rename={rename}
        />,
      );

      fireEvent.mouseDown(screen.getByRole("button", {name: "Save rename"}));
      expect(rename.onCommit).toHaveBeenCalledTimes(1);
      expect(rename.onCancel).not.toHaveBeenCalled();

      fireEvent.mouseDown(screen.getByRole("button", {name: "Cancel rename"}));
      expect(rename.onCancel).toHaveBeenCalledTimes(1);
      expect(rename.onCommit).toHaveBeenCalledTimes(1);
    });

    it("starts renaming from the rename button and on title double click when not editing", async () => {
      const user = userEvent.setup();
      const onStart = vi.fn();
      render(
        <ScanCard
          media={media}
          title='Receipt.pdf'
          rename={buildRename({isEditing: false, onStart})}
        />,
      );

      await user.click(screen.getByRole("button", {name: "Rename scan"}));
      expect(onStart).toHaveBeenCalledTimes(1);
      await user.dblClick(screen.getByText("Receipt.pdf"));
      expect(onStart).toHaveBeenCalledTimes(2);
    });

    it("omits the rename button when no onStart is provided", () => {
      render(
        <ScanCard
          media={media}
          title='Receipt.pdf'
          rename={buildRename({isEditing: false})}
        />,
      );

      expect(screen.getByText("Receipt.pdf")).toBeInTheDocument();
      expect(screen.queryByRole("button", {name: "Rename scan"})).not.toBeInTheDocument();
    });
  });

  it("toggles the selection checkbox", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ScanCard
        media={media}
        title='Receipt.pdf'
        selection={{checked: false, onToggle, label: "Select Receipt"}}
      />,
    );

    await user.click(screen.getByRole("checkbox", {name: "Select Receipt"}));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("activates the preview on click only when onPreviewActivate is provided", async () => {
    const user = userEvent.setup();
    const onPreviewActivate = vi.fn();
    const {unmount} = render(
      <ScanCard
        media={{...media, onPreviewActivate}}
        title='Receipt.pdf'
      />,
    );

    await user.click(screen.getByRole("button", {name: "Receipt.pdf"}));
    expect(onPreviewActivate).toHaveBeenCalledTimes(1);
    unmount();

    render(
      <ScanCard
        media={media}
        title='Receipt.pdf'
      />,
    );
    expect(screen.queryByRole("button", {name: "Receipt.pdf"})).not.toBeInTheDocument();
  });

  it("renders clamped progress and error text only when provided", () => {
    const {unmount} = render(
      <ScanCard
        media={media}
        title='Receipt.pdf'
      />,
    );
    expect(screen.queryByText("Uploading 150%")).not.toBeInTheDocument();
    expect(screen.queryByText("Upload failed")).not.toBeInTheDocument();
    unmount();

    render(
      <ScanCard
        media={media}
        title='Receipt.pdf'
        progress={{value: 150, label: "Uploading 150%"}}
        error='Upload failed'
      />,
    );

    expect(screen.getByText("Uploading 150%")).toBeInTheDocument();
    expect(screen.getByText("Uploading 150%").previousElementSibling?.firstElementChild).toHaveStyle({width: "100%"});
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });
});
