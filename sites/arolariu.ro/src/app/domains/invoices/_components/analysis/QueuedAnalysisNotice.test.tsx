/**
 * @fileoverview Unit tests for QueuedAnalysisNotice component.
 * @module app/domains/invoices/_components/analysis/QueuedAnalysisNotice.test
 *
 * @remarks
 * TDD suite that verifies:
 * 1. The component renders the queued state and a refresh control.
 * 2. Clicking the refresh button calls onRefresh.
 * 3. The component renders NO completion language (complete/finished/done/success).
 * 4. The component renders no role="progressbar" element.
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import QueuedAnalysisNotice from "./QueuedAnalysisNotice";

describe("QueuedAnalysisNotice", () => {
  // ── 1. Renders queued state and refresh control ─────────────────────────────

  it("renders the queued state title", () => {
    render(
      <QueuedAnalysisNotice
        messageId='test-msg-123'
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText(/queuedAnalysisNotice\.title/i)).toBeInTheDocument();
  });

  it("renders a refresh button", () => {
    render(
      <QueuedAnalysisNotice
        messageId='test-msg-123'
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", {name: /refreshButton/i})).toBeInTheDocument();
  });

  // ── 2. Refresh button calls onRefresh ───────────────────────────────────────

  it("calls onRefresh when the refresh button is clicked", async () => {
    const onRefresh = vi.fn();
    render(
      <QueuedAnalysisNotice
        messageId='test-msg-123'
        onRefresh={onRefresh}
      />,
    );

    await userEvent.click(screen.getByRole("button", {name: /refreshButton/i}));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  // ── 3. No completion language ───────────────────────────────────────────────

  it("renders NO completion language", () => {
    render(
      <QueuedAnalysisNotice
        messageId='test-msg-123'
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByText(/complete|finished|done|success/i)).not.toBeInTheDocument();
  });

  // ── 4. No progressbar role ──────────────────────────────────────────────────

  it("renders no role=progressbar element", () => {
    render(
      <QueuedAnalysisNotice
        messageId='test-msg-123'
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  // ── 5. Renders even with null messageId ────────────────────────────────────

  it("renders without error when messageId is null", () => {
    render(
      <QueuedAnalysisNotice
        messageId={null}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", {name: /refreshButton/i})).toBeInTheDocument();
  });
});
