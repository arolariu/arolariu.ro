import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {Features, transform} from "lightningcss";
import postcss from "postcss";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {CopyButton} from "./copy-button";
import styles from "./copy-button.module.css";

/** Compile actual CSS Modules/nesting, then bind emitted class identities to this test renderer's module map. */
function emittedCopyStyles(): postcss.Root {
  const output = transform({
    filename: "copy-button.module.css",
    code: Buffer.from(readFileSync(join(import.meta.dirname, "copy-button.module.css"), "utf8")),
    cssModules: true,
    include: Features.Nesting,
  });
  let css = output.code.toString();
  if (!output.exports) throw new Error("Expected compiled CSS Module exports");
  for (const [local, exported] of Object.entries(output.exports)) {
    if (styles[local]) css = css.replaceAll(`.${exported.name}`, `.${styles[local]}`);
  }
  return postcss.parse(css);
}

function copyDeclarations(css: postcss.Root, element: Element, condition?: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  css.walkRules((rule) => {
    const media = rule.parent?.type === "atrule" && rule.parent.name === "media" ? rule.parent.params : undefined;
    if (media?.replaceAll(/\s/gu, "") !== condition?.replaceAll(/\s/gu, "")) return;
    if (!rule.selectors.some((selector) => element.matches(selector))) return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });
  return declarations;
}

describe("CopyButton", () => {
  it("emits status selectors that match the real sibling live region", () => {
    const {container} = render(<CopyButton value='Text' />);
    const button = screen.getByRole("button");
    const status = screen.getByRole("status");
    expect(container.children).toHaveLength(2);
    expect(button.nextElementSibling).toBe(status);
    const declarations = copyDeclarations(emittedCopyStyles(), status);
    expect(declarations["position"]).toBe("absolute");
    expect(declarations["width"]).toBe("1px");
    expect(declarations["height"]).toBe("1px");
    expect(declarations["overflow"]).toBe("hidden");
    expect(declarations["clip-path"]).toBe("inset(50%)");
  });

  it("emits reduced-motion and forced-color selectors that match the actual button", () => {
    render(<CopyButton value='Text' />);
    const button = screen.getByRole("button");
    const css = emittedCopyStyles();
    expect(copyDeclarations(css, button, "(prefers-reduced-motion: reduce)")["transition"]).toBe("none");
    const forced = copyDeclarations(css, button, "(forced-colors: active)");
    expect(forced["color"]?.toLowerCase()).toBe("buttontext");
    expect(forced["border-color"]?.toLowerCase()).toBe("buttontext");
    expect(forced["background"]?.toLowerCase() ?? forced["background-color"]?.toLowerCase()).toBe("buttonface");
    act(() => button.focus());
    expect(copyDeclarations(css, button, "(forced-colors: active)")["outline-color"]?.toLowerCase()).toBe("highlight");
  });

  it("announces localized async success and failure without relying on a changing button name", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(
      <CopyButton
        value='value'
        copiedLabel='Copié'
        errorLabel='Échec'
      />,
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("status")).toHaveTextContent("Copié");
    write.mockRejectedValueOnce(new Error("Denied"));
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("status")).toHaveTextContent("Échec");
  });

  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (): Promise<void> => undefined,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();

    if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
    else Reflect.deleteProperty(navigator, "clipboard");
  });

  it("renders without crashing", () => {
    render(<CopyButton value='test' />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<CopyButton value='test' />);

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLButtonElement | null};

    render(
      <CopyButton
        ref={ref}
        value='test'
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("copies text to clipboard on click", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(<CopyButton value='test value' />);
    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("test value");
    });
  });

  it("shows check icon after successful copy", async () => {
    const user = userEvent.setup();

    render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText("Copied")).toBeInTheDocument();
    });
  });

  it("calls clipboard.writeText with correct value", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(<CopyButton value='test-value-123' />);
    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("test-value-123");
    });
  });

  it("does not crash when clipboard writeText fails", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard access denied"));

    Object.defineProperty(navigator, "clipboard", {
      value: {writeText: writeTextMock},
      writable: true,
      configurable: true,
    });

    render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("test");
    });

    expect(button).toBeInTheDocument();
    expect(screen.getByLabelText("Copy failed")).toHaveAttribute("data-state", "error");
  });

  it("shows check icon and reverts after custom timeout", async () => {
    vi.useFakeTimers();

    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        timeout={1000}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("clears timeout on unmount", async () => {
    vi.useFakeTimers();

    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const {unmount} = render(
      <CopyButton
        value='test'
        timeout={1000}
      />,
    );
    const button = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    unmount();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("handles multiple rapid clicks by resetting timeout", async () => {
    vi.useFakeTimers();

    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        timeout={1000}
      />,
    );
    const button = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("does not copy when disabled", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        disabled
      />,
    );

    await user.click(screen.getByRole("button"));

    expect(writeTextMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("does not copy when clipboard.writeText is not available", async () => {
    const user = userEvent.setup();

    Object.defineProperty(navigator, "clipboard", {
      value: {writeText: undefined},
      writable: true,
      configurable: true,
    });

    render(<CopyButton value='test' />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByLabelText("Copy failed")).toHaveAttribute("data-state", "error");
  });

  it("calls custom onClick handler", async () => {
    const user = userEvent.setup();
    const onClickMock = vi.fn();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        onClick={onClickMock}
      />,
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onClickMock).toHaveBeenCalledTimes(1);
      expect(writeTextMock).toHaveBeenCalledWith("test");
    });
  });

  it("does not copy when event is prevented by onClick handler", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        onClick={(e) => e.preventDefault()}
      />,
    );

    await user.click(screen.getByRole("button"));

    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it("does not schedule a success reset for delayed clipboard completion after unmount", async () => {
    vi.useFakeTimers();
    let complete: (() => void) | undefined;
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    const {unmount} = render(<CopyButton value='pending' />);
    fireEvent.click(screen.getByRole("button"));
    unmount();
    await act(async () => {
      complete?.();
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("surfaces pending clipboard errors through the callback without replacing caller labels", async () => {
    let fail: ((reason: Error) => void) | undefined;
    const error = new Error("Denied");
    const onCopyError = vi.fn();
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          fail = reject;
        }),
    );
    render(
      <CopyButton
        value='pending'
        aria-label='Copy command'
        onCopyError={onCopyError}
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "Copy command"}));
    await act(async () => {
      fail?.(error);
    });
    expect(onCopyError).toHaveBeenCalledWith(error);
    expect(screen.getByRole("button", {name: "Copy command"})).toHaveAttribute("data-state", "error");
  });

  it("does not call the error callback for a rejected pending operation after unmount", async () => {
    let fail: ((reason: Error) => void) | undefined;
    const onCopyError = vi.fn();
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          fail = reject;
        }),
    );
    const {unmount} = render(
      <CopyButton
        value='pending'
        onCopyError={onCopyError}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    unmount();
    await act(async () => {
      fail?.(new Error("Denied"));
    });
    expect(onCopyError).not.toHaveBeenCalled();
  });

  it("keeps native keyboard activation and does not submit the surrounding form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(
      <form onSubmit={onSubmit}>
        <CopyButton value='command' />
      </form>,
    );
    await user.tab();
    await user.keyboard("{Enter} ");
    expect(write).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores an older clipboard rejection after a later activation succeeds", async () => {
    let rejectOlder: ((reason: Error) => void) | undefined;
    const onCopyError = vi.fn();
    const write = vi.spyOn(navigator.clipboard, "writeText");
    write.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectOlder = reject;
        }),
    );
    write.mockResolvedValue(undefined);
    render(
      <CopyButton
        value='command'
        onCopyError={onCopyError}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button", {name: "Copied"})).toHaveAttribute("data-state", "copied");
    await act(async () => {
      rejectOlder?.(new Error("Older rejection"));
    });
    expect(onCopyError).not.toHaveBeenCalled();
    expect(screen.getByRole("button", {name: "Copied"})).toHaveAttribute("data-state", "copied");
  });
});
