/**
 * @fileoverview Unit tests for the bulk actions toolbar shown for selected invoices.
 * @module app/domains/invoices/view-invoices/_components/BulkActionsToolbar.test
 *
 * @remarks
 * The real IndexedDB-persisted invoices store (backed by `fake-indexeddb`), the real invoice
 * `DialogProvider`, the real `useInvoiceDelete` hook, and the real `deleteInvoice` server action run
 * unmodified. Only the backend HTTP call (`fetchWithTimeout`) and the Clerk-backed identity lookup
 * (`fetchBFFUserFromAuthService`) are stubbed through the Vitest aliases.
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {act, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {buildInvoice} from "../../../../../../tests/helpers/invoiceDomain";
import {DialogProvider, useDialogs} from "../../_contexts/DialogContext";
import BulkActionsToolbar from "./BulkActionsToolbar";

type BackendResponse = Awaited<ReturnType<typeof fetchWithTimeout>>;

const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

const B = "pages.invoices.viewInvoices.bulkActions";
const CLEAR = `${B}.clearSelection`;
const EXPORT = `${B}.export`;
const DELETE = `${B}.delete`;
const CONFIRM = `${B}.deleteConfirm.confirm`;
const CANCEL = `${B}.deleteConfirm.cancel`;

const firstInvoice: Invoice = buildInvoice({id: "11111111-1111-4111-8111-111111111111", name: "First"});
const secondInvoice: Invoice = buildInvoice({id: "22222222-2222-4222-8222-222222222222", name: "Second"});

/** Surfaces the dialog the real provider currently has open, so the export action is observable. */
function OpenDialogProbe(): React.JSX.Element {
  const {currentDialog} = useDialogs();
  return <output aria-label='open dialog'>{currentDialog.type ?? "none"}</output>;
}

function renderToolbar(): ReturnType<typeof render> {
  return render(
    <DialogProvider>
      <BulkActionsToolbar />
      <OpenDialogProbe />
    </DialogProvider>,
  );
}

function seedStore(entities: Invoice[], selectedEntities: Invoice[]): void {
  act(() => {
    useInvoicesStore.setState({entities, selectedEntities, hasHydrated: true});
  });
}

function selectedIds(): string[] {
  return useInvoicesStore.getState().selectedEntities.map((invoice) => invoice.id);
}

function entityIds(): string[] {
  return useInvoicesStore.getState().entities.map((invoice) => invoice.id);
}

function deletedResponse(): BackendResponse {
  return TestDataBuilder.noContentResponse() as BackendResponse;
}

function serverErrorResponse(): BackendResponse {
  return TestDataBuilder.textResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as BackendResponse;
}

async function openDeleteConfirmation(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", {name: DELETE}));
  return screen.findByRole("alertdialog");
}

describe("BulkActionsToolbar", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when motion components unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    await act(async () => {
      await useInvoicesStore.persist.rehydrate();
    });
    seedStore([firstInvoice, secondInvoice], [firstInvoice, secondInvoice]);
  });

  it("renders nothing when no invoices are selected", () => {
    seedStore([firstInvoice, secondInvoice], []);

    renderToolbar();

    expect(screen.queryByText(`${B}.selected`)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: CLEAR})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: EXPORT})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: DELETE})).not.toBeInTheDocument();
  });

  it("shows the selection summary and the clear, export, and delete actions when invoices are selected", () => {
    renderToolbar();

    expect(screen.getByText(`${B}.selected`)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: CLEAR})).toBeEnabled();
    expect(screen.getByRole("button", {name: EXPORT})).toBeEnabled();
    expect(screen.getByRole("button", {name: DELETE})).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("clears the selection and hides itself when the clear action is used", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", {name: CLEAR}));

    expect(selectedIds()).toEqual([]);
    expect(entityIds()).toEqual([firstInvoice.id, secondInvoice.id]);
    expect(screen.queryByRole("button", {name: EXPORT})).not.toBeInTheDocument();
  });

  it("opens the view-invoices export dialog without changing the selection", async () => {
    const user = userEvent.setup();
    renderToolbar();
    expect(screen.getByRole("status", {name: "open dialog"})).toHaveTextContent("none");

    await user.click(screen.getByRole("button", {name: EXPORT}));

    expect(screen.getByRole("status", {name: "open dialog"})).toHaveTextContent("VIEW_INVOICES__EXPORT");
    expect(selectedIds()).toEqual([firstInvoice.id, secondInvoice.id]);
  });

  it("asks for confirmation before deleting and deletes nothing when cancelled", async () => {
    const user = userEvent.setup();
    renderToolbar();

    const dialog = await openDeleteConfirmation(user);
    expect(within(dialog).getByText(`${B}.deleteConfirm.title`)).toBeInTheDocument();
    expect(within(dialog).getByText(`${B}.deleteConfirm.description`)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", {name: CANCEL}));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
    expect(selectedIds()).toEqual([firstInvoice.id, secondInvoice.id]);
    expect(entityIds()).toEqual([firstInvoice.id, secondInvoice.id]);
  });

  it("deletes every selected invoice, clears the selection, and hides itself when all deletions succeed", async () => {
    mockFetchWithTimeout.mockResolvedValue(deletedResponse());
    const user = userEvent.setup();
    renderToolbar();

    const dialog = await openDeleteConfirmation(user);
    await user.click(within(dialog).getByRole("button", {name: CONFIRM}));

    await waitFor(() => expect(screen.queryByRole("button", {name: DELETE, hidden: true})).not.toBeInTheDocument());
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
    expect(mockFetchWithTimeout).toHaveBeenNthCalledWith(
      1,
      `/rest/v1/invoices/${firstInvoice.id}`,
      expect.objectContaining({method: "DELETE"}),
    );
    expect(mockFetchWithTimeout).toHaveBeenNthCalledWith(
      2,
      `/rest/v1/invoices/${secondInvoice.id}`,
      expect.objectContaining({method: "DELETE"}),
    );
    expect(selectedIds()).toEqual([]);
    expect(entityIds()).toEqual([]);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps only the invoices that failed to delete selected and closes the confirmation", async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(deletedResponse()).mockResolvedValueOnce(serverErrorResponse());
    const user = userEvent.setup();
    renderToolbar();

    const dialog = await openDeleteConfirmation(user);
    await user.click(within(dialog).getByRole("button", {name: CONFIRM}));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
    expect(selectedIds()).toEqual([secondInvoice.id]);
    expect(entityIds()).toEqual([secondInvoice.id]);
    expect(screen.getByRole("button", {name: DELETE})).toBeEnabled();
  });

  it("disables the delete controls while a bulk deletion is in flight", async () => {
    let settleFirstDeletion: (response: BackendResponse) => void = () => {};
    mockFetchWithTimeout
      .mockReturnValueOnce(
        new Promise<BackendResponse>((resolve) => {
          settleFirstDeletion = resolve;
        }),
      )
      .mockResolvedValueOnce(deletedResponse());
    const user = userEvent.setup();
    renderToolbar();

    const dialog = await openDeleteConfirmation(user);
    await user.click(within(dialog).getByRole("button", {name: CONFIRM}));

    await waitFor(() => expect(within(dialog).getByRole("button", {name: CONFIRM})).toBeDisabled());
    expect(screen.getByRole("button", {name: DELETE, hidden: true})).toBeDisabled();
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleFirstDeletion(deletedResponse());
    });

    await waitFor(() => expect(screen.queryByRole("button", {name: DELETE, hidden: true})).not.toBeInTheDocument());
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
    expect(selectedIds()).toEqual([]);
  });
});
