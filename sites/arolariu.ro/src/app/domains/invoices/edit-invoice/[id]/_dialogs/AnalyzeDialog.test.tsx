// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import {DialogProvider, useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {act, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it, vi} from "vitest";
import messages from "../../../../../../../messages/en.json";
import {buildInvoice} from "../../../../../../../tests/helpers/builders/domain";
import {apiUrl, fetchAtHttp} from "../../../../../../../tests/setup/server-http";
import AnalyzeDialog from "./AnalyzeDialog";

const router = vi.hoisted(() => ({refresh: vi.fn<() => void>()}));
vi.mock("next/navigation", () => ({useRouter: () => router}));

const invoice = buildInvoice({id: "11111111-1111-4111-8111-111111111111", items: []});

function Trigger(): React.JSX.Element {
  const {openDialog} = useDialogs();
  return (
    <button
      type='button'
      onClick={() => openDialog("EDIT_INVOICE__ANALYSIS", "view", {invoice})}>
      Open analysis
    </button>
  );
}

async function openAnalysis() {
  const user = userEvent.setup();
  const {analyzeDialog, invoiceAnalysisControls, queuedAnalysisNotice} = messages.dialogs.invoices;
  render(
    <NextIntlClientProvider
      locale='en'
      messages={{dialogs: {invoices: {analyzeDialog, invoiceAnalysisControls, queuedAnalysisNotice}}, shared: messages.shared}}>
      <DialogProvider>
        <Trigger />
        <AnalyzeDialog />
      </DialogProvider>
    </NextIntlClientProvider>,
  );
  await user.click(screen.getByRole("button", {name: "Open analysis"}));
  return {user, dialog: within(screen.getByRole("dialog", {name: "Analyze Invoice"}))};
}

describe("AnalyzeDialog", () => {
  it("submits the selected profile and shows the real accepted request as queued, not complete", async () => {
    fetchAtHttp.mockResolvedValue(Response.json("queue-42", {status: 202}));
    const {user, dialog} = await openAnalysis();
    const defaultProfile = dialog.getByRole("radio", {name: "Comprehensive"});
    const balanced = dialog.getByRole("radio", {name: "Balanced"});
    expect(defaultProfile).toBeChecked();
    expect(dialog.queryByText("Analysis Queued")).not.toBeInTheDocument();

    await user.click(balanced);
    expect(balanced).toBeChecked();
    expect(defaultProfile).not.toBeChecked();

    await act(() => user.click(dialog.getByRole("button", {name: "Start Analysis"})));

    expect(await dialog.findByText("Analysis Queued")).toBeVisible();
    expect(dialog.getByText("queue-42")).toBeVisible();
    expect(dialog.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(dialog.queryByText(/complete|finished|analysis is done/iu)).not.toBeInTheDocument();
    expect(dialog.queryByRole("button", {name: "Start Analysis"})).not.toBeInTheDocument();
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoice.id}/analyze`,
      expect.objectContaining({method: "POST", body: '{"profile":"balanced"}'}),
    );
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("keeps a failed submission retryable and replaces the alert only after acceptance", async () => {
    fetchAtHttp
      .mockResolvedValueOnce(new Response("Backend unavailable", {status: 503, statusText: "Service Unavailable"}))
      .mockResolvedValueOnce(Response.json("queue-retry", {status: 202}));
    const {user, dialog} = await openAnalysis();

    await act(() => user.click(dialog.getByRole("button", {name: "Start Analysis"})));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Failed to analyze invoice: 503 Service Unavailable");
    expect(dialog.queryByText("Analysis Queued")).not.toBeInTheDocument();
    expect(dialog.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
    const retry = dialog.getByRole("button", {name: "Start Analysis"});
    expect(retry).toBeEnabled();

    await act(() => user.click(retry));

    expect(await dialog.findByText("queue-retry")).toBeVisible();
    expect(dialog.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchAtHttp).toHaveBeenCalledTimes(2);
  });

  it.each(["Cancel", "Escape"])("closes without submitting via %s", async (dismissal) => {
    const {user, dialog} = await openAnalysis();
    expect(dialog.getByRole("radio", {name: "Comprehensive"})).toBeChecked();

    if (dismissal === "Cancel") await user.click(dialog.getByRole("button", {name: "Cancel"}));
    else await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog", {name: "Analyze Invoice"})).not.toBeInTheDocument());
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });
});
