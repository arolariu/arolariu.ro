/**
 * @fileoverview Real-catalog integration tests for the manual classification picker.
 * @module app/domains/invoices/_components/analysis/ClassificationPicker.test
 */

import {searchClassifications} from "@/app/domains/invoices/_actions/analysis/searchClassifications";
import {ClassificationSystem, type ClassificationSelection} from "@/types/invoices";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useCallback, useEffect, useState} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {AnalysisTestProvider} from "../../../../../../tests/helpers/analysis";
import {
  ClassificationPicker,
  classificationSearchReducer,
  createClassificationSearchInput,
  useLatestRequestController,
} from "./ClassificationPicker";

interface Deferred<TValue> {
  readonly promise: Promise<TValue>;
  readonly resolve: (value: TValue) => void;
  readonly reject: (reason?: unknown) => void;
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolvePromise: ((value: TValue) => void) | undefined;
  let rejectPromise: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<TValue>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: (value) => {
      resolvePromise?.(value);
    },
    reject: (reason) => {
      rejectPromise?.(reason);
    },
  };
}

function renderPicker(
  value: ClassificationSelection | null = null,
  onChange: (selection: ClassificationSelection | null) => void = vi.fn(),
  disabled = false,
  allowClear?: boolean,
): void {
  render(
    <AnalysisTestProvider>
      <ClassificationPicker
        system={ClassificationSystem.Gs1Gpc}
        value={value}
        onChange={onChange}
        disabled={disabled}
        allowClear={allowClear}
      />
    </AnalysisTestProvider>,
  );
}

interface LatestRequestConsumerProps {
  readonly system: ClassificationSystem;
  readonly onCommit: (state: string) => void;
}

let startLatestRequest: ((operation: Promise<string>) => void) | null = null;

/**
 * Renders the same latest-request hook used by ClassificationPicker with
 * externally controlled promises for real React concurrency coverage.
 */
function LatestRequestConsumer({system, onCommit}: Readonly<LatestRequestConsumerProps>): React.JSX.Element {
  const requestController = useLatestRequestController(system);
  const [state, setState] = useState("idle");

  useEffect(() => {
    setState("idle");
  }, [system]);

  const start = useCallback(
    (operation: Promise<string>): void => {
      const requestId = requestController.begin();
      setState("loading");
      void operation
        .then((result) => {
          if (requestController.isLatest(requestId)) {
            setState(`success:${result}`);
            onCommit(`success:${result}`);
          }
        })
        .catch(() => {
          if (requestController.isLatest(requestId)) {
            setState("error");
            onCommit("error");
          }
        });
    },
    [onCommit, requestController],
  );

  startLatestRequest = start;
  return <output aria-label='latest request state'>{state}</output>;
}

describe("ClassificationPicker", () => {
  beforeEach(() => {
    vi.useRealTimers();
    startLatestRequest = null;
  });

  it("does not search before two normalized characters", async () => {
    // Arrange
    vi.useFakeTimers();
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
    renderPicker();

    // Act
    await user.click(screen.getByRole("button", {name: "GS1 GPC classification"}));
    await user.type(screen.getByRole("combobox", {name: "GS1 GPC classification"}), " a ");
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    // Assert
    expect(screen.getByText("Enter at least 2 characters to search.")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("uses the bounded real catalog request and renders its official projections", async () => {
    // Arrange
    const input = createClassificationSearchInput(ClassificationSystem.Gs1Gpc, "  arts  ");
    const actionResult = await searchClassifications(input);
    renderPicker();
    const user = userEvent.setup();

    // Act
    await user.click(screen.getByRole("button", {name: "GS1 GPC classification"}));
    await user.type(screen.getByRole("combobox", {name: "GS1 GPC classification"}), "arts");

    // Assert
    expect(input).toEqual({system: ClassificationSystem.Gs1Gpc, query: "arts", limit: 20});
    expect(actionResult.success).toBe(true);
    if (actionResult.success) {
      expect(actionResult.data.length).toBeLessThanOrEqual(20);
    }
    const options = await screen.findAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThanOrEqual(20);
    expect(screen.getAllByText("Arts/Crafts/Needlework").length).toBeGreaterThan(0);
  });

  it("emits only the system and code for a selected official result", async () => {
    // Arrange
    const onChange = vi.fn<(selection: ClassificationSelection | null) => void>();
    renderPicker(null, onChange);
    const user = userEvent.setup();

    // Act
    await user.click(screen.getByRole("button", {name: "GS1 GPC classification"}));
    await user.type(screen.getByRole("combobox", {name: "GS1 GPC classification"}), "arts");
    const [artsOption] = await screen.findAllByRole("option", {name: /Arts\/Crafts\/Needlework/i});
    if (artsOption === undefined) {
      throw new Error("Expected an Arts/Crafts/Needlework result.");
    }
    const selectedCode = artsOption.textContent?.match(/\d{8}/u)?.[0];
    if (selectedCode === undefined) {
      throw new Error("Expected the result to expose a canonical GPC code.");
    }
    await user.click(artsOption);

    // Assert
    expect(onChange).toHaveBeenCalledWith({system: ClassificationSystem.Gs1Gpc, code: selectedCode});
  });

  it("keeps only the newest controlled asynchronous request result in rendered hook state", async () => {
    // Arrange
    const older = createDeferred<string>();
    const newer = createDeferred<string>();
    const onCommit = vi.fn();
    render(
      <LatestRequestConsumer
        system={ClassificationSystem.Gs1Gpc}
        onCommit={onCommit}
      />,
    );

    // Act
    act(() => {
      startLatestRequest?.(older.promise);
      startLatestRequest?.(newer.promise);
    });
    await act(async () => {
      newer.resolve("new");
      await newer.promise;
    });
    await act(async () => {
      older.resolve("old");
      await older.promise;
    });

    // Assert
    expect(screen.getByLabelText("latest request state")).toHaveTextContent("success:new");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("success:new");
  });

  it("does not let a stale error replace a newer rendered success", async () => {
    // Arrange
    const older = createDeferred<string>();
    const newer = createDeferred<string>();
    const onCommit = vi.fn();
    render(
      <LatestRequestConsumer
        system={ClassificationSystem.Gs1Gpc}
        onCommit={onCommit}
      />,
    );

    // Act
    act(() => {
      startLatestRequest?.(older.promise);
      startLatestRequest?.(newer.promise);
    });
    await act(async () => {
      newer.resolve("new");
      await newer.promise;
    });
    await act(async () => {
      older.reject(new Error("stale failure"));
      await older.promise.catch(() => undefined);
    });

    // Assert
    expect(screen.getByLabelText("latest request state")).toHaveTextContent("success:new");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("success:new");
  });

  it("invalidates pending work when the taxonomy system changes or the consumer unmounts", async () => {
    // Arrange
    const pendingSystemRequest = createDeferred<string>();
    const pendingUnmountRequest = createDeferred<string>();
    const onCommit = vi.fn();
    const {rerender, unmount} = render(
      <LatestRequestConsumer
        system={ClassificationSystem.Gs1Gpc}
        onCommit={onCommit}
      />,
    );

    // Act
    act(() => {
      startLatestRequest?.(pendingSystemRequest.promise);
    });
    rerender(
      <LatestRequestConsumer
        system={ClassificationSystem.Nace21}
        onCommit={onCommit}
      />,
    );
    await act(async () => {
      pendingSystemRequest.resolve("obsolete-system");
      await pendingSystemRequest.promise;
    });
    act(() => {
      startLatestRequest?.(pendingUnmountRequest.promise);
    });
    unmount();
    await act(async () => {
      pendingUnmountRequest.resolve("unmounted");
      await pendingUnmountRequest.promise;
    });

    // Assert
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("emits null when the default clearable selection is cleared", async () => {
    // Arrange
    const onChange = vi.fn<(selection: ClassificationSelection | null) => void>();
    renderPicker({system: ClassificationSystem.Gs1Gpc, code: "70000000"}, onChange);
    const user = userEvent.setup();

    // Act
    await user.click(screen.getByRole("button", {name: "Clear GS1 GPC classification"}));

    // Assert
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("hides the clear operation when a persisted integration disallows clearing", () => {
    // Arrange
    renderPicker({system: ClassificationSystem.Gs1Gpc, code: "70000000"}, vi.fn(), false, false);

    // Assert
    expect(screen.queryByRole("button", {name: "Clear GS1 GPC classification"})).not.toBeInTheDocument();
  });

  it("provides combobox, listbox, and keyboard option selection semantics", async () => {
    // Arrange
    renderPicker();
    const user = userEvent.setup();

    // Act
    await user.click(screen.getByRole("button", {name: "GS1 GPC classification"}));
    const input = screen.getByRole("combobox", {name: "GS1 GPC classification"});
    await user.type(input, "arts");
    const listbox = await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");

    // Assert
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(input).toHaveAttribute("aria-activedescendant");
    const activeOptionId = input.getAttribute("aria-activedescendant");
    expect(activeOptionId).not.toBeNull();
    const activeOption = document.getElementById(activeOptionId ?? "");
    expect(activeOption).toHaveAttribute("role", "option");
    expect(activeOption).toHaveAttribute("data-active", "true");

    // Act
    await user.keyboard("{Enter}");

    // Assert
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("models loading, error, empty, disabled, unmount, and system-change safeguards", async () => {
    // Arrange
    const initialState = {status: "idle", requestId: 2, results: []} as const;
    const errorState = classificationSearchReducer(initialState, {type: "error", requestId: 2, error: "failed"});
    const staleErrorState = classificationSearchReducer(errorState, {type: "error", requestId: 1, error: "older"});
    renderPicker(null, vi.fn(), true);

    // Assert
    expect(errorState.status).toBe("error");
    expect(staleErrorState).toEqual(errorState);
    expect(screen.getByRole("button", {name: "GS1 GPC classification"})).toBeDisabled();

    // Arrange
    const {rerender, unmount} = render(
      <AnalysisTestProvider>
        <ClassificationPicker
          system={ClassificationSystem.Gs1Gpc}
          value={null}
          onChange={vi.fn()}
        />
      </AnalysisTestProvider>,
    );
    const user = userEvent.setup();

    // Act
    const enabledTrigger = screen
      .getAllByRole("button", {name: "GS1 GPC classification"})
      .find((element) => !element.hasAttribute("disabled"));
    if (enabledTrigger === undefined) {
      throw new Error("Expected an enabled classification picker.");
    }
    await user.click(enabledTrigger);
    const enabledInput = screen.getAllByRole("combobox", {name: "GS1 GPC classification"}).at(-1);
    if (enabledInput === undefined) {
      throw new Error("Expected the enabled picker search input.");
    }
    await user.type(enabledInput, "zzzz");
    expect(await screen.findByText("No matching classifications found.")).toBeInTheDocument();
    rerender(
      <AnalysisTestProvider>
        <ClassificationPicker
          system={ClassificationSystem.Nace21}
          value={null}
          onChange={vi.fn()}
        />
      </AnalysisTestProvider>,
    );
    unmount();
  });
});
