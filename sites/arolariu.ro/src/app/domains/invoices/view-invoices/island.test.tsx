/**
 * @fileoverview Tests for the view-invoices island fetch-failure, retry, and empty-result states.
 * @module app/domains/invoices/view-invoices/island.test
 *
 * @remarks
 * The real `useInvoices` hook, `fetchInvoices` server action, transport parser, and IndexedDB-persisted
 * invoices store (backed by `fake-indexeddb`) run unmodified. Only the backend HTTP call (`fetchWithTimeout`)
 * and the Clerk-backed identity lookup (`fetchBFFUserFromAuthService`) are stubbed through the Vitest aliases.
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../tests/helpers";
import RenderViewInvoicesScreen from "./island";

type BackendResponse = Awaited<ReturnType<typeof fetchWithTimeout>>;

const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

const HEADER_TITLE = /viewInvoices\.invoicesHeader\.title/;
const LOAD_ERROR_TITLE = /viewInvoicesIsland\.loadError\.title/;
const RETRY_BUTTON = /viewInvoicesIsland\.loadError\.retry$/;
const RETRYING_BUTTON = /viewInvoicesIsland\.loadError\.retrying/;
const INVOICES_TAB = /viewInvoicesIsland\.tabs\.invoices/;

function buildInvoice(id: string, name: string): Invoice {
  return TestDataBuilder.build("invoice", {
    id,
    name,
    userIdentifier: "44444444-4444-4444-8444-444444444444",
    merchantReference: "55555555-5555-4555-8555-555555555555",
  });
}

const cachedInvoice = buildInvoice("11111111-1111-4111-8111-111111111111", "Cached invoice");
const freshInvoice = buildInvoice("22222222-2222-4222-8222-222222222222", "Fresh invoice");

function serverErrorResponse(): BackendResponse {
  return TestDataBuilder.textResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as BackendResponse;
}

function invoicesResponse(invoices: ReadonlyArray<Invoice>): BackendResponse {
  return TestDataBuilder.jsonResponse(invoices) as BackendResponse;
}

function seedStore(entities: ReadonlyArray<Invoice>): void {
  act(() => {
    useInvoicesStore.setState({entities, selectedEntities: [], hasHydrated: true});
  });
}

describe("RenderViewInvoicesScreen", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when the island unmounts.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    await act(async () => {
      await useInvoicesStore.persist.rehydrate();
    });
    seedStore([cachedInvoice]);
  });

  it("replaces the cached invoice tabs with a retry alert when the invoices fetch fails", async () => {
    mockFetchWithTimeout.mockResolvedValue(serverErrorResponse());

    render(<RenderViewInvoicesScreen />);

    expect(await screen.findByRole("button", {name: RETRY_BUTTON})).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR_TITLE);
    expect(screen.getByRole("heading", {name: HEADER_TITLE})).toBeInTheDocument();
    expect(screen.queryByRole("tab", {name: INVOICES_TAB})).not.toBeInTheDocument();
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it("shows the retry alert when the fetch fails and no invoices are cached", async () => {
    seedStore([]);
    mockFetchWithTimeout.mockResolvedValue(serverErrorResponse());

    render(<RenderViewInvoicesScreen />);

    expect(await screen.findByRole("button", {name: RETRY_BUTTON})).toBeInTheDocument();
    expect(screen.getByRole("heading", {name: HEADER_TITLE})).toBeInTheDocument();
  });

  it("restores the invoice tabs with fresh data when a retry succeeds", async () => {
    mockFetchWithTimeout
      .mockResolvedValueOnce(serverErrorResponse())
      .mockResolvedValueOnce(invoicesResponse([cachedInvoice, freshInvoice]));
    const user = userEvent.setup();

    render(<RenderViewInvoicesScreen />);
    await user.click(await screen.findByRole("button", {name: RETRY_BUTTON}));

    expect(await screen.findByRole("tab", {name: INVOICES_TAB})).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: RETRY_BUTTON})).not.toBeInTheDocument();
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
    expect(useInvoicesStore.getState().entities.map((invoice) => invoice.id)).toEqual([cachedInvoice.id, freshInvoice.id]);
  });

  it("keeps the focused retry button unavailable while a retry is in flight and restores it when the retry fails", async () => {
    let settleRetry: (response: BackendResponse) => void = () => {};
    mockFetchWithTimeout.mockResolvedValueOnce(serverErrorResponse()).mockReturnValueOnce(
      new Promise<BackendResponse>((resolve) => {
        settleRetry = resolve;
      }),
    );
    const user = userEvent.setup();

    render(<RenderViewInvoicesScreen />);
    const retryButton = await screen.findByRole("button", {name: RETRY_BUTTON});
    await user.click(retryButton);

    const pendingButton = await screen.findByRole("button", {name: RETRYING_BUTTON});
    expect(pendingButton).toHaveAttribute("aria-disabled", "true");
    expect(pendingButton).toHaveFocus();

    await user.click(pendingButton);
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);

    await act(async () => {
      settleRetry(serverErrorResponse());
    });

    const restoredButton = await screen.findByRole("button", {name: RETRY_BUTTON});
    expect(restoredButton).not.toHaveAttribute("aria-disabled", "true");
    expect(restoredButton).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR_TITLE);

    mockFetchWithTimeout.mockResolvedValueOnce(serverErrorResponse());
    await user.click(restoredButton);

    await waitFor(() => expect(mockFetchWithTimeout).toHaveBeenCalledTimes(3));
    expect(await screen.findByRole("button", {name: RETRY_BUTTON})).not.toHaveAttribute("aria-disabled", "true");
  });

  it("renders the invoice tabs rather than an error when the fetch returns no invoices", async () => {
    mockFetchWithTimeout.mockResolvedValue(invoicesResponse([]));

    render(<RenderViewInvoicesScreen />);

    await waitFor(() => expect(useInvoicesStore.getState().entities).toEqual([]));
    expect(screen.getByRole("tab", {name: INVOICES_TAB})).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: RETRY_BUTTON})).not.toBeInTheDocument();
  });
});
