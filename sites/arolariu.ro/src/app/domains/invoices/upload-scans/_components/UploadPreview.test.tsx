/**
 * @fileoverview Smoke test for the pending uploads preview grid.
 * @module app/domains/invoices/upload-scans/_components/UploadPreview.test
 */

import {act, fireEvent, render, screen} from "@testing-library/react";
import type {ComponentProps, ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type ScanCard from "../../_cards/ScanCard";
import {useScanUpload} from "../_context/ScanUploadContext";
import type {PendingUpload} from "../_types";
import UploadPreview from "./UploadPreview";

type CardProps = ComponentProps<typeof ScanCard>;

const {cards, mobileState} = vi.hoisted(() => ({
  cards: new Map<string, unknown>(),
  mobileState: {value: false},
}));

vi.mock("../_context/ScanUploadContext", () => ({useScanUpload: vi.fn()}));
vi.mock("../../_cards/ScanCard", () => ({
  default: (props: {title: string}) => {
    cards.set(props.title, props);
    return <div data-testid='scan-card'>{props.title}</div>;
  },
}));
vi.mock("../../_components/StaggerContainer", () => ({
  StaggerContainer: ({children}: {children: ReactNode}) => <div>{children}</div>,
  StaggerItem: ({children}: {children: ReactNode}) => <div>{children}</div>,
}));
vi.mock("@arolariu/components", () => ({
  Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
  Button: ({children, onClick, disabled}: {children: ReactNode; onClick?: () => void; disabled?: boolean}) => (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}>
      {children}
    </button>
  ),
  useIsMobile: () => mobileState.value,
}));

function upload(id: string, overrides: Partial<PendingUpload> = {}): PendingUpload {
  return {
    id,
    name: `${id}.jpg`,
    file: null,
    mimeType: "image/jpeg",
    size: 4,
    preview: `blob:${id}`,
    status: "idle",
    progress: 0,
    attempts: 0,
    ...overrides,
  };
}

function card(title: string): CardProps {
  const props = cards.get(title);
  if (!props) {
    throw new Error(`No card rendered for ${title}`);
  }
  return props as CardProps;
}

function mockContext(pendingUploads: PendingUpload[]) {
  const actions = {removeFiles: vi.fn(), renameFile: vi.fn(), rotateFile: vi.fn()};
  vi.mocked(useScanUpload).mockReturnValue({pendingUploads, ...actions} as unknown as ReturnType<typeof useScanUpload>);
  return actions;
}

describe("UploadPreview", () => {
  beforeEach(() => {
    cards.clear();
    mobileState.value = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders one card per pending upload and no pagination below the page size", () => {
    mockContext([upload("a"), upload("b"), upload("c")]);

    render(<UploadPreview />);

    expect(screen.getAllByTestId("scan-card")).toHaveLength(3);
    expect(screen.queryByText(/pagination\.pageInfo/)).toBeNull();
  });

  it("renders nothing when the queue is empty", () => {
    mockContext([]);

    const {container} = render(<UploadPreview />);

    expect(container).toBeEmptyDOMElement();
  });

  it("paginates after 7 items on mobile and navigates between pages", () => {
    mobileState.value = true;
    mockContext(Array.from({length: 8}, (_, i) => upload(`u${i}`)));

    render(<UploadPreview />);

    expect(screen.getAllByTestId("scan-card")).toHaveLength(7);
    const previous = screen.getByRole("button", {name: /pagination\.previous/});
    const next = screen.getByRole("button", {name: /pagination\.next/});
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);

    expect(screen.getAllByTestId("scan-card")).toHaveLength(1);
    expect(screen.getByText("u7.jpg")).toBeInTheDocument();
    expect(next).toBeDisabled();
    expect(previous).toBeEnabled();

    fireEvent.click(previous);

    expect(screen.getAllByTestId("scan-card")).toHaveLength(7);
    expect(screen.queryByText("u7.jpg")).toBeNull();
  });

  it("keeps 8 items on a single page on desktop", () => {
    mockContext(Array.from({length: 8}, (_, i) => upload(`u${i}`)));

    render(<UploadPreview />);

    expect(screen.getAllByTestId("scan-card")).toHaveLength(8);
    expect(screen.queryByRole("button", {name: /pagination\.next/})).toBeNull();
  });

  it("paginates after 50 items on desktop", () => {
    mockContext(Array.from({length: 51}, (_, i) => upload(`u${i}`)));

    render(<UploadPreview />);

    expect(screen.getAllByTestId("scan-card")).toHaveLength(50);
    expect(screen.getByRole("button", {name: /pagination\.next/})).toBeEnabled();
  });

  it("resolves the media source and kind per upload", () => {
    mockContext([
      upload("pdf", {mimeType: "application/pdf"}),
      upload("preview"),
      upload("blob", {preview: "", blobUrl: "blob:remote"}),
      upload("none", {preview: ""}),
    ]);

    render(<UploadPreview />);

    expect(card("pdf.jpg").media).toMatchObject({mediaKind: "pdf", src: "blob:pdf"});
    expect(card("preview.jpg").media).toMatchObject({mediaKind: "image", src: "blob:preview"});
    expect(card("blob.jpg").media).toMatchObject({mediaKind: "image", src: "blob:remote"});
    expect(card("none.jpg").media).toMatchObject({mediaKind: "image", src: ""});
  });

  it("shows the progress bar only while uploading or retrying and locks every non-idle, non-failed card", () => {
    mockContext([
      upload("idle"),
      upload("up", {status: "uploading", progress: 40}),
      upload("retry", {status: "retrying", progress: 10, attempts: 2}),
      upload("done", {status: "completed"}),
      upload("bad", {status: "failed", error: "boom"}),
    ]);

    render(<UploadPreview />);

    expect(card("idle.jpg").progress).toBeUndefined();
    expect(card("idle.jpg").centerOverlay).toBeUndefined();
    expect(card("idle.jpg").isLocked).toBe(false);
    expect(card("up.jpg").progress).toEqual({value: 40, label: "40%"});
    expect(card("up.jpg").centerOverlay).toBeDefined();
    expect(card("up.jpg").isLocked).toBe(true);
    expect(card("up.jpg").error).toBeUndefined();
    expect(card("retry.jpg").progress).toEqual({value: 10, label: "10%"});
    expect(card("retry.jpg").centerOverlay).toBeDefined();
    expect(card("retry.jpg").isLocked).toBe(true);
    expect(card("done.jpg").progress).toBeUndefined();
    expect(card("done.jpg").centerOverlay).toBeDefined();
    expect(card("done.jpg").isLocked).toBe(true);
    expect(card("bad.jpg").progress).toBeUndefined();
    expect(card("bad.jpg").centerOverlay).toBeDefined();
    expect(card("bad.jpg").isLocked).toBe(false);
  });

  it("shows the retry attempt text while retrying and the upload error otherwise", () => {
    mockContext([upload("retry", {status: "retrying", attempts: 2, error: "ignored"}), upload("bad", {status: "failed", error: "boom"})]);

    render(<UploadPreview />);

    expect(card("retry.jpg").error).toContain("retryAttempt");
    expect(card("retry.jpg").error).not.toContain("ignored");
    expect(card("bad.jpg").error).toBe("boom");
  });

  it("renames an upload through start, change and commit", () => {
    const {renameFile} = mockContext([upload("a")]);
    render(<UploadPreview />);
    expect(card("a.jpg").rename?.isEditing).toBe(false);

    act(() => card("a.jpg").rename?.onStart?.());
    expect(card("a.jpg").rename).toMatchObject({isEditing: true, value: "a.jpg"});

    act(() => card("a.jpg").rename?.onChange("  new.jpg  "));
    expect(card("a.jpg").rename?.value).toBe("  new.jpg  ");

    act(() => card("a.jpg").rename?.onCommit());

    expect(renameFile).toHaveBeenCalledTimes(1);
    expect(renameFile).toHaveBeenCalledWith("a", "new.jpg");
    expect(card("a.jpg").rename?.isEditing).toBe(false);
  });

  it("does not rename when the draft is empty or unchanged", () => {
    const {renameFile} = mockContext([upload("a")]);
    render(<UploadPreview />);

    act(() => card("a.jpg").rename?.onStart?.());
    act(() => card("a.jpg").rename?.onChange("   "));
    act(() => card("a.jpg").rename?.onCommit());

    expect(renameFile).not.toHaveBeenCalled();
    expect(card("a.jpg").rename?.isEditing).toBe(false);

    act(() => card("a.jpg").rename?.onStart?.());
    act(() => card("a.jpg").rename?.onCommit());

    expect(renameFile).not.toHaveBeenCalled();
    expect(card("a.jpg").rename?.isEditing).toBe(false);
  });

  it("cancels renaming and discards the draft", () => {
    const {renameFile} = mockContext([upload("a")]);
    render(<UploadPreview />);

    act(() => card("a.jpg").rename?.onStart?.());
    act(() => card("a.jpg").rename?.onChange("draft.jpg"));
    act(() => card("a.jpg").rename?.onCancel());

    expect(card("a.jpg").rename).toMatchObject({isEditing: false, value: "a.jpg"});
    expect(renameFile).not.toHaveBeenCalled();
  });

  it("wires rotate and remove actions to the upload context", () => {
    const {rotateFile, removeFiles} = mockContext([upload("a"), upload("p", {mimeType: "application/pdf"})]);
    render(<UploadPreview />);

    const actions = card("a.jpg").actions ?? [];
    expect(actions.map((a) => a.key)).toEqual(["rotate-cw", "rotate-ccw", "remove"]);
    expect(actions[0]?.disabled).toBe(false);
    expect(card("p.jpg").actions?.[0]?.disabled).toBe(true);

    actions[0]?.onSelect();
    actions[1]?.onSelect();
    expect(rotateFile).toHaveBeenNthCalledWith(1, "a", "cw");
    expect(rotateFile).toHaveBeenNthCalledWith(2, "a", "ccw");
    expect(removeFiles).not.toHaveBeenCalled();

    actions[2]?.onSelect();
    expect(removeFiles).toHaveBeenCalledTimes(1);
    expect(removeFiles).toHaveBeenCalledWith(["a"]);
  });
});
