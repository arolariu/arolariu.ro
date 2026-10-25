import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {StrictMode, use} from "react";
import {hydrateRoot} from "react-dom/client";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {AsyncBoundary} from "./async-boundary";

function ThrowingComponent(): never {
  throw new Error("Async boundary failure");
}

function AsyncContent({resource}: Readonly<{resource: Promise<string>}>): React.JSX.Element {
  const result = use(resource);
  return <p>{result}</p>;
}

describe("AsyncBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the default fallback's loading text into a persistent status region outside Suspense", async () => {
    const resource = Promise.withResolvers<string>();
    const {rerender} = render(
      <AsyncBoundary>
        <p>Ready</p>
      </AsyncBoundary>,
    );
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");

    await act(async () => {
      rerender(
        <AsyncBoundary>
          <AsyncContent resource={resource.promise} />
        </AsyncBoundary>,
      );
    });
    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe("Loading");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    const spinner = document.querySelector<SVGElement>('[data-slot="spinner"]');
    expect(spinner).toHaveAttribute("aria-hidden", "true");
    expect(spinner).not.toHaveAttribute("aria-label");
    expect(status).not.toContainElement(spinner);

    await act(async () => {
      resource.resolve("Resolved later");
      await resource.promise;
    });
    expect(await screen.findByText("Resolved later")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toBeEmptyDOMElement();
  });

  it("writes a localized loadingLabel while suspended on mount and clears it after resolve", async () => {
    const resource = Promise.withResolvers<string>();
    await act(async () => {
      render(
        <AsyncBoundary loadingLabel='Se încarcă profilul'>
          <AsyncContent resource={resource.promise} />
        </AsyncBoundary>,
      );
    });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Se încarcă profilul");

    await act(async () => {
      resource.resolve("Profil");
      await resource.promise;
    });
    expect(await screen.findByText("Profil")).toBeInTheDocument();
    expect(status).toBeEmptyDOMElement();
  });

  it("keeps the region text consistent when Strict Mode replays the fallback effects", async () => {
    const resource = Promise.withResolvers<string>();
    await act(async () => {
      render(
        <StrictMode>
          <AsyncBoundary>
            <AsyncContent resource={resource.promise} />
          </AsyncBoundary>
        </StrictMode>,
      );
    });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Loading");

    await act(async () => {
      resource.resolve("Strict content");
      await resource.promise;
    });
    expect(await screen.findByText("Strict content")).toBeInTheDocument();
    expect(status).toBeEmptyDOMElement();
  });

  it("hydrates the server-rendered empty region without a mismatch", async () => {
    const markup = renderToString(
      <AsyncBoundary>
        <p>Server ready</p>
      </AsyncBoundary>,
    );
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain("Loading");
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    const errors = vi.mocked(console.error);
    errors.mockClear();
    const recoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(
        container,
        <AsyncBoundary>
          <p>Server ready</p>
        </AsyncBoundary>,
        {onRecoverableError: recoverableError},
      );
    });
    expect(recoverableError).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')).toBeEmptyDOMElement();
    act(() => root?.unmount());
    container.remove();
  });

  it("leaves custom and empty fallbacks responsible for their own announcements", async () => {
    const resource = Promise.withResolvers<string>();
    await act(async () => {
      render(
        <AsyncBoundary loadingFallback={<p>Custom pending view</p>}>
          <AsyncContent resource={resource.promise} />
        </AsyncBoundary>,
      );
    });
    expect(screen.getByText("Custom pending view")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders children when no loading or error occurs", () => {
    render(
      <AsyncBoundary>
        <p>Ready</p>
      </AsyncBoundary>,
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders the loading fallback while children are suspended", async () => {
    const resource = Promise.withResolvers<string>();
    await act(async () => {
      render(
        <AsyncBoundary loadingFallback={<p>Loading boundary</p>}>
          <AsyncContent resource={resource.promise} />
        </AsyncBoundary>,
      );
    });

    expect(screen.getByText("Loading boundary")).toBeInTheDocument();
  });

  it("resolves an actual stable Suspense promise into the ready subtree", async () => {
    const resource = Promise.withResolvers<string>();
    await act(async () => {
      render(
        <AsyncBoundary>
          <AsyncContent resource={resource.promise} />
        </AsyncBoundary>,
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(document.querySelector('[data-slot="spinner"]')).toBeInTheDocument();

    await act(async () => {
      resource.resolve("Resolved content");
      await resource.promise;
    });

    expect(await screen.findByText("Resolved content")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(document.querySelector('[data-slot="spinner"]')).toBeNull();
  });

  it("honors an intentionally empty Suspense fallback", async () => {
    const resource = Promise.withResolvers<string>();
    let container: HTMLElement | undefined;
    await act(async () => {
      ({container} = render(
        <AsyncBoundary loadingFallback={null}>
          <AsyncContent resource={resource.promise} />
        </AsyncBoundary>,
      ));
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("rejects a real resource, reports the failure, and recovers after replacing it before reset", async () => {
    const user = userEvent.setup();
    const resource = Promise.withResolvers<string>();
    let currentResource = resource.promise;
    let reported: Error | undefined;
    function ResourceOwner(): React.JSX.Element {
      return <AsyncContent resource={currentResource} />;
    }
    await act(async () => {
      render(
        <AsyncBoundary
          loadingFallback={<p>Pending resource</p>}
          onError={(error) => {
            reported = error;
          }}
          fallback={(error, reset) => (
            <div role='alert'>
              {error.message}
              <button
                type='button'
                onClick={() => {
                  currentResource = Promise.resolve("Retried resource");
                  reset();
                }}>
                Retry resource
              </button>
            </div>
          )}>
          <ResourceOwner />
        </AsyncBoundary>,
      );
    });
    expect(screen.getByText("Pending resource")).toBeInTheDocument();
    const failure = new Error("Resource rejected");

    await act(async () => {
      resource.reject(failure);
      await resource.promise.catch(() => {});
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Resource rejected");
    expect(reported).toBe(failure);
    await act(async () => {
      await user.click(screen.getByRole("button", {name: "Retry resource"}));
    });
    expect(await screen.findByText("Retried resource")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the error fallback when a child throws", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AsyncBoundary>
        <ThrowingComponent />
      </AsyncBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Async boundary failure")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("recatches the same rejected resource when reset does not replace it", async () => {
    const user = userEvent.setup();
    const resource = Promise.withResolvers<string>();
    await act(async () => {
      render(
        <AsyncBoundary
          fallback={(error, reset) => (
            <div role='alert'>
              {error.message}
              <button
                type='button'
                onClick={reset}>
                Retry unchanged resource
              </button>
            </div>
          )}>
          <AsyncContent resource={resource.promise} />
        </AsyncBoundary>,
      );
    });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Loading");
    await act(async () => {
      resource.reject(new Error("Still rejected"));
      await resource.promise.catch(() => {});
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Still rejected");
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toBeEmptyDOMElement();

    await act(async () => {
      await user.click(screen.getByRole("button", {name: "Retry unchanged resource"}));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Still rejected");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(document.querySelector('[data-slot="spinner"]')).toBeNull();
  });
});
