/**
 * @fileoverview Tests for the conditional next-steps sidebar card.
 * @module app/domains/invoices/upload-scans/_components/_sidebar/NextStepsCard.test
 */

import {render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";
import {useScanUpload} from "../../_context/ScanUploadContext";
import NextStepsCard from "./NextStepsCard";

vi.mock("../../_context/ScanUploadContext", () => ({useScanUpload: vi.fn()}));
vi.mock("motion/react", () => ({motion: {div: ({children}: {children: ReactNode}) => <div>{children}</div>}}));

function mockUpload(overrides: {totalCompleted: number; pendingCount: number}): void {
  vi.mocked(useScanUpload).mockReturnValue({
    pendingUploads: Array.from({length: overrides.pendingCount}, (_, i) => ({id: String(i)})),
    sessionStats: {totalAdded: 0, totalCompleted: overrides.totalCompleted, totalFailed: 0},
  } as unknown as ReturnType<typeof useScanUpload>);
}

describe("NextStepsCard", () => {
  it("renders when uploads have completed and the queue is empty", () => {
    mockUpload({totalCompleted: 2, pendingCount: 0});
    render(<NextStepsCard />);
    expect(screen.getByText(/sidebar\.nextSteps\.title/)).toBeInTheDocument();
  });

  it("links to the scans page with native link semantics", () => {
    mockUpload({totalCompleted: 2, pendingCount: 0});
    render(<NextStepsCard />);

    const link = screen.getByRole("link", {name: /sidebar\.nextSteps\.button/});
    expect(link).toHaveAttribute("href", "/domains/invoices/view-scans");
    expect(link).not.toHaveAttribute("role");
    expect(link).not.toHaveAttribute("type");
  });

  it("renders nothing while uploads are still pending", () => {
    mockUpload({totalCompleted: 2, pendingCount: 1});
    const {container} = render(<NextStepsCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
