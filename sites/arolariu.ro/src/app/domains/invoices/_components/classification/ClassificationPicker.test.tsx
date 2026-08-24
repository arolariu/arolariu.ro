/**
 * @fileoverview Unit tests for ClassificationPicker component.
 * @module app/domains/invoices/_components/classification/ClassificationPicker.test
 *
 * @remarks
 * TDD suite verifying:
 * 1. A query shorter than the minimum length (2 normalized chars) does NOT call the search action.
 * 2. Stale-response protection: a slow earlier search cannot overwrite newer results.
 * 3. Keyboard selection (ArrowDown + Enter) emits exactly `{system, code}` — nothing else.
 * 4. Escape closes the listbox (aria-expanded becomes "false").
 * 5. The clear control emits `onChange(null)`.
 * 6. Each rendered option contains the official label and the code.
 * 7. The rendered option count never exceeds the action's documented limit (50).
 *
 * All queries use accessible roles to simultaneously prove accessibility.
 */

import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {ClassificationSearchResult, ClassificationSelection} from "@/types/invoices";
import {ClassificationSystem} from "@/types/invoices";
import ClassificationPicker from "./ClassificationPicker";

// ── Mock the server action boundary ────────────────────────────────────────────

vi.mock("@/app/domains/invoices/_actions/analysis/searchClassifications", () => ({
  searchClassifications: vi.fn(),
}));

const {searchClassifications} = await import(
  "@/app/domains/invoices/_actions/analysis/searchClassifications"
);
const mockSearch = vi.mocked(searchClassifications);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const SYSTEM = ClassificationSystem.Gs1Gpc;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 50;

function makeResult(code: string, label: string): ClassificationSearchResult {
  return {
    system: SYSTEM,
    version: "2026-05",
    code,
    officialLabel: label,
    level: "brick",
    parentCode: null,
    hierarchyCodes: [code],
    hierarchyLabels: [label],
  };
}

const RESULT_A = makeResult("10000011", "Juices - Non-Aseptic (Shelf Stable)");
const RESULT_B = makeResult("10000018", "Flavoured Drinks (Shelf Stable)");

// ── Suite ──────────────────────────────────────────────────────────────────────

describe("ClassificationPicker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ── 1. Short query → no search ─────────────────────────────────────────────

  it("does not call searchClassifications when the query is shorter than the minimum length (2 chars)", async () => {
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});

    render(<ClassificationPicker system={SYSTEM} value={null} onChange={vi.fn()} label="Test" />);

    const combobox = screen.getByRole("combobox");
    await user.type(combobox, "a"); // 1 normalized char — below minimum of 2

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  // ── 2. Stale-response protection ──────────────────────────────────────────

  it("does not update results when a stale slow search resolves after a newer search", async () => {
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});

    type SuccessResult = {success: true; data: readonly ClassificationSearchResult[]};
    let resolveSlowSearch!: (v: SuccessResult) => void;
    let resolveFastSearch!: (v: SuccessResult) => void;

    mockSearch
      .mockImplementationOnce(
        () =>
          new Promise<SuccessResult>((r) => {
            resolveSlowSearch = r;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<SuccessResult>((r) => {
            resolveFastSearch = r;
          }),
      );

    render(<ClassificationPicker system={SYSTEM} value={null} onChange={vi.fn()} label="Test" />);

    const combobox = screen.getByRole("combobox");

    // Fire slow search for "ab"
    await user.type(combobox, "ab");
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    // Fire fast search for "cd" — both are now in-flight
    await user.clear(combobox);
    await user.type(combobox, "cd");
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    expect(mockSearch).toHaveBeenCalledTimes(2);

    // Fast search (query #2) resolves first
    await act(async () => {
      resolveFastSearch({success: true, data: [RESULT_B]});
      await Promise.resolve();
    });

    expect(
      screen.getByRole("option", {name: new RegExp(RESULT_B.code)}),
    ).toBeInTheDocument();

    // Slow search (query #1) resolves late — MUST NOT overwrite newer results
    await act(async () => {
      resolveSlowSearch({success: true, data: [RESULT_A]});
      await Promise.resolve();
    });

    expect(
      screen.queryByRole("option", {name: new RegExp(RESULT_A.code)}),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", {name: new RegExp(RESULT_B.code)}),
    ).toBeInTheDocument();
  });

  // ── 3. Keyboard: ArrowDown + Enter selects option ──────────────────────────

  it("calls onChange with exactly {system, code} when ArrowDown then Enter is pressed", async () => {
    const onChange = vi.fn<(selection: ClassificationSelection | null) => void>();
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});

    mockSearch.mockImplementation(() =>
      Promise.resolve({success: true as const, data: [RESULT_A, RESULT_B]}),
    );

    render(
      <ClassificationPicker system={SYSTEM} value={null} onChange={onChange} label="Test" />,
    );

    const combobox = screen.getByRole("combobox");
    await user.type(combobox, "ju");

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledTimes(1);
    // toHaveBeenCalledWith uses deep equality — extra keys would cause failure
    expect(onChange).toHaveBeenCalledWith({system: SYSTEM, code: RESULT_A.code});
    const firstCallArg = onChange.mock.calls[0]?.[0];
    expect(firstCallArg).not.toBeNull();
    expect(Object.keys(firstCallArg ?? {}).sort()).toStrictEqual(["code", "system"]);
  });

  // ── 4. Escape closes the listbox ──────────────────────────────────────────

  it("sets aria-expanded to false and hides the listbox when Escape is pressed", async () => {
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});

    mockSearch.mockImplementation(() =>
      Promise.resolve({success: true as const, data: [RESULT_A]}),
    );

    render(<ClassificationPicker system={SYSTEM} value={null} onChange={vi.fn()} label="Test" />);

    const combobox = screen.getByRole("combobox");
    await user.type(combobox, "ju");

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    screen.getByRole("listbox");
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  // ── 5. Clear control emits onChange(null) ─────────────────────────────────

  it("calls onChange(null) when the clear button is clicked", async () => {
    const onChange = vi.fn<(selection: ClassificationSelection | null) => void>();
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});

    const existingValue: ClassificationSelection = {system: SYSTEM, code: RESULT_A.code};

    render(
      <ClassificationPicker
        system={SYSTEM}
        value={existingValue}
        onChange={onChange}
        label="Test"
      />,
    );

    const clearButton = screen.getByRole("button", {name: /classificationPicker\.clear/i});
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  // ── 6. Options render label and code ──────────────────────────────────────

  it("renders the official label and code inside each option", async () => {
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});

    mockSearch.mockImplementation(() =>
      Promise.resolve({success: true as const, data: [RESULT_A]}),
    );

    render(<ClassificationPicker system={SYSTEM} value={null} onChange={vi.fn()} label="Test" />);

    const combobox = screen.getByRole("combobox");
    await user.type(combobox, "ju");

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    const option = screen.getByRole("option");
    expect(option.textContent).toContain(RESULT_A.officialLabel);
    expect(option.textContent).toContain(RESULT_A.code);
  });

  // ── 7. Result count bounded by action's documented limit ──────────────────

  it(`renders at most ${MAX_RESULTS} options regardless of how many the action returns`, async () => {
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});

    const oversizedResults = Array.from({length: 75}, (_, i) =>
      makeResult(`code-${String(i).padStart(3, "0")}`, `Label ${i}`),
    );

    mockSearch.mockImplementation(() =>
      Promise.resolve({success: true as const, data: oversizedResults}),
    );

    render(<ClassificationPicker system={SYSTEM} value={null} onChange={vi.fn()} label="Test" />);

    const combobox = screen.getByRole("combobox");
    await user.type(combobox, "la");

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
      await Promise.resolve();
    });

    screen.getByRole("listbox");
    const options = screen.getAllByRole("option");
    expect(options.length).toBeLessThanOrEqual(MAX_RESULTS);
  });
});
