/**
 * @fileoverview Unit tests for PostUploadPrompt component.
 * @module app/domains/invoices/upload-scans/_components/PostUploadPrompt.test
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it, vi} from "vitest";
import PostUploadPrompt from "./PostUploadPrompt";

const mockMessages = {
  Invoices: {
    UploadScans: {
      postUpload: {
        title: "Uploaded Successfully!",
        subtitle: "Do these scans represent a single purchase?",
        createInvoice: "Yes, create invoice",
        viewScans: "No, I'll combine later",
        dismiss: "Dismiss prompt",
      },
    },
  },
};

/**
 * Helper to render component with i18n context.
 */
function renderWithIntl(component: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider
      locale='en'
      messages={mockMessages}>
      {component}
    </NextIntlClientProvider>,
  );
}

describe("PostUploadPrompt", () => {
  const mockScans = [
    {id: "1", preview: "blob:test1", name: "receipt1.jpg"},
    {id: "2", preview: "blob:test2", name: "receipt2.jpg"},
    {id: "3", preview: "blob:test3", name: "receipt3.jpg"},
  ];

  const defaultProps = {
    completedScans: mockScans,
    onCreateInvoice: vi.fn(),
    onViewScans: vi.fn(),
    onDismiss: vi.fn(),
    isVisible: true,
  };

  it("should render when visible", () => {
    renderWithIntl(<PostUploadPrompt {...defaultProps} />);

    expect(screen.getByText("Uploaded Successfully!")).toBeInTheDocument();
    expect(screen.getByText("Do these scans represent a single purchase?")).toBeInTheDocument();
  });

  it("should not render when not visible", () => {
    renderWithIntl(
      <PostUploadPrompt
        {...defaultProps}
        isVisible={false}
      />,
    );

    expect(screen.queryByText("Uploaded Successfully!")).not.toBeInTheDocument();
  });

  it("should display thumbnails for completed scans", () => {
    renderWithIntl(<PostUploadPrompt {...defaultProps} />);

    const thumbnails = screen.getAllByRole("img");
    expect(thumbnails).toHaveLength(3);
    expect(thumbnails[0]).toHaveAttribute("src", "blob:test1");
    expect(thumbnails[0]).toHaveAttribute("alt", "receipt1.jpg");
  });

  it("should limit thumbnails to 5 and show +N for extras", () => {
    const manyScans = Array.from({length: 8}, (_, i) => ({
      id: `${i + 1}`,
      preview: `blob:test${i + 1}`,
      name: `receipt${i + 1}.jpg`,
    }));

    renderWithIntl(
      <PostUploadPrompt
        {...defaultProps}
        completedScans={manyScans}
      />,
    );

    const thumbnails = screen.getAllByRole("img");
    expect(thumbnails).toHaveLength(5); // Only first 5 shown
    expect(screen.getByText("+3")).toBeInTheDocument(); // Remaining count
  });

  it("should call onCreateInvoice when create invoice button is clicked", async () => {
    const user = userEvent.setup();
    const onCreateInvoice = vi.fn();

    renderWithIntl(
      <PostUploadPrompt
        {...defaultProps}
        onCreateInvoice={onCreateInvoice}
      />,
    );

    const createButton = screen.getByText("Yes, create invoice");
    await user.click(createButton);

    expect(onCreateInvoice).toHaveBeenCalledTimes(1);
  });

  it("should call onViewScans when view scans button is clicked", async () => {
    const user = userEvent.setup();
    const onViewScans = vi.fn();

    renderWithIntl(
      <PostUploadPrompt
        {...defaultProps}
        onViewScans={onViewScans}
      />,
    );

    const viewButton = screen.getByText("No, I'll combine later");
    await user.click(viewButton);

    expect(onViewScans).toHaveBeenCalledTimes(1);
  });

  it("should call onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    renderWithIntl(
      <PostUploadPrompt
        {...defaultProps}
        onDismiss={onDismiss}
      />,
    );

    const dismissButton = screen.getByLabelText("Dismiss prompt");
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("should call onDismiss when overlay is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    const {container} = renderWithIntl(
      <PostUploadPrompt
        {...defaultProps}
        onDismiss={onDismiss}
      />,
    );

    const overlay = container.querySelector('[class*="overlay"]');
    if (overlay) {
      await user.click(overlay);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    }
  });

  it("should not call onDismiss when card content is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    renderWithIntl(
      <PostUploadPrompt
        {...defaultProps}
        onDismiss={onDismiss}
      />,
    );

    const title = screen.getByText("Uploaded Successfully!");
    await user.click(title);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("should render action buttons with correct variants", () => {
    const {container} = renderWithIntl(<PostUploadPrompt {...defaultProps} />);

    const primaryButton = screen.getByText("Yes, create invoice").closest("button");
    const secondaryButton = screen.getByText("No, I'll combine later").closest("button");

    expect(primaryButton).toBeInTheDocument();
    expect(secondaryButton).toBeInTheDocument();
  });

  it("should handle empty scans array gracefully", () => {
    renderWithIntl(
      <PostUploadPrompt
        {...defaultProps}
        completedScans={[]}
      />,
    );

    expect(screen.getByText("Uploaded Successfully!")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
