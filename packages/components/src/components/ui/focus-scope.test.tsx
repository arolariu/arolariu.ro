import {fireEvent, render, screen} from "@testing-library/react";
import userEvent, {type UserEvent} from "@testing-library/user-event";
import {createRef, StrictMode, useCallback, useState} from "react";
import {createPortal} from "react-dom";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it, vi} from "vitest";

import {Button} from "./button";
import {FocusScope} from "./focus-scope";
import * as stories from "./focus-scope.stories";
import {Toolbar, ToolbarButton} from "./toolbar";

function ShadowWidget({
  tabIndex,
  label = "Shadow widget",
  children,
  lightChildren,
}: Readonly<{
  tabIndex?: number;
  label?: string;
  children: React.ReactNode;
  lightChildren?: React.ReactNode;
}>): React.ReactElement {
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  const attachShadow = useCallback((host: HTMLDivElement | null): void => {
    if (host) setShadow(host.shadowRoot ?? host.attachShadow({mode: "open"}));
  }, []);
  return (
    <div
      ref={attachShadow}
      role='group'
      aria-label={label}
      tabIndex={tabIndex}>
      {lightChildren}
      {shadow && createPortal(children, shadow)}
    </div>
  );
}

function getShadowButtons(host: HTMLElement): {
  shadow: ShadowRoot;
  first: HTMLButtonElement;
  middle: HTMLButtonElement;
  last: HTMLButtonElement;
} {
  const shadow = host.shadowRoot;
  if (!shadow) throw new TypeError("Expected an open shadow widget.");
  const [first, middle, last] = shadow.querySelectorAll<HTMLButtonElement>("button");
  if (!first || !middle || !last) throw new TypeError("Expected three shadow buttons.");
  return {shadow, first, middle, last};
}

function expectTreeFocus(element: HTMLElement): void {
  const root = element.getRootNode();
  const tree = root instanceof ShadowRoot ? root : element.ownerDocument;
  expect(root).toBe(tree);
  expect(tree.activeElement).toBe(element);
  expect(element.shadowRoot?.activeElement ?? null).toBeNull();
}

function withIframeShadowConstructor(run: (ownerDocument: Document, owningConstructor: typeof ShadowRoot) => void): void {
  const originalConstructor = ShadowRoot;
  const iframe = document.createElement("iframe");
  iframe.title = "FocusScope owning realm";
  document.body.append(iframe);
  try {
    const ownerDocument = iframe.contentDocument;
    const owningWindow = ownerDocument?.defaultView;
    if (!ownerDocument || !owningWindow) throw new TypeError("Expected a same-origin iframe document and window.");
    const owningConstructor = owningWindow.ShadowRoot;
    // Happy DOM shares constructors across frames. Model native parent/child
    // identity by replacing only the ambient constructor, never iframe DOM/APIs.
    class AmbientShadowRoot extends originalConstructor {}
    vi.stubGlobal("ShadowRoot", AmbientShadowRoot);
    expect(ShadowRoot).toBe(AmbientShadowRoot);
    expect(owningWindow.ShadowRoot).toBe(owningConstructor);
    expect(owningWindow.ShadowRoot).not.toBe(ShadowRoot);

    run(ownerDocument, owningConstructor);

    expect(owningWindow.ShadowRoot).toBe(owningConstructor);
  } finally {
    vi.unstubAllGlobals();
    iframe.remove();
  }
  expect(ShadowRoot).toBe(originalConstructor);
}

interface ElementRealmConstructors {
  readonly HTMLElement: typeof HTMLElement;
  readonly HTMLDetailsElement: typeof HTMLDetailsElement;
  readonly HTMLFieldSetElement: typeof HTMLFieldSetElement;
  readonly HTMLLegendElement: typeof HTMLLegendElement;
}

const ELEMENT_REALM_CONSTRUCTORS = ["HTMLElement", "HTMLDetailsElement", "HTMLFieldSetElement", "HTMLLegendElement"] as const;

function withIframeElementConstructors(
  run: (ownerDocument: Document, container: HTMLDivElement, owning: ElementRealmConstructors) => void,
): void {
  const ambient: ElementRealmConstructors = {HTMLElement, HTMLDetailsElement, HTMLFieldSetElement, HTMLLegendElement};
  const iframe = document.createElement("iframe");
  iframe.title = "FocusScope element realm";
  document.body.append(iframe);
  try {
    const ownerDocument = iframe.contentDocument;
    const owningWindow = ownerDocument?.defaultView;
    if (!ownerDocument || !owningWindow) throw new TypeError("Expected a same-origin iframe document and window.");
    const owning: ElementRealmConstructors = {
      HTMLElement: owningWindow.HTMLElement,
      HTMLDetailsElement: owningWindow.HTMLDetailsElement,
      HTMLFieldSetElement: owningWindow.HTMLFieldSetElement,
      HTMLLegendElement: owningWindow.HTMLLegendElement,
    };
    // Happy DOM shares element constructors across frames. Model native parent/child
    // identity by replacing only the ambient constructors, never iframe DOM/APIs.
    vi.stubGlobal("HTMLElement", class AmbientHTMLElement extends ambient.HTMLElement {});
    vi.stubGlobal("HTMLDetailsElement", class AmbientHTMLDetailsElement extends ambient.HTMLDetailsElement {});
    vi.stubGlobal("HTMLFieldSetElement", class AmbientHTMLFieldSetElement extends ambient.HTMLFieldSetElement {});
    vi.stubGlobal("HTMLLegendElement", class AmbientHTMLLegendElement extends ambient.HTMLLegendElement {});
    for (const name of ELEMENT_REALM_CONSTRUCTORS) {
      expect(globalThis[name]).not.toBe(ambient[name]);
      expect(owningWindow[name]).toBe(owning[name]);
      expect(owningWindow[name]).not.toBe(globalThis[name]);
    }
    const container = ownerDocument.createElement("div");
    ownerDocument.body.append(container);

    run(ownerDocument, container, owning);

    for (const name of ELEMENT_REALM_CONSTRUCTORS) expect(owningWindow[name]).toBe(owning[name]);
  } finally {
    vi.unstubAllGlobals();
    iframe.remove();
  }
  for (const name of ELEMENT_REALM_CONSTRUCTORS) expect(globalThis[name]).toBe(ambient[name]);
}

/** Walks forward through `order` and back again, including both wrap transitions. */
async function expectTabCycle(user: UserEvent, order: readonly HTMLElement[]): Promise<void> {
  const [first] = order;
  if (!first) throw new TypeError("Expected at least one tab stop.");
  first.focus();
  for (const expected of [...order.slice(1), first]) {
    await user.tab();
    expect(expected).toHaveFocus();
  }
  for (const expected of order.toReversed()) {
    await user.tab({shift: true});
    expect(expected).toHaveFocus();
  }
}

function renderVisibilityBoundary(kind: "shadow-host" | "slot-fallback"): {
  owner: HTMLElement;
  visible: HTMLButtonElement;
  last: HTMLButtonElement;
  unmount: () => void;
} {
  const visibleRef = createRef<HTMLButtonElement>();
  const slotRef = createRef<HTMLSlotElement>();
  const lastRef = createRef<HTMLButtonElement>();
  const {unmount} = render(
    <FocusScope restoreFocus={false}>
      <ShadowWidget label='Visibility boundary'>
        {kind === "shadow-host" ? (
          <button
            type='button'
            ref={visibleRef}>
            Visible shadow override
          </button>
        ) : (
          <slot ref={slotRef}>
            <button
              type='button'
              ref={visibleRef}>
              Visible fallback override
            </button>
          </slot>
        )}
      </ShadowWidget>
      <button
        type='button'
        ref={lastRef}>
        After visibility boundary
      </button>
    </FocusScope>,
  );
  const owner = kind === "shadow-host" ? screen.getByRole("group", {name: "Visibility boundary"}) : slotRef.current;
  const visible = visibleRef.current;
  const last = lastRef.current;
  if (!owner || !visible || !last) throw new TypeError("Expected a visibility boundary and its controls.");
  return {owner, visible, last, unmount};
}

interface ReprojectedSlotFixture {
  readonly firstOwner: HTMLSlotElement;
  readonly secondOwner: HTMLSlotElement;
  readonly first: HTMLButtonElement;
  readonly second: HTMLButtonElement;
  readonly fallback: HTMLButtonElement;
  readonly last: HTMLButtonElement;
}

function withReprojectedSlots(run: (fixture: ReprojectedSlotFixture) => void, assignment: "elements" | "text" | "none" = "elements"): void {
  const outerHost = document.createElement("div");
  document.body.append(outerHost);
  const outerShadow = outerHost.attachShadow({mode: "open"});
  const innerHost = document.createElement("div");
  outerShadow.append(innerHost);
  const innerShadow = innerHost.attachShadow({mode: "open"});
  const receiverRef = createRef<HTMLSlotElement>();
  const firstOwnerRef = createRef<HTMLSlotElement>();
  const secondOwnerRef = createRef<HTMLSlotElement>();
  const firstRef = createRef<HTMLButtonElement>();
  const secondRef = createRef<HTMLButtonElement>();
  const fallbackRef = createRef<HTMLButtonElement>();
  const lastRef = createRef<HTMLButtonElement>();
  const {unmount} = render(
    createPortal(
      <FocusScope restoreFocus={false}>
        <slot
          name='forwarded'
          ref={receiverRef}>
          <button type='button'>Unused receiving fallback</button>
        </slot>
        <button
          type='button'
          ref={lastRef}>
          After reprojected controls
        </button>
        {createPortal(
          <>
            <slot
              name={assignment === "elements" ? "outer-first" : undefined}
              slot='forwarded'
              ref={firstOwnerRef}>
              <button
                type='button'
                ref={fallbackRef}>
                Intermediate fallback
              </button>
            </slot>
            <slot
              name='outer-second'
              slot='forwarded'
              ref={secondOwnerRef}
            />
          </>,
          innerHost,
        )}
        {createPortal(
          <>
            {assignment === "text" && "Assigned text hides the intermediate fallback"}
            <button
              type='button'
              slot={assignment === "elements" ? "outer-first" : "unassigned-first"}
              ref={firstRef}>
              First projected control
            </button>
            <button
              type='button'
              slot='outer-second'
              ref={secondRef}>
              Second projected control
            </button>
          </>,
          outerHost,
        )}
      </FocusScope>,
      innerShadow,
    ),
  );
  try {
    const receiver = receiverRef.current;
    const firstOwner = firstOwnerRef.current;
    const secondOwner = secondOwnerRef.current;
    const first = firstRef.current;
    const second = secondRef.current;
    const fallback = fallbackRef.current;
    const last = lastRef.current;
    if (!receiver || !firstOwner || !secondOwner || !first || !second || !fallback || !last) {
      throw new TypeError("Expected both real projection boundaries and their controls.");
    }
    expect(receiver.getRootNode()).toBe(innerShadow);
    expect(receiver.assignedElements()).toEqual([firstOwner, secondOwner]);
    expect(firstOwner.getRootNode()).toBe(outerShadow);
    expect(secondOwner.assignedElements()).toEqual([second]);
    run({firstOwner, secondOwner, first, second, fallback, last});
  } finally {
    unmount();
    outerHost.remove();
  }
}

describe("FocusScope", () => {
  describe.each(["shadow-host", "slot-fallback"] as const)("%s availability", (kind) => {
    it("keeps an explicitly visible descendant of a visibility-hidden owner eligible", () => {
      const {owner, visible, last, unmount} = renderVisibilityBoundary(kind);
      try {
        owner.style.visibility = "hidden";
        visible.style.visibility = "visible";
        expect(getComputedStyle(owner).visibility).toBe("hidden");
        expect(getComputedStyle(visible).visibility).toBe("visible");
        last.focus();

        expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
        expectTreeFocus(visible);
        expect(fireEvent.keyDown(visible, {key: "Tab", composed: true})).toBe(true);
        expectTreeFocus(visible);
        expect(fireEvent.keyDown(visible, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
        expectTreeFocus(last);
      } finally {
        unmount();
      }
    });

    it.each(["hidden", "inert", "display-none", "negative-tabindex"] as const)(
      "does not let a visible override escape a true subtree exclusion (%s)",
      (excluded) => {
        const {owner, visible, last, unmount} = renderVisibilityBoundary(kind);
        try {
          owner.style.visibility = "hidden";
          visible.style.visibility = "visible";
          if (excluded === "display-none") owner.style.display = "none";
          else if (excluded === "negative-tabindex") owner.tabIndex = -1;
          else owner.setAttribute(excluded, "");
          last.focus();

          expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
          expectTreeFocus(last);
          expect(fireEvent.keyDown(last, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
          expectTreeFocus(last);
        } finally {
          unmount();
        }
      },
    );
  });

  it("keeps reprojected positive tabindex owners in scope order even when only their descendants are visible", () => {
    withReprojectedSlots(({firstOwner, secondOwner, first, second, last}) => {
      firstOwner.tabIndex = 2;
      secondOwner.tabIndex = 1;
      firstOwner.style.visibility = "hidden";
      secondOwner.style.visibility = "hidden";
      first.style.visibility = "visible";
      second.style.visibility = "visible";
      expect(firstOwner.assignedElements()).toEqual([first]);
      last.focus();

      expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
      expectTreeFocus(second);
      expect(fireEvent.keyDown(second, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
      expectTreeFocus(last);
    });
  });

  describe.each(["contents", "block"] as const)("visible positive slot owners with display:%s", (display) => {
    it.each(["autofocus", "edge-wrap"] as const)("selects the correct first target on %s without erasing owner order", (entry) => {
      const host = document.createElement("div");
      document.body.append(host);
      const shadow = host.attachShadow({mode: "open"});
      const firstOwnerRef = createRef<HTMLSlotElement>();
      const secondOwnerRef = createRef<HTMLSlotElement>();
      const firstRef = createRef<HTMLButtonElement>();
      const secondRef = createRef<HTMLButtonElement>();
      const lastRef = createRef<HTMLButtonElement>();
      const tree = (autoFocus: boolean): React.ReactPortal =>
        createPortal(
          <FocusScope
            autoFocus={autoFocus}
            restoreFocus={false}>
            <slot
              name='positive-first'
              tabIndex={2}
              ref={firstOwnerRef}
            />
            <slot
              name='positive-second'
              tabIndex={1}
              ref={secondOwnerRef}
            />
            <button
              type='button'
              ref={lastRef}>
              After visible slot owners
            </button>
            {createPortal(
              <>
                <button
                  type='button'
                  slot='positive-first'
                  ref={firstRef}>
                  First assigned positive action
                </button>
                <button
                  type='button'
                  slot='positive-second'
                  ref={secondRef}>
                  Second assigned positive action
                </button>
              </>,
              host,
            )}
          </FocusScope>,
          shadow,
        );
      const {rerender, unmount} = render(tree(false));
      try {
        const firstOwner = firstOwnerRef.current;
        const secondOwner = secondOwnerRef.current;
        const first = firstRef.current;
        const second = secondRef.current;
        const last = lastRef.current;
        if (!firstOwner || !secondOwner || !first || !second || !last) throw new TypeError("Expected visible positive slot owners.");
        // Model the native-proven contents baseline and block override explicitly,
        // without relying on Happy DOM's UA stylesheet or focus-box emulation.
        for (const owner of [firstOwner, secondOwner]) {
          owner.style.display = display;
          owner.style.visibility = "visible";
          expect(getComputedStyle(owner).display).toBe(display);
          expect(getComputedStyle(owner).visibility).toBe("visible");
        }
        expect(firstOwner.assignedElements()).toEqual([first]);
        expect(secondOwner.assignedElements()).toEqual([second]);
        const firstTarget = display === "contents" ? second : secondOwner;

        if (entry === "autofocus") rerender(tree(true));
        else {
          last.focus();
          expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
        }

        expectTreeFocus(firstTarget);
        expect(fireEvent.keyDown(firstTarget, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
        expectTreeFocus(last);
        expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
        expectTreeFocus(firstTarget);
      } finally {
        unmount();
        host.remove();
      }
    });
  });

  it("excludes a reprojected intermediate owner's entire negative-tabindex scope", () => {
    withReprojectedSlots(({firstOwner, first, second, last}) => {
      firstOwner.tabIndex = -1;
      expect(firstOwner.assignedElements()).toEqual([first]);
      last.focus();

      expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
      expectTreeFocus(second);
      expect(fireEvent.keyDown(second, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
      expectTreeFocus(last);
    });
  });

  it.each(["hidden", "inert", "display-none"] as const)("honors reprojected intermediate subtree availability (%s)", (excluded) => {
    withReprojectedSlots(({firstOwner, second, last}) => {
      if (excluded === "display-none") firstOwner.style.display = "none";
      else firstOwner.setAttribute(excluded, "");
      last.focus();

      expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
      expectTreeFocus(second);
    });
  });

  it("uses an intermediate slot's fallback when it has no assigned nodes", () => {
    withReprojectedSlots(({firstOwner, fallback, last}) => {
      expect(firstOwner.assignedNodes()).toEqual([]);
      last.focus();

      expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
      expectTreeFocus(fallback);
    }, "none");
  });

  it("does not invent fallback controls for an intermediate text-only assignment", () => {
    withReprojectedSlots(({firstOwner, second, last}) => {
      const assigned = firstOwner.assignedNodes();
      expect(assigned).toHaveLength(1);
      expect(assigned[0]?.nodeType).toBe(Node.TEXT_NODE);
      expect(firstOwner.assignedElements()).toEqual([]);
      last.focus();

      expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
      expectTreeFocus(second);
    }, "text");
  });

  it("uses the iframe's unchanged ShadowRoot constructor when collecting projected slot candidates", () => {
    withIframeShadowConstructor((ownerDocument, owningConstructor) => {
      const host = ownerDocument.createElement("div");
      ownerDocument.body.append(host);
      const shadow = host.attachShadow({mode: "open"});
      const firstRef = createRef<HTMLButtonElement>();
      const lastRef = createRef<HTMLButtonElement>();
      const slotRef = createRef<HTMLSlotElement>();
      const seen: string[] = [];
      const {unmount} = render(
        createPortal(
          <FocusScope
            restoreFocus={false}
            onKeyDown={(event) => seen.push(event.key)}>
            <slot
              name='foreign-actions'
              ref={slotRef}>
              <button type='button'>Unused foreign fallback</button>
            </slot>
            {createPortal(
              <>
                <button
                  type='button'
                  slot='foreign-actions'
                  ref={firstRef}>
                  Foreign projected first
                </button>
                <button
                  type='button'
                  slot='foreign-actions'
                  ref={lastRef}>
                  Foreign projected last
                </button>
              </>,
              host,
            )}
          </FocusScope>,
          shadow,
        ),
      );
      try {
        const first = firstRef.current;
        const last = lastRef.current;
        const slot = slotRef.current;
        if (!first || !last || !slot) throw new TypeError("Expected the iframe's projected controls.");
        expect(shadow).toBeInstanceOf(owningConstructor);
        expect(shadow).not.toBeInstanceOf(ShadowRoot);
        expect(shadow.ownerDocument).toBe(ownerDocument);
        expect(first.ownerDocument).toBe(ownerDocument);
        expect(slot.getRootNode()).toBe(shadow);
        expect(slot.assignedElements()).toEqual([first, last]);
        first.focus();
        expect(ownerDocument.activeElement).toBe(first);
        expect(shadow.activeElement).toBeNull();

        const nativeInterior = fireEvent.keyDown(first, {key: "Tab", composed: true});
        expect(seen).toEqual(["Tab"]);
        expect(nativeInterior).toBe(true);
        expect(ownerDocument.activeElement).toBe(first);
        last.focus();
        expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
        expect(ownerDocument.activeElement).toBe(first);
        expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
        expect(ownerDocument.activeElement).toBe(last);
      } finally {
        unmount();
      }
    });
  });

  it("uses the iframe's unchanged ShadowRoot constructor to read its own closed tree's active element", () => {
    withIframeShadowConstructor((ownerDocument, owningConstructor) => {
      const host = ownerDocument.createElement("div");
      ownerDocument.body.append(host);
      const shadow = host.attachShadow({mode: "closed"});
      const firstRef = createRef<HTMLButtonElement>();
      const middleRef = createRef<HTMLButtonElement>();
      const lastRef = createRef<HTMLButtonElement>();
      const seen: string[] = [];
      const {unmount} = render(
        createPortal(
          <FocusScope
            autoFocus
            restoreFocus={false}
            onKeyDown={(event) => seen.push(event.key)}>
            <button
              type='button'
              ref={firstRef}>
              Foreign closed first
            </button>
            <button
              type='button'
              ref={middleRef}>
              Foreign closed middle
            </button>
            <button
              type='button'
              ref={lastRef}>
              Foreign closed last
            </button>
          </FocusScope>,
          shadow,
        ),
      );
      try {
        const first = firstRef.current;
        const middle = middleRef.current;
        const last = lastRef.current;
        if (!first || !middle || !last) throw new TypeError("Expected the iframe's closed-tree controls.");
        expect(shadow).toBeInstanceOf(owningConstructor);
        expect(shadow).not.toBeInstanceOf(ShadowRoot);
        expect(shadow.ownerDocument).toBe(ownerDocument);
        expect(middle.ownerDocument).toBe(ownerDocument);
        expect(host.shadowRoot).toBeNull();
        expect(ownerDocument.activeElement).toBe(host);
        expect(shadow.activeElement).toBe(first);
        middle.focus();

        const nativeInterior = fireEvent.keyDown(middle, {key: "Tab", composed: true});
        expect(seen).toEqual(["Tab"]);
        expect(nativeInterior).toBe(true);
        expect(shadow.activeElement).toBe(middle);
        last.focus();
        expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
        expect(shadow.activeElement).toBe(first);
        expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
        expect(shadow.activeElement).toBe(last);
      } finally {
        unmount();
      }
    });
  });

  it("restores an iframe-owned entry focus owner with that document's HTMLElement constructor", () => {
    withIframeElementConstructors((ownerDocument, container, owning) => {
      const triggerRef = createRef<HTMLButtonElement>();
      const actionRef = createRef<HTMLButtonElement>();
      const tree = (open: boolean): React.ReactElement => (
        <>
          <button
            type='button'
            ref={triggerRef}>
            Foreign trigger
          </button>
          {open && (
            <FocusScope autoFocus>
              <button
                type='button'
                ref={actionRef}>
                Foreign scope action
              </button>
            </FocusScope>
          )}
        </>
      );
      const {rerender, unmount} = render(tree(false), {container, baseElement: ownerDocument.body});
      try {
        const trigger = triggerRef.current;
        if (!trigger) throw new TypeError("Expected the iframe's trigger.");
        expect(trigger).toBeInstanceOf(owning.HTMLElement);
        expect(trigger).not.toBeInstanceOf(HTMLElement);
        trigger.focus();
        expect(ownerDocument.activeElement).toBe(trigger);
        rerender(tree(true));
        expect(ownerDocument.activeElement).toBe(actionRef.current);

        rerender(tree(false));

        expect(ownerDocument.activeElement).toBe(trigger);
      } finally {
        unmount();
      }
    });
  });

  it("uses the iframe's details constructor for its first summary stop and closed content", () => {
    withIframeElementConstructors((ownerDocument, container, owning) => {
      const firstRef = createRef<HTMLButtonElement>();
      const detailsRef = createRef<HTMLDetailsElement>();
      const summaryRef = createRef<HTMLElement>();
      const closedRef = createRef<HTMLButtonElement>();
      const {unmount} = render(
        <FocusScope
          autoFocus
          restoreFocus={false}>
          <button
            type='button'
            ref={firstRef}>
            Foreign first available
          </button>
          <details ref={detailsRef}>
            <summary ref={summaryRef}>Foreign summary</summary>
            <button
              type='button'
              ref={closedRef}>
              Foreign closed final action
            </button>
          </details>
        </FocusScope>,
        {container, baseElement: ownerDocument.body},
      );
      try {
        const first = firstRef.current;
        const details = detailsRef.current;
        const summary = summaryRef.current;
        if (!first || !details || !summary || !closedRef.current) throw new TypeError("Expected the iframe's details controls.");
        expect(details).toBeInstanceOf(owning.HTMLDetailsElement);
        expect(details).not.toBeInstanceOf(HTMLDetailsElement);
        expect(details.open).toBe(false);
        expect(ownerDocument.activeElement).toBe(first);

        // The summary is the final stop; the closed details' content never becomes an edge.
        expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true})).toBe(false);
        expect(ownerDocument.activeElement).toBe(summary);
        expect(fireEvent.keyDown(summary, {key: "Tab"})).toBe(false);
        expect(ownerDocument.activeElement).toBe(first);
      } finally {
        unmount();
      }
    });
  });

  it("uses the iframe's fieldset and legend constructors for disabled-fieldset exclusion", () => {
    withIframeElementConstructors((ownerDocument, container, owning) => {
      const fieldsetRef = createRef<HTMLFieldSetElement>();
      const legendRef = createRef<HTMLLegendElement>();
      const firstRef = createRef<HTMLButtonElement>();
      const legendActionRef = createRef<HTMLButtonElement>();
      const {unmount} = render(
        <FocusScope restoreFocus={false}>
          <button
            type='button'
            ref={firstRef}>
            Foreign first
          </button>
          <fieldset
            disabled
            ref={fieldsetRef}>
            <legend ref={legendRef}>
              <button
                type='button'
                ref={legendActionRef}>
                Foreign legend exception
              </button>
            </legend>
            <button type='button'>Foreign disabled fieldset content</button>
          </fieldset>
        </FocusScope>,
        {container, baseElement: ownerDocument.body},
      );
      try {
        const fieldset = fieldsetRef.current;
        const legend = legendRef.current;
        const first = firstRef.current;
        const legendAction = legendActionRef.current;
        if (!fieldset || !legend || !first || !legendAction) throw new TypeError("Expected the iframe's fieldset controls.");
        expect(fieldset).toBeInstanceOf(owning.HTMLFieldSetElement);
        expect(fieldset).not.toBeInstanceOf(HTMLFieldSetElement);
        expect(legend).toBeInstanceOf(owning.HTMLLegendElement);
        expect(legend).not.toBeInstanceOf(HTMLLegendElement);

        first.focus();
        expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true})).toBe(false);
        expect(ownerDocument.activeElement).toBe(legendAction);
        expect(fireEvent.keyDown(legendAction, {key: "Tab"})).toBe(false);
        expect(ownerDocument.activeElement).toBe(first);
      } finally {
        unmount();
      }
    });
  });

  it("delegates interior Tab from direct and nested light controls projected into its own shadow-tree slot", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({mode: "open"});
    const firstRef = createRef<HTMLButtonElement>();
    const middleRef = createRef<HTMLButtonElement>();
    const lastRef = createRef<HTMLButtonElement>();
    const slotRef = createRef<HTMLSlotElement>();
    const seen: string[] = [];
    const {unmount} = render(
      createPortal(
        <FocusScope
          restoreFocus={false}
          onKeyDown={(event) => seen.push(event.key)}>
          <slot
            name='actions'
            ref={slotRef}
          />
          {createPortal(
            <>
              <button
                type='button'
                slot='actions'
                ref={firstRef}>
                Projected first
              </button>
              <div slot='actions'>
                <button
                  type='button'
                  ref={middleRef}>
                  Projected middle
                </button>
              </div>
              <button
                type='button'
                slot='actions'
                ref={lastRef}>
                Projected last
              </button>
            </>,
            host,
          )}
        </FocusScope>,
        shadow,
      ),
    );
    try {
      const first = firstRef.current;
      const middle = middleRef.current;
      const last = lastRef.current;
      const slot = slotRef.current;
      if (!first || !middle || !last || !slot) throw new TypeError("Expected projected scope controls.");
      expect(slot.getRootNode()).toBe(shadow);
      expect(slot.assignedElements()).toEqual([first, middle.parentElement, last]);
      expect(first.getRootNode()).toBe(document);
      expect(slot.parentElement?.contains(first)).toBe(false);
      first.focus();
      expect(document.activeElement).toBe(first);
      expect(shadow.activeElement).toBeNull();

      const nativeInterior = fireEvent.keyDown(first, {key: "Tab", composed: true});
      expect(seen).toEqual(["Tab"]);
      expect(nativeInterior).toBe(true);
      expect(document.activeElement).toBe(first);
      middle.focus();
      expect(fireEvent.keyDown(middle, {key: "Tab", composed: true})).toBe(true);
      expect(document.activeElement).toBe(middle);
      expect(fireEvent.keyDown(middle, {key: "Tab", shiftKey: true, composed: true})).toBe(true);
      last.focus();
      expect(fireEvent.keyDown(last, {key: "Tab", shiftKey: true, composed: true})).toBe(true);
      expect(document.activeElement).toBe(last);
    } finally {
      unmount();
      host.remove();
    }
  });

  it.each(["first", "last"] as const)("wraps at the actual %s projected edge of a shadow-owned scope", (position) => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({mode: "open"});
    const projectedFirstRef = createRef<HTMLButtonElement>();
    const projectedLastRef = createRef<HTMLButtonElement>();
    const internalRef = createRef<HTMLButtonElement>();
    const {unmount} = render(
      createPortal(
        <FocusScope restoreFocus={false}>
          {position === "last" && (
            <button
              type='button'
              ref={internalRef}>
              Shadow before slot
            </button>
          )}
          <slot name='edges' />
          {position === "first" && (
            <button
              type='button'
              ref={internalRef}>
              Shadow after slot
            </button>
          )}
          {createPortal(
            <>
              <button
                type='button'
                slot='edges'
                ref={projectedFirstRef}>
                Projected edge first
              </button>
              <button
                type='button'
                slot='edges'
                ref={projectedLastRef}>
                Projected edge last
              </button>
            </>,
            host,
          )}
        </FocusScope>,
        shadow,
      ),
    );
    try {
      const projectedFirst = projectedFirstRef.current;
      const projectedLast = projectedLastRef.current;
      const internal = internalRef.current;
      if (!projectedFirst || !projectedLast || !internal) throw new TypeError("Expected both projected and internal edges.");
      const first = position === "first" ? projectedFirst : internal;
      const last = position === "last" ? projectedLast : internal;
      last.focus();

      expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
      expectTreeFocus(first);
      first.focus();
      expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
      expectTreeFocus(last);
    } finally {
      unmount();
      host.remove();
    }
  });

  it("advances a projected unchecked radio alias through its assigned ancestor instead of resetting to the representative", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({mode: "open"});
    const firstRef = createRef<HTMLInputElement>();
    const aliasRef = createRef<HTMLInputElement>();
    const nextRef = createRef<HTMLButtonElement>();
    const external = document.createElement("input");
    external.type = "radio";
    external.name = "projected-group";
    document.body.append(external);
    const {unmount} = render(
      createPortal(
        <FocusScope restoreFocus={false}>
          <slot name='representative' />
          <button
            type='button'
            ref={nextRef}>
            After projected group
          </button>
          <slot name='alias' />
          {createPortal(
            <>
              <label slot='representative'>
                <input
                  type='radio'
                  name='projected-group'
                  ref={firstRef}
                />
                Projected representative
              </label>
              <div slot='alias'>
                <label>
                  <input
                    type='radio'
                    name='projected-group'
                    ref={aliasRef}
                  />
                  Projected alias
                </label>
              </div>
            </>,
            host,
          )}
        </FocusScope>,
        shadow,
      ),
    );
    try {
      const representative = firstRef.current;
      const alias = aliasRef.current;
      const next = nextRef.current;
      if (!representative || !alias || !next) throw new TypeError("Expected the projected radio group.");
      const aliasSlot = shadow.querySelector<HTMLSlotElement>('slot[name="alias"]');
      expect(aliasSlot?.assignedElements()).toEqual([alias.closest('[slot="alias"]')]);
      expect(shadow.contains(alias)).toBe(false);
      alias.focus();
      expect(document.activeElement).toBe(alias);
      expect(shadow.activeElement).toBeNull();

      expect(fireEvent.keyDown(alias, {key: "Tab", composed: true})).toBe(false);
      expect(shadow.activeElement).toBe(next);
      expect(representative).not.toBeChecked();
      expect(alias).not.toBeChecked();

      // Sharing a native radio group does not make an unprojected peer a member.
      external.focus();
      expect(fireEvent.keyDown(next, {key: "Tab", composed: true})).toBe(false);
      expect(document.activeElement).toBe(representative);
      expect(external).not.toBeChecked();
    } finally {
      unmount();
      external.remove();
      host.remove();
    }
  });

  it("captures and restores a projected focus owner when the scope's owning shadow root has no activeElement", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({mode: "open"});
    const invokerRef = createRef<HTMLButtonElement>();
    const actionRef = createRef<HTMLButtonElement>();
    const tree = (mounted: boolean): React.ReactPortal =>
      createPortal(
        <>
          <slot name='invoker' />
          {createPortal(
            <button
              type='button'
              slot='invoker'
              ref={invokerRef}>
              Projected invoker
            </button>,
            host,
          )}
          {mounted && (
            <FocusScope autoFocus>
              <button
                type='button'
                ref={actionRef}>
                Shadow scope action
              </button>
            </FocusScope>
          )}
        </>,
        shadow,
      );
    const {rerender, unmount} = render(tree(false));
    try {
      const invoker = invokerRef.current;
      if (!invoker) throw new TypeError("Expected the projected invoker.");
      invoker.focus();
      expect(document.activeElement).toBe(invoker);
      expect(shadow.activeElement).toBeNull();
      rerender(tree(true));
      expect(shadow.activeElement).toBe(actionRef.current);

      rerender(tree(false));

      expect(document.activeElement).toBe(invoker);
      expect(shadow.activeElement).toBeNull();
    } finally {
      unmount();
      host.remove();
    }
  });

  it.each(["first", "middle", "last", "only"] as const)(
    "preserves native interior Tab in a focusable shadow widget at the %s scope position",
    (position) => {
      render(
        <FocusScope>
          {(position === "middle" || position === "last") && <button type='button'>Before widget</button>}
          <ShadowWidget tabIndex={0}>
            <button type='button'>Shadow first</button>
            <button type='button'>Shadow middle</button>
            <button type='button'>Shadow last</button>
          </ShadowWidget>
          {(position === "first" || position === "middle") && <button type='button'>After widget</button>}
        </FocusScope>,
      );
      const host = screen.getByRole("group", {name: "Shadow widget"});
      const {shadow, first, middle, last} = getShadowButtons(host);

      // Happy DOM does not implement the browser's default shadow Tab traversal.
      // Dispatch real composed events and distinguish delegation from controller moves.
      first.focus();
      expect(document.activeElement).toBe(host);
      expect(shadow.activeElement).toBe(first);
      expect(fireEvent.keyDown(first, {key: "Tab", composed: true})).toBe(true);
      expectTreeFocus(first);
      middle.focus();
      expect(fireEvent.keyDown(middle, {key: "Tab", shiftKey: true, composed: true})).toBe(true);
      expectTreeFocus(middle);
      expect(fireEvent.keyDown(middle, {key: "Tab", composed: true})).toBe(true);
      expectTreeFocus(middle);
      last.focus();
      expect(fireEvent.keyDown(last, {key: "Tab", shiftKey: true, composed: true})).toBe(true);
      expectTreeFocus(last);
    },
  );

  describe.each([true, false])("shadow widget with a tabbable host: %s", (tabbableHost) => {
    it.each(["first", "middle", "last", "only"] as const)("wraps only at the actual %s scope edges", (position) => {
      render(
        <FocusScope>
          {(position === "middle" || position === "last") && <button type='button'>Before widget</button>}
          <ShadowWidget tabIndex={tabbableHost ? 0 : undefined}>
            <button type='button'>Shadow first</button>
            <button type='button'>Shadow middle</button>
            <button type='button'>Shadow last</button>
          </ShadowWidget>
          {(position === "first" || position === "middle") && <button type='button'>After widget</button>}
        </FocusScope>,
      );
      const host = screen.getByRole("group", {name: "Shadow widget"});
      const {first, last} = getShadowButtons(host);
      const before = screen.queryByRole("button", {name: "Before widget"});
      const after = screen.queryByRole("button", {name: "After widget"});
      const scopeFirst = before ?? (tabbableHost ? host : first);
      const scopeLast = after ?? last;

      if (tabbableHost) {
        host.focus();
        expect(fireEvent.keyDown(host, {key: "Tab", composed: true})).toBe(true);
        expectTreeFocus(host);
      }
      if (tabbableHost || before) {
        first.focus();
        expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(true);
        expectTreeFocus(first);
      }
      if (after) {
        last.focus();
        expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(true);
        expectTreeFocus(last);
      }

      scopeLast.focus();
      expect(fireEvent.keyDown(scopeLast, {key: "Tab", composed: true})).toBe(false);
      expectTreeFocus(scopeFirst);
      scopeFirst.focus();
      expect(fireEvent.keyDown(scopeFirst, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
      expectTreeFocus(scopeLast);
    });
  });

  it("keeps nested open shadow widgets in their host position without flattening positive tabindex across trees", () => {
    render(
      <FocusScope>
        <button
          type='button'
          tabIndex={2}>
          First outer priority
        </button>
        <ShadowWidget
          label='Outer shadow widget'
          tabIndex={3}>
          <ShadowWidget
            label='Nested shadow widget'
            tabIndex={0}>
            <button
              type='button'
              tabIndex={4}>
              Shadow first
            </button>
            <button
              type='button'
              tabIndex={1}>
              Shadow middle
            </button>
            <button type='button'>Shadow last</button>
          </ShadowWidget>
        </ShadowWidget>
      </FocusScope>,
    );
    const before = screen.getByRole("button", {name: "First outer priority"});
    const host = screen.getByRole("group", {name: "Outer shadow widget"});
    const nestedHost = host.shadowRoot?.querySelector<HTMLElement>('[role="group"]');
    if (!nestedHost) throw new TypeError("Expected a nested shadow widget.");
    const {first, middle, last} = getShadowButtons(nestedHost);

    host.focus();
    expect(fireEvent.keyDown(host, {key: "Tab", composed: true})).toBe(true);
    // Happy DOM cannot read the inner root's activeElement when only its host
    // is focused. Verify deep focus and retargeted host delivery without a shim;
    // native intermediate-host entry remains a browser-validation obligation.
    middle.focus();
    expect(host.shadowRoot?.activeElement).toBe(nestedHost);
    expect(fireEvent.keyDown(nestedHost, {key: "Tab", composed: true})).toBe(true);
    expectTreeFocus(middle);
    expect(fireEvent.keyDown(middle, {key: "Tab", composed: true})).toBe(true);
    expectTreeFocus(middle);
    first.focus();
    expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(true);
    expectTreeFocus(first);

    last.focus();
    expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
    expectTreeFocus(before);
    before.focus();
    expect(fireEvent.keyDown(before, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
    expectTreeFocus(last);
  });

  it("uses assigned slot content in shadow order without including unassigned light controls or slot fallback", () => {
    render(
      <FocusScope>
        <ShadowWidget
          lightChildren={
            <>
              <button
                type='button'
                slot='actions'>
                Slotted action
              </button>
              <button type='button'>Unassigned action</button>
            </>
          }>
          <button type='button'>Shadow first</button>
          <slot name='actions'>
            <button type='button'>Unused fallback</button>
          </slot>
          <button type='button'>Shadow last</button>
        </ShadowWidget>
      </FocusScope>,
    );
    const host = screen.getByRole("group", {name: "Shadow widget"});
    const shadow = host.shadowRoot;
    const first = shadow?.querySelector<HTMLButtonElement>("button");
    const last = shadow?.lastElementChild;
    if (!shadow || !first || !(last instanceof HTMLButtonElement)) throw new TypeError("Expected the shadow slot fixture.");
    const assigned = screen.getByRole("button", {name: "Slotted action"});
    expect(shadow.querySelector("slot")?.assignedElements()).toEqual([assigned]);

    assigned.focus();
    expect(fireEvent.keyDown(assigned, {key: "Tab", composed: true})).toBe(true);
    expectTreeFocus(assigned);
    expect(fireEvent.keyDown(assigned, {key: "Tab", shiftKey: true, composed: true})).toBe(true);
    last.focus();
    expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
    expectTreeFocus(first);
    expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
    expectTreeFocus(last);
  });

  it("reenters from the scope itself at the actual shadow edges rather than the widget host", () => {
    render(
      <FocusScope aria-label='Self-targeted scope'>
        <ShadowWidget>
          <button type='button'>Shadow first</button>
          <button type='button'>Shadow middle</button>
          <button type='button'>Shadow last</button>
        </ShadowWidget>
      </FocusScope>,
    );
    const scope = screen.getByRole("group", {name: "Self-targeted scope"});
    const {first, last} = getShadowButtons(screen.getByRole("group", {name: "Shadow widget"}));
    scope.focus();
    expect(fireEvent.keyDown(scope, {key: "Tab"})).toBe(false);
    expectTreeFocus(first);
    scope.focus();
    expect(fireEvent.keyDown(scope, {key: "Tab", shiftKey: true})).toBe(false);
    expectTreeFocus(last);
  });

  it("autofocuses the available shadow edge rather than hidden, inert, or disabled shadow controls", () => {
    const tree = (autoFocus: boolean): React.ReactElement => (
      <FocusScope autoFocus={autoFocus}>
        <ShadowWidget>
          <button
            type='button'
            hidden>
            Hidden shadow action
          </button>
          <div inert>
            <button type='button'>Inert shadow action</button>
          </div>
          <button
            type='button'
            disabled>
            Disabled shadow action
          </button>
          <button type='button'>Available shadow action</button>
        </ShadowWidget>
      </FocusScope>
    );
    const {rerender} = render(tree(false));
    const host = screen.getByRole("group", {name: "Shadow widget"});
    const available = host.shadowRoot?.lastElementChild;
    if (!(available instanceof HTMLButtonElement)) throw new TypeError("Expected the available shadow action.");

    rerender(tree(true));

    expectTreeFocus(available);
    expect(available).toHaveTextContent("Available shadow action");
  });

  it.each(["hidden", "inert", "display-none", "negative-tabindex"] as const)(
    "uses the scope fallback when its only shadow widget is unavailable (%s)",
    (unavailable) => {
      render(
        <FocusScope aria-label='Unavailable widget scope'>
          <ShadowWidget tabIndex={unavailable === "negative-tabindex" ? -1 : undefined}>
            <button type='button'>Shadow first</button>
            <button type='button'>Shadow middle</button>
            <button type='button'>Shadow last</button>
          </ShadowWidget>
        </FocusScope>,
      );
      const host = screen.getByRole("group", {name: "Shadow widget"});
      if (unavailable === "display-none") host.style.display = "none";
      else if (unavailable !== "negative-tabindex") host.setAttribute(unavailable, "");
      const scope = screen.getByRole("group", {name: "Unavailable widget scope"});
      scope.focus();

      expect(fireEvent.keyDown(scope, {key: "Tab"})).toBe(false);
      expectTreeFocus(scope);
      expect(fireEvent.keyDown(scope, {key: "Tab", shiftKey: true})).toBe(false);
      expectTreeFocus(scope);
    },
  );

  it.each(["contain-false", "consumer-cancellation"] as const)("preserves %s for composed shadow Tab events", (behavior) => {
    const seen: string[] = [];
    render(
      <FocusScope
        contain={behavior !== "contain-false"}
        onKeyDown={(event) => {
          seen.push(event.key);
          if (behavior === "consumer-cancellation") event.preventDefault();
        }}>
        <ShadowWidget>
          <button type='button'>Shadow first</button>
          <button type='button'>Shadow middle</button>
          <button type='button'>Shadow last</button>
        </ShadowWidget>
      </FocusScope>,
    );
    const {last} = getShadowButtons(screen.getByRole("group", {name: "Shadow widget"}));
    last.focus();

    expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(behavior === "contain-false");
    expectTreeFocus(last);
    expect(seen).toEqual(["Tab"]);
  });

  it("lets a contained scope inside an open shadow widget own interior navigation and both edges", () => {
    render(
      <FocusScope>
        <button type='button'>Before nested scope</button>
        <ShadowWidget tabIndex={0}>
          <FocusScope>
            <button type='button'>Shadow first</button>
            <button type='button'>Shadow middle</button>
            <button type='button'>Shadow last</button>
          </FocusScope>
        </ShadowWidget>
      </FocusScope>,
    );
    const {first, middle, last} = getShadowButtons(screen.getByRole("group", {name: "Shadow widget"}));
    middle.focus();
    expect(fireEvent.keyDown(middle, {key: "Tab", composed: true})).toBe(true);
    expectTreeFocus(middle);
    last.focus();
    expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
    expectTreeFocus(first);
    expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
    expectTreeFocus(last);
  });

  it.each(["open", "closed"] as const)("uses the %s owning shadow tree for interior Tab, edge wrapping, and restoration", (mode) => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({mode});
    const container = document.createElement("div");
    shadow.append(container);
    const tree = (mounted: boolean): React.ReactElement => (
      <>
        <button type='button'>Shadow invoker</button>
        {mounted && (
          <FocusScope autoFocus>
            <button type='button'>Shadow first</button>
            <button type='button'>Shadow middle</button>
            <button type='button'>Shadow last</button>
          </FocusScope>
        )}
      </>
    );
    const {getByRole, rerender, unmount} = render(tree(false), {container, baseElement: container});
    try {
      const invoker = getByRole("button", {name: "Shadow invoker"});
      invoker.focus();
      rerender(tree(true));
      const first = getByRole("button", {name: "Shadow first"});
      const middle = getByRole("button", {name: "Shadow middle"});
      const last = getByRole("button", {name: "Shadow last"});
      expect(document.activeElement).toBe(host);
      expect(shadow.activeElement).toBe(first);

      // Dispatch in the real owning tree. Native interior traversal is intentionally
      // delegated, so assert cancellation separately from the browser's default move.
      expect(fireEvent.keyDown(first, {key: "Tab", composed: true})).toBe(true);
      middle.focus();
      expect(fireEvent.keyDown(middle, {key: "Tab", shiftKey: true, composed: true})).toBe(true);
      last.focus();
      expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(false);
      expect(shadow.activeElement).toBe(first);
      expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
      expect(shadow.activeElement).toBe(last);

      rerender(tree(false));
      expect(shadow.activeElement).toBe(invoker);
      expect(document.activeElement).toBe(host);
    } finally {
      unmount();
      host.remove();
    }
  });

  it("restores the actual shadow descendant when a document-owned scope captured its host", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({mode: "open"});
    const invoker = document.createElement("button");
    shadow.append(invoker);
    invoker.focus();
    const {unmount} = render(
      <FocusScope autoFocus>
        <button>Document action</button>
      </FocusScope>,
    );
    expect(screen.getByRole("button", {name: "Document action"})).toHaveFocus();
    unmount();
    expect(shadow.activeElement).toBe(invoker);
    host.remove();
  });

  it("lets a contained child own native Tab from its representative even when that radio is an outer alias", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <label>
          <input
            type='radio'
            name='nested-forward-owner'
          />
          Outer unchecked choice
        </label>
        <button type='button'>Outer intervening action</button>
        <FocusScope>
          <label>
            <input
              type='radio'
              name='nested-forward-owner'
            />
            Inner unchecked choice
          </label>
          <button type='button'>Inner next action</button>
        </FocusScope>
      </FocusScope>,
    );
    screen.getByLabelText("Inner unchecked choice").focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "Inner next action"})).toHaveFocus();
    expect(screen.getByLabelText("Outer unchecked choice")).not.toBeChecked();
    expect(screen.getByLabelText("Inner unchecked choice")).not.toBeChecked();
  });

  it("lets a contained child own native Shift+Tab instead of an ancestor wrapping its outer radio alias", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <label>
          <input
            type='radio'
            name='nested-reverse-owner'
          />
          Outer reverse choice
        </label>
        <button type='button'>Outer intervening action</button>
        <FocusScope>
          <button type='button'>Inner previous action</button>
          <label>
            <input
              type='radio'
              name='nested-reverse-owner'
            />
            Inner reverse choice
          </label>
          <button type='button'>Inner next action</button>
        </FocusScope>
        <button type='button'>Outer final action</button>
      </FocusScope>,
    );
    screen.getByLabelText("Inner reverse choice").focus();

    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Inner previous action"})).toHaveFocus();
  });

  it("keeps both native interior navigation and forward/reverse wrapping inside the contained child", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <label>
          <input
            type='radio'
            name='nested-cycle-owner'
          />
          Outer cycle choice
        </label>
        <button type='button'>Outer cycle action</button>
        <FocusScope>
          <label>
            <input
              type='radio'
              name='nested-cycle-owner'
            />
            Inner cycle choice
          </label>
          <button type='button'>Inner cycle action</button>
        </FocusScope>
      </FocusScope>,
    );
    const choice = screen.getByLabelText("Inner cycle choice");
    const action = screen.getByRole("button", {name: "Inner cycle action"});
    choice.focus();

    await user.tab();
    expect(action).toHaveFocus();
    await user.tab();
    expect(choice).toHaveFocus();
    await user.tab({shift: true});
    expect(action).toHaveFocus();
    await user.tab({shift: true});
    expect(choice).toHaveFocus();
  });

  it("preserves consumer bubbling and an uncanceled native interior transition owned by the child", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    render(
      <div
        onKeyDown={(event) => {
          if (event.key === "Tab") seen.push(`ancestor:${event.defaultPrevented}`);
        }}>
        <FocusScope
          onKeyDown={(event) => {
            if (event.key === "Tab") seen.push(`outer:${event.defaultPrevented}`);
          }}>
          <label>
            <input
              type='radio'
              name='nested-bubble-owner'
            />
            Outer bubble choice
          </label>
          <button type='button'>Outer bubble action</button>
          <FocusScope
            onKeyDown={(event) => {
              if (event.key === "Tab") seen.push(`inner:${event.defaultPrevented}`);
            }}>
            <label>
              <input
                type='radio'
                name='nested-bubble-owner'
              />
              Inner bubble choice
            </label>
            <button type='button'>Inner bubble next</button>
          </FocusScope>
        </FocusScope>
      </div>,
    );
    screen.getByLabelText("Inner bubble choice").focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "Inner bubble next"})).toHaveFocus();
    expect(seen).toEqual(["inner:false", "outer:false", "ancestor:false"]);
  });

  it("still allows an ancestor consumer to cancel a child's native interior transition", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    render(
      <FocusScope
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            seen.push("outer");
            event.preventDefault();
          }
        }}>
        <label>
          <input
            type='radio'
            name='nested-cancel-owner'
          />
          Outer cancel choice
        </label>
        <button type='button'>Outer cancel action</button>
        <FocusScope
          onKeyDown={(event) => {
            if (event.key === "Tab") seen.push("inner");
          }}>
          <label>
            <input
              type='radio'
              name='nested-cancel-owner'
            />
            Inner cancel choice
          </label>
          <button type='button'>Inner canceled next</button>
        </FocusScope>
      </FocusScope>,
    );
    const choice = screen.getByLabelText("Inner cancel choice");
    choice.focus();

    await user.tab();

    expect(choice).toHaveFocus();
    expect(seen).toEqual(["inner", "outer"]);
  });

  it("lets the containing ancestor advance an alias in a non-contained child", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <label>
          <input
            type='radio'
            name='nested-pass-through'
          />
          Outer pass-through choice
        </label>
        <button type='button'>Outer pass-through action</button>
        <FocusScope contain={false}>
          <label>
            <input
              type='radio'
              name='nested-pass-through'
            />
            Inner pass-through choice
          </label>
          <button type='button'>Inner pass-through next</button>
        </FocusScope>
      </FocusScope>,
    );
    screen.getByLabelText("Inner pass-through choice").focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "Outer pass-through action"})).toHaveFocus();
  });

  it("updates keyboard ownership when child containment is disabled and re-enabled", async () => {
    const user = userEvent.setup();
    const content = (contain: boolean): React.JSX.Element => (
      <FocusScope>
        <label>
          <input
            type='radio'
            name='nested-toggle-owner'
          />
          Outer toggle choice
        </label>
        <button type='button'>Outer toggle action</button>
        <FocusScope contain={contain}>
          <label>
            <input
              type='radio'
              name='nested-toggle-owner'
            />
            Inner toggle choice
          </label>
          <button type='button'>Inner toggle next</button>
        </FocusScope>
      </FocusScope>
    );
    const {rerender} = render(content(true));
    const choice = screen.getByLabelText("Inner toggle choice");
    choice.focus();
    await user.tab();
    expect(screen.getByRole("button", {name: "Inner toggle next"})).toHaveFocus();

    rerender(content(false));
    choice.focus();
    await user.tab();
    expect(screen.getByRole("button", {name: "Outer toggle action"})).toHaveFocus();

    rerender(content(true));
    choice.focus();
    await user.tab();
    expect(screen.getByRole("button", {name: "Inner toggle next"})).toHaveFocus();
  });

  it("preserves the innermost contained owner through a non-contained intermediate scope", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <label>
          <input
            type='radio'
            name='nested-three-level'
          />
          Outermost choice
        </label>
        <button type='button'>Outermost intervening action</button>
        <FocusScope contain={false}>
          <FocusScope>
            <label>
              <input
                type='radio'
                name='nested-three-level'
              />
              Innermost choice
            </label>
            <button type='button'>Innermost next action</button>
          </FocusScope>
        </FocusScope>
      </FocusScope>,
    );
    screen.getByLabelText("Innermost choice").focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "Innermost next action"})).toHaveFocus();
  });

  it("wraps actual Tab after the first of two unchecked group peers rather than escaping past the second", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope autoFocus>
          <button type='button'>First scope action</button>
          <label>
            <input
              type='radio'
              name='unchecked-edge'
            />
            First unchecked choice
          </label>
          <label>
            <input
              type='radio'
              name='unchecked-edge'
            />
            Second unchecked choice
          </label>
        </FocusScope>
        <button type='button'>Outside action</button>
      </>,
    );

    await user.tab();
    expect(screen.getByLabelText("First unchecked choice")).toHaveFocus();
    await user.tab();

    expect(screen.getByRole("button", {name: "First scope action"})).toHaveFocus();
    expect(screen.getByLabelText("First unchecked choice")).not.toBeChecked();
    expect(screen.getByLabelText("Second unchecked choice")).not.toBeChecked();
  });

  it("uses one deliberate locally eligible unchecked representative when wrapping Shift+Tab", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button type='button'>First scope action</button>
        <label>
          <input
            type='radio'
            name='unchecked-reverse-wrap'
          />
          Canonical unchecked choice
        </label>
        <label>
          <input
            type='radio'
            name='unchecked-reverse-wrap'
          />
          Other unchecked choice
        </label>
      </FocusScope>,
    );

    await user.tab({shift: true});
    expect(screen.getByLabelText("Canonical unchecked choice")).toHaveFocus();
    await user.tab({shift: true});
    expect(screen.getByRole("button", {name: "First scope action"})).toHaveFocus();
  });

  it("contains Shift+Tab after native reverse entry reaches the other unchecked peer at the first edge", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type='button'>Outside before</button>
        <FocusScope>
          <label>
            <input
              type='radio'
              name='unchecked-first-edge'
            />
            First edge choice
          </label>
          <label>
            <input
              type='radio'
              name='unchecked-first-edge'
            />
            Reverse-entered choice
          </label>
          <button type='button'>Last scope action</button>
        </FocusScope>
      </>,
    );
    screen.getByRole("button", {name: "Last scope action"}).focus();

    await user.tab({shift: true});
    expect(screen.getByLabelText("Reverse-entered choice")).toHaveFocus();
    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Last scope action"})).toHaveFocus();
  });

  it("retains ordinary reverse navigation through a non-representative unchecked peer in the middle", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <button type='button'>Before the group</button>
        <label>
          <input
            type='radio'
            name='unchecked-middle'
          />
          Middle canonical choice
        </label>
        <label>
          <input
            type='radio'
            name='unchecked-middle'
          />
          Middle reverse-entered choice
        </label>
        <button type='button'>After the group</button>
      </FocusScope>,
    );
    screen.getByRole("button", {name: "After the group"}).focus();

    await user.tab({shift: true});
    expect(screen.getByLabelText("Middle reverse-entered choice")).toHaveFocus();
    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Before the group"})).toHaveFocus();
  });

  it("keeps a single local unchecked edge even when an unchecked group peer precedes the scope outside", async () => {
    const user = userEvent.setup();
    render(
      <>
        <label>
          <input
            type='radio'
            name='unchecked-external-peer'
          />
          External unchecked choice
        </label>
        <FocusScope autoFocus>
          <button type='button'>First local action</button>
          <label>
            <input
              type='radio'
              name='unchecked-external-peer'
            />
            First local choice
          </label>
          <label>
            <input
              type='radio'
              name='unchecked-external-peer'
            />
            Second local choice
          </label>
        </FocusScope>
        <button type='button'>Outside after</button>
      </>,
    );

    await user.tab();
    expect(screen.getByLabelText("First local choice")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", {name: "First local action"})).toHaveFocus();
  });

  it("chooses the locally eligible unchecked representative rather than hidden or disabled peers", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button type='button'>First scope action</button>
        <input
          type='radio'
          name='eligible-unchecked'
          hidden
          aria-label='Hidden unchecked peer'
        />
        <input
          type='radio'
          name='eligible-unchecked'
          disabled
          aria-label='Disabled unchecked peer'
        />
        <label>
          <input
            type='radio'
            name='eligible-unchecked'
          />
          Eligible unchecked representative
        </label>
        <label>
          <input
            type='radio'
            name='eligible-unchecked'
          />
          Other eligible unchecked peer
        </label>
      </FocusScope>,
    );

    await user.tab({shift: true});

    expect(screen.getByLabelText("Eligible unchecked representative")).toHaveFocus();
  });

  it("preserves caller cancellation while an unchecked group is the final controller edge", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope onKeyDown={(event) => event.preventDefault()}>
        <button type='button'>First action</button>
        <label>
          <input
            type='radio'
            name='cancel-unchecked'
          />
          Focused unchecked choice
        </label>
        <label>
          <input
            type='radio'
            name='cancel-unchecked'
          />
          Other unchecked choice
        </label>
      </FocusScope>,
    );
    const choice = screen.getByLabelText("Focused unchecked choice");
    choice.focus();

    await user.tab();

    expect(choice).toHaveFocus();
  });

  it("advances from a later unchecked peer to the logical next local stop even when that peer is physically last", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope>
          <button type='button'>First local stop</button>
          <label>
            <input
              type='radio'
              name='interleaved-unchecked'
            />
            Logical group representative
          </label>
          <button type='button'>Logical next local stop</button>
          <label>
            <input
              type='radio'
              name='interleaved-unchecked'
            />
            Physically last group peer
          </label>
        </FocusScope>
        <button type='button'>Outside after interleaved group</button>
      </>,
    );
    screen.getByLabelText("Physically last group peer").focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "Logical next local stop"})).toHaveFocus();
  });

  it("reenters at the scope edge instead of treating a manually focused unchecked peer as its checked representative", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope>
          <button type='button'>First available local stop</button>
          <label>
            <input
              type='radio'
              name='selected-manual-peer'
              defaultChecked
            />
            Selected group representative
          </label>
          <button type='button'>Later local stop</button>
          <label>
            <input
              type='radio'
              name='selected-manual-peer'
            />
            Manually focused unchecked peer
          </label>
        </FocusScope>
        <button type='button'>Outside selected group</button>
      </>,
    );
    const unchecked = screen.getByLabelText("Manually focused unchecked peer");
    unchecked.focus();
    expect(unchecked).not.toBeChecked();
    expect(screen.getByLabelText("Selected group representative")).toBeChecked();

    await user.tab();

    expect(screen.getByRole("button", {name: "First available local stop"})).toHaveFocus();
  });

  it("advances forward from a native reverse-entered unchecked middle peer without bouncing to the group", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <button type='button'>Before middle group</button>
        <label>
          <input
            type='radio'
            name='reverse-then-forward'
          />
          Middle representative
        </label>
        <label>
          <input
            type='radio'
            name='reverse-then-forward'
          />
          Native reverse middle peer
        </label>
        <button type='button'>After middle group</button>
      </FocusScope>,
    );
    const after = screen.getByRole("button", {name: "After middle group"});
    after.focus();
    await user.tab({shift: true});
    expect(screen.getByLabelText("Native reverse middle peer")).toHaveFocus();

    await user.tab();

    expect(after).toHaveFocus();
  });

  it("excludes a nested summary under a closed summary-less outer details on entry", () => {
    render(
      <FocusScope autoFocus>
        <details>
          <details>
            <summary>Hidden nested summary</summary>
          </details>
        </details>
        <button type='button'>Available action</button>
      </FocusScope>,
    );

    expect(screen.getByRole("button", {name: "Available action"})).toHaveFocus();
  });

  it("wraps actual Tab before a nested summary hidden by a closed summary-less outer details", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope>
          <button type='button'>First available</button>
          <button type='button'>Final available</button>
          <details>
            <details>
              <summary>Hidden nested final summary</summary>
            </details>
          </details>
        </FocusScope>
        <button type='button'>Outside</button>
      </>,
    );
    screen.getByRole("button", {name: "Final available"}).focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "First available"})).toHaveFocus();
  });

  it("recognizes the outer details' own first direct summary rather than an earlier nested summary", () => {
    render(
      <FocusScope autoFocus>
        <details>
          <details>
            <summary>Hidden earlier nested summary</summary>
          </details>
          <summary>Visible outer summary</summary>
        </details>
        <button type='button'>Later action</button>
      </FocusScope>,
    );

    expect(screen.getByText("Visible outer summary")).toHaveFocus();
  });

  it.each(["same-form", "linked-form", "no-form"] as const)(
    "excludes an unchecked local radio when a checked native group peer is outside the scope (%s)",
    (ownership) => {
      const peer = (
        <label>
          <input
            type='radio'
            name='external-group'
            defaultChecked
            form={ownership === "linked-form" ? "radio-owner" : undefined}
          />
          External checked peer
        </label>
      );
      const scope = (
        <FocusScope autoFocus>
          <label>
            <input
              type='radio'
              name='external-group'
            />
            Local unchecked peer
          </label>
          <button type='button'>Available local action</button>
        </FocusScope>
      );
      render(
        ownership === "same-form" ? (
          <form id='radio-owner'>
            {peer}
            {scope}
          </form>
        ) : ownership === "linked-form" ? (
          <>
            {peer}
            <form id='radio-owner'>{scope}</form>
          </>
        ) : (
          <>
            {peer}
            {scope}
          </>
        ),
      );
      const external = screen.getByLabelText<HTMLInputElement>("External checked peer");
      const local = screen.getByLabelText<HTMLInputElement>("Local unchecked peer");
      expect(external).toBeChecked();
      expect(local).not.toBeChecked();
      expect(external.form).toBe(local.form);
      expect(external.getRootNode()).toBe(local.getRootNode());

      expect(screen.getByRole("button", {name: "Available local action"})).toHaveFocus();
    },
  );

  it("does not treat a checked same-name radio with a different form owner as a group peer", () => {
    render(
      <>
        <form id='other-radio-owner'>
          <label>
            <input
              type='radio'
              name='distinct-owner'
              defaultChecked
            />
            Other form peer
          </label>
        </form>
        <form id='local-radio-owner'>
          <FocusScope autoFocus>
            <label>
              <input
                type='radio'
                name='distinct-owner'
              />
              Local form peer
            </label>
            <button type='button'>Later action</button>
          </FocusScope>
        </form>
      </>,
    );
    const external = screen.getByLabelText<HTMLInputElement>("Other form peer");
    const local = screen.getByLabelText<HTMLInputElement>("Local form peer");
    expect(external.form).not.toBe(local.form);
    expect(local).toHaveFocus();
  });

  it("keeps an unchecked local peer eligible when its native group has no checked radio", () => {
    render(
      <>
        <label>
          <input
            type='radio'
            name='unselected-group'
          />
          External unchecked peer
        </label>
        <FocusScope autoFocus>
          <label>
            <input
              type='radio'
              name='unselected-group'
            />
            Local unchecked peer
          </label>
          <button type='button'>Later action</button>
        </FocusScope>
      </>,
    );

    expect(screen.getByLabelText("Local unchecked peer")).toHaveFocus();
  });

  it("uses the radio's actual owner-document tree, not a global document group", () => {
    const {getByTitle, unmount: unmountIframe} = render(<iframe title='Radio owner document' />);
    const iframe = getByTitle("Radio owner document");
    if (!(iframe instanceof HTMLIFrameElement)) throw new TypeError("The owner-document fixture requires an iframe element.");
    const otherDocument = iframe.contentDocument;
    if (!otherDocument) throw new Error("The owner-document fixture requires an actual iframe document.");
    const container = otherDocument.createElement("div");
    otherDocument.body.append(container);
    const {getByLabelText, getByRole, unmount} = render(
      <>
        <label>
          <input
            type='radio'
            name='owner-document-group'
            defaultChecked
          />
          Owner document checked peer
        </label>
        <FocusScope
          autoFocus
          restoreFocus={false}>
          <label>
            <input
              type='radio'
              name='owner-document-group'
            />
            Owner document local peer
          </label>
          <button type='button'>Owner document available action</button>
        </FocusScope>
      </>,
      {container, baseElement: otherDocument.body},
    );
    try {
      const external = getByLabelText("Owner document checked peer");
      const local = getByLabelText("Owner document local peer");
      const Input = otherDocument.defaultView?.HTMLInputElement;
      if (!Input || !(external instanceof Input) || !(local instanceof Input)) {
        throw new TypeError("The owner-document fixture requires native radio inputs.");
      }
      expect(external.ownerDocument).toBe(otherDocument);
      expect(local.ownerDocument).toBe(otherDocument);
      expect(external.form).toBeNull();
      expect(local.form).toBeNull();
      expect(external).toBeChecked();
      expect(local).not.toBeChecked();

      expect(otherDocument.activeElement).toBe(getByRole("button", {name: "Owner document available action"}));
    } finally {
      unmount();
      container.remove();
      unmountIframe();
    }
  });

  it.each([false, true])("restores the connected trigger after descendant native autofocus (Strict Mode: %s)", (strict) => {
    const {rerender} = render(<button type='button'>Native autofocus trigger</button>);
    const trigger = screen.getByRole("button", {name: "Native autofocus trigger"});
    trigger.focus();
    const scope = (
      <FocusScope>
        <input
          autoFocus
          aria-label='Native autofocus input'
        />
      </FocusScope>
    );
    rerender(
      <>
        <button type='button'>Native autofocus trigger</button>
        {strict ? <StrictMode>{scope}</StrictMode> : scope}
      </>,
    );
    expect(screen.getByRole("textbox", {name: "Native autofocus input"})).toHaveFocus();
    expect(trigger.isConnected).toBe(true);

    rerender(<button type='button'>Native autofocus trigger</button>);

    expect(trigger).toHaveFocus();
  });

  it("retains the pre-entry owner when scope autofocus follows descendant native autofocus", () => {
    const {rerender} = render(<button type='button'>Combined autofocus trigger</button>);
    const trigger = screen.getByRole("button", {name: "Combined autofocus trigger"});
    trigger.focus();
    rerender(
      <>
        <button type='button'>Combined autofocus trigger</button>
        <FocusScope autoFocus>
          <button type='button'>Scope entry action</button>
          <input
            autoFocus
            aria-label='Descendant native input'
          />
        </FocusScope>
      </>,
    );
    expect(screen.getByRole("button", {name: "Scope entry action"})).toHaveFocus();
    rerender(<button type='button'>Combined autofocus trigger</button>);
    expect(trigger).toHaveFocus();
  });

  it.each([false, true])("respects a shadow tree's own radio group rather than document peers (checked local group: %s)", (checkedPeer) => {
    const {getByTestId, unmount: unmountHost} = render(
      <>
        <label>
          <input
            type='radio'
            name='shadow-group'
            defaultChecked
          />
          Document checked peer
        </label>
        <div data-testid='radio-shadow-host' />
      </>,
    );
    const host = getByTestId("radio-shadow-host");
    const shadow = host.attachShadow({mode: "open"});
    const container = document.createElement("div");
    shadow.append(container);
    const {getByLabelText, getByRole, unmount} = render(
      <>
        {checkedPeer && (
          <label>
            <input
              type='radio'
              name='shadow-group'
              defaultChecked
            />
            Shadow checked peer
          </label>
        )}
        <FocusScope
          autoFocus
          restoreFocus={false}>
          <label>
            <input
              type='radio'
              name='shadow-group'
            />
            Shadow local peer
          </label>
          <button type='button'>Shadow available action</button>
        </FocusScope>
      </>,
      {container, baseElement: container},
    );
    try {
      const local = getByLabelText("Shadow local peer");
      expect(local.getRootNode()).toBe(shadow);
      expect(screen.getByLabelText("Document checked peer")).toBeChecked();
      if (checkedPeer) expect(getByLabelText("Shadow checked peer")).toBeChecked();
      expect(shadow.activeElement).toBe(checkedPeer ? getByRole("button", {name: "Shadow available action"}) : local);
    } finally {
      unmount();
      container.remove();
      unmountHost();
    }
  });

  it("includes a visibly overridden descendant of a visibility-hidden ancestor", () => {
    const {rerender} = render(
      <FocusScope>
        <div data-testid='visibility-owner'>
          <button type='button'>Visible override</button>
        </div>
        <button type='button'>Later control</button>
      </FocusScope>,
    );
    const visible = screen.getByRole("button", {name: "Visible override"});
    screen.getByTestId("visibility-owner").style.visibility = "hidden";
    visible.style.visibility = "visible";

    rerender(
      <FocusScope autoFocus>
        <div data-testid='visibility-owner'>
          <button type='button'>Visible override</button>
        </div>
        <button type='button'>Later control</button>
      </FocusScope>,
    );

    expect(visible).toHaveFocus();
  });

  it("uses native editable content without an explicit tabIndex as the first tabbable", () => {
    render(
      <FocusScope autoFocus>
        <div
          contentEditable
          suppressContentEditableWarning
          aria-label='Editable draft'>
          Draft
        </div>
        <button type='button'>Later control</button>
      </FocusScope>,
    );

    expect(screen.getByLabelText("Editable draft")).toHaveFocus();
  });

  it("includes the native first summary but excludes content inside closed details", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <details>
          <summary>Available summary</summary>
          <button type='button'>Closed detail action</button>
        </details>
        <button type='button'>Last available</button>
      </FocusScope>,
    );
    const summary = screen.getByText("Available summary");
    expect(summary).toHaveFocus();

    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Last available"})).toHaveFocus();
  });

  it("does not choose an unchecked radio beyond the checked radio group's Tab stop", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope>
          <button type='button'>First</button>
          <label>
            <input
              type='radio'
              name='choice'
              defaultChecked
            />
            Checked
          </label>
          <button type='button'>Final available</button>
          <label>
            <input
              type='radio'
              name='choice'
            />
            Unchecked final
          </label>
        </FocusScope>
        <button type='button'>Outside</button>
      </>,
    );
    screen.getByRole("button", {name: "Final available"}).focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "First"})).toHaveFocus();
  });

  it("orders positive tab stops before ordinary controls when selecting the cycle edges", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button
          type='button'
          tabIndex={2}>
          Second priority
        </button>
        <button
          type='button'
          tabIndex={1}>
          First priority
        </button>
        <button type='button'>Final ordinary</button>
      </FocusScope>,
    );
    expect(screen.getByRole("button", {name: "First priority"})).toHaveFocus();
    await user.tab({shift: true});
    expect(screen.getByRole("button", {name: "Final ordinary"})).toHaveFocus();
  });

  it("keeps controls in a disabled fieldset's first legend available", () => {
    render(
      <FocusScope autoFocus>
        <fieldset disabled>
          <legend>
            <button type='button'>Legend exception</button>
          </legend>
          <button type='button'>Disabled fieldset content</button>
        </fieldset>
        <button type='button'>Later control</button>
      </FocusScope>,
    );
    expect(screen.getByRole("button", {name: "Legend exception"})).toHaveFocus();
  });

  describe("natively focusable aria-disabled tab stops", () => {
    it.each(["middle", "final"] as const)(
      "continues past and wraps through a focusableWhenDisabled Button in the %s position",
      async (position) => {
        const user = userEvent.setup();
        const unavailable = (
          <Button
            disabled
            focusableWhenDisabled>
            Delete
          </Button>
        );
        render(
          <>
            <FocusScope restoreFocus={false}>
              <Button>Save</Button>
              {position === "middle" && unavailable}
              <Button>Cancel</Button>
              {position === "final" && unavailable}
            </FocusScope>
            <button type='button'>Outside</button>
          </>,
        );
        const save = screen.getByRole("button", {name: "Save"});
        const unavailableButton = screen.getByRole("button", {name: "Delete"});
        const cancel = screen.getByRole("button", {name: "Cancel"});
        expect(unavailableButton).toHaveAttribute("aria-disabled", "true");
        expect(unavailableButton).not.toBeDisabled();
        expect(unavailableButton.tabIndex).toBe(0);

        await expectTabCycle(user, position === "middle" ? [save, unavailableButton, cancel] : [save, cancel, unavailableButton]);
      },
    );

    it.each(["between", "final"] as const)(
      "treats a Toolbar's focusable disabled roving stop as a scope tab stop (%s)",
      async (position) => {
        const user = userEvent.setup();
        render(
          <>
            <FocusScope restoreFocus={false}>
              <button type='button'>Before toolbar</button>
              <Toolbar aria-label='Formatting'>
                <ToolbarButton disabled>Strikethrough</ToolbarButton>
                <ToolbarButton>Bold</ToolbarButton>
              </Toolbar>
              {position === "between" && <button type='button'>After toolbar</button>}
            </FocusScope>
            <button type='button'>Outside</button>
          </>,
        );
        const before = screen.getByRole("button", {name: "Before toolbar"});
        const strikethrough = screen.getByRole("button", {name: "Strikethrough"});
        expect(strikethrough).toHaveAttribute("aria-disabled", "true");
        expect(strikethrough).toHaveAttribute("tabindex", "0");
        expect(screen.getByRole("button", {name: "Bold"})).toHaveAttribute("tabindex", "-1");

        await expectTabCycle(
          user,
          position === "between" ? [before, strikethrough, screen.getByRole("button", {name: "After toolbar"})] : [before, strikethrough],
        );
      },
    );

    it("keeps an aria-disabled shadow host's natively reachable shadow controls in scope order", () => {
      render(
        <FocusScope restoreFocus={false}>
          <ShadowWidget label='Unavailable shadow widget'>
            <button type='button'>Shadow first</button>
            <button type='button'>Shadow middle</button>
            <button type='button'>Shadow last</button>
          </ShadowWidget>
          <button type='button'>After shadow widget</button>
        </FocusScope>,
      );
      const host = screen.getByRole("group", {name: "Unavailable shadow widget"});
      host.setAttribute("aria-disabled", "true");
      const {first, last} = getShadowButtons(host);
      const after = screen.getByRole("button", {name: "After shadow widget"});
      after.focus();

      expect(fireEvent.keyDown(after, {key: "Tab", composed: true})).toBe(false);
      expectTreeFocus(first);
      last.focus();
      expect(fireEvent.keyDown(last, {key: "Tab", composed: true})).toBe(true);
      first.focus();
      expect(fireEvent.keyDown(first, {key: "Tab", shiftKey: true, composed: true})).toBe(false);
      expectTreeFocus(after);
    });

    it("autofocuses a focusable aria-disabled first tab stop, matching native order", () => {
      render(
        <FocusScope
          autoFocus
          restoreFocus={false}>
          <Button
            disabled
            focusableWhenDisabled>
            Archive
          </Button>
          <Button>Edit</Button>
        </FocusScope>,
      );

      expect(screen.getByRole("button", {name: "Archive"})).toHaveFocus();
    });

    it("restores an entry owner that became focusable-disabled while the scope was open", () => {
      const tree = (open: boolean, disabled: boolean): React.ReactElement => (
        <>
          <Button
            disabled={disabled}
            focusableWhenDisabled>
            Edit entry
          </Button>
          {open && (
            <FocusScope autoFocus>
              <button type='button'>Inline editor action</button>
            </FocusScope>
          )}
        </>
      );
      const {rerender} = render(tree(false, false));
      const trigger = screen.getByRole("button", {name: "Edit entry"});
      trigger.focus();
      rerender(tree(true, true));
      expect(screen.getByRole("button", {name: "Inline editor action"})).toHaveFocus();
      expect(trigger).toHaveAttribute("aria-disabled", "true");

      rerender(tree(false, true));

      expect(trigger).toHaveFocus();
    });
  });

  it("honors React callback ref cleanup on unmount", () => {
    let connected: HTMLDivElement | null = null;
    let cleanups = 0;
    const {unmount} = render(
      <FocusScope
        ref={(node) => {
          connected = node;
          return () => {
            connected = null;
            cleanups++;
          };
        }}>
        Content
      </FocusScope>,
    );
    expect(connected).toBe(screen.getByRole("group"));
    unmount();
    expect(connected).toBeNull();
    expect(cleanups).toBe(1);
  });

  it("captures and restores the trigger across Strict Mode effect replay", () => {
    const {rerender} = render(<button type='button'>Trigger</button>);
    const trigger = screen.getByRole("button", {name: "Trigger"});
    trigger.focus();
    rerender(
      <>
        <button type='button'>Trigger</button>
        <StrictMode>
          <FocusScope autoFocus>
            <button type='button'>Internal</button>
          </FocusScope>
        </StrictMode>
      </>,
    );
    expect(screen.getByRole("button", {name: "Internal"})).toHaveFocus();
    rerender(<button type='button'>Trigger</button>);
    expect(trigger).toHaveFocus();
  });

  it("wraps actual Tab from the visible final button, excluding hidden enabled controls", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope contain>
          <button type='button'>First visible</button>
          <button type='button'>Final visible</button>
          <button
            type='button'
            hidden>
            Hidden enabled
          </button>
        </FocusScope>
        <button type='button'>Outside</button>
      </>,
    );

    screen.getByRole("button", {name: "Final visible"}).focus();
    await user.tab();

    expect(screen.getByRole("button", {name: "First visible"})).toHaveFocus();
  });

  it("excludes inert, hidden ancestors, disabled fieldsets and negative tab stops on focus entry", () => {
    render(
      <FocusScope autoFocus>
        <div inert>
          <button type='button'>Inert</button>
        </div>
        <div hidden>
          <button type='button'>Hidden ancestor</button>
        </div>
        <fieldset disabled>
          <button type='button'>Disabled fieldset</button>
        </fieldset>
        <input
          type='hidden'
          tabIndex={0}
        />
        <button
          type='button'
          tabIndex={-1}>
          Programmatic only
        </button>
        <button type='button'>Available</button>
      </FocusScope>,
    );

    expect(screen.getByRole("button", {name: "Available"})).toHaveFocus();
  });

  it("wraps Shift+Tab to a visible enabled non-inert final control", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Last available</button>
        <div inert>
          <button type='button'>Inert final</button>
        </div>
      </FocusScope>,
    );

    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Last available"})).toHaveFocus();
  });

  it("excludes CSS-hidden ancestors from the actual Tab controller", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Last available</button>
        <div data-testid='css-hidden'>
          <button type='button'>CSS hidden</button>
        </div>
      </FocusScope>,
    );
    screen.getByTestId("css-hidden").style.display = "none";
    screen.getByRole("button", {name: "Last available"}).focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "First"})).toHaveFocus();
  });

  it("focuses an empty scope and contains both Tab directions on that fallback", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope
          autoFocus
          aria-label='Empty scope'>
          No controls
        </FocusScope>
        <button type='button'>Outside</button>
      </>,
    );
    const scope = screen.getByRole("group", {name: "Empty scope"});
    expect(scope).toHaveFocus();

    await user.tab();
    expect(scope).toHaveFocus();
    await user.tab({shift: true});
    expect(scope).toHaveFocus();
  });

  it("honors consumer Tab cancellation before running the controller", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope
        autoFocus
        onKeyDown={(event) => event.preventDefault()}>
        <button type='button'>First</button>
        <button type='button'>Last</button>
      </FocusScope>,
    );
    screen.getByRole("button", {name: "Last"}).focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "Last"})).toHaveFocus();
  });

  it("restores the original focus owner even after autoFocus changes", () => {
    const {rerender, unmount} = render(<button type='button'>Trigger</button>);
    const trigger = screen.getByRole("button", {name: "Trigger"});
    trigger.focus();
    const content = (autoFocus: boolean): React.JSX.Element => (
      <>
        <button type='button'>Trigger</button>
        <FocusScope autoFocus={autoFocus}>
          <button type='button'>Internal</button>
        </FocusScope>
      </>
    );
    rerender(content(true));
    expect(screen.getByRole("button", {name: "Internal"})).toHaveFocus();
    rerender(content(false));
    expect(screen.getByRole("button", {name: "Internal"})).toHaveFocus();
    // Leave the trigger mounted while unmounting just the scope.
    rerender(<button type='button'>Trigger</button>);

    expect(trigger).toHaveFocus();
    unmount();
  });

  it("preserves native div props and clears a forwarded object ref on unmount", () => {
    const ref = createRef<HTMLDivElement>();
    const {unmount} = render(
      <FocusScope
        ref={ref}
        role='region'
        aria-label='Workbench'
        className='consumer'
        tabIndex={0}>
        Content
      </FocusScope>,
    );
    const scope = screen.getByRole("region", {name: "Workbench"});
    expect(ref.current).toBe(scope);
    expect(scope).toHaveClass("consumer");
    expect(scope).toHaveAttribute("tabindex", "0");
    unmount();
    expect(ref.current).toBeNull();
  });

  it("renders children", () => {
    render(
      <FocusScope>
        <button type='button'>Click</button>
      </FocusScope>,
    );

    expect(screen.getByText("Click")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <FocusScope ref={ref}>
        <button type='button'>Click</button>
      </FocusScope>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("supports function refs", () => {
    let currentNode: HTMLDivElement | null = null;

    render(
      <FocusScope
        ref={(node) => {
          currentNode = node;
        }}>
        <button type='button'>Click</button>
      </FocusScope>,
    );

    expect(currentNode).toBeInstanceOf(HTMLDivElement);
  });

  it("auto-focuses first focusable element when autoFocus is true", () => {
    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Second</button>
      </FocusScope>,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "First"}));
  });

  it("keeps tab focus contained within the scope", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Second</button>
      </FocusScope>,
    );

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Second"}));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", {name: "First"}));
  });

  it("restores focus to the previously focused element on unmount", () => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "Trigger";
    document.body.append(trigger);
    trigger.focus();

    const {unmount} = render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
      </FocusScope>,
    );

    unmount();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("wraps focus backwards when using Shift+Tab on the first focusable element", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Second</button>
      </FocusScope>,
    );

    await user.tab({shift: true});

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Second"}));
  });

  it("does not throw when the scope has no focusable children", async () => {
    const user = userEvent.setup();

    render(<FocusScope>No focusable content</FocusScope>);

    await user.tab();

    expect(screen.getByText("No focusable content")).toBeInTheDocument();
  });

  it("does not contain focus when contain={false}", async () => {
    const user = userEvent.setup();

    // Create external button
    const externalButton = document.createElement("button");
    externalButton.type = "button";
    externalButton.textContent = "External";
    document.body.append(externalButton);

    render(
      <FocusScope
        contain={false}
        autoFocus>
        <button type='button'>Internal</button>
      </FocusScope>,
    );

    // Focus starts inside
    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Internal"}));

    // Tab should not be trapped
    await user.tab();

    // Focus should escape the scope
    expect(document.activeElement).not.toBe(screen.getByRole("button", {name: "Internal"}));

    externalButton.remove();
  });

  it("does not restore focus when restoreFocus={false}", () => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "Trigger";
    document.body.append(trigger);
    trigger.focus();

    const {unmount} = render(
      <FocusScope
        restoreFocus={false}
        autoFocus>
        <button type='button'>First</button>
      </FocusScope>,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "First"}));

    unmount();

    // Focus should NOT be restored to trigger
    expect(document.activeElement).not.toBe(trigger);

    trigger.remove();
  });

  it("handles Tab key without contain enabled", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope
        contain={false}
        autoFocus>
        <button type='button'>Button 1</button>
        <button type='button'>Button 2</button>
      </FocusScope>,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Button 1"}));

    // Tab should work normally without containment
    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Button 2"}));
  });

  it("handles non-Tab key events", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope autoFocus>
        <input
          type='text'
          placeholder='Type here'
        />
      </FocusScope>,
    );

    const input = screen.getByPlaceholderText("Type here");
    expect(document.activeElement).toBe(input);

    // Type some text - Enter key should not be trapped
    await user.keyboard("Hello{Enter}");

    // Input should still be focused
    expect(document.activeElement).toBe(input);
  });

  it("handles focus scope with no focusable elements during Tab trap", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope contain>
        <div>No focusable elements</div>
      </FocusScope>,
    );

    // Tab should not throw
    await user.tab();

    expect(screen.getByText("No focusable elements")).toBeInTheDocument();
  });
});

describe("FocusScope stories", () => {
  // Base UI Dialog owns the SDK comparison story's Escape dismissal and focus return.
  const scopeStories = Object.entries(composeStories(stories)).filter(([name]) => name !== "SdkOwnedModal");

  it.each(scopeStories)("%s gives every scope an announced keyboard exit", async (_name, Story) => {
    const user = userEvent.setup();
    const {container} = render(<Story />);
    const opener = screen.queryByRole("button", {name: "Open inline workbench"});
    if (opener) await user.click(opener);
    const scopes = [...container.querySelectorAll<HTMLElement>('[role="group"][tabindex="-1"]')];
    expect(scopes.length).toBeGreaterThan(0);

    for (const scope of scopes) {
      const describedOwner = scope.closest<HTMLElement>("[aria-describedby]");
      const instructions = container.ownerDocument.getElementById(describedOwner?.getAttribute("aria-describedby") ?? "");
      expect(instructions).toHaveTextContent(/Escape/u);
      scope.focus();
      expect(scope).toHaveFocus();

      await user.keyboard("{Escape}");

      const active = container.ownerDocument.activeElement;
      expect(active).not.toBe(container.ownerDocument.body);
      expect(scopes.some((candidate) => candidate.isConnected && candidate.contains(active))).toBe(false);
    }
  });
});
