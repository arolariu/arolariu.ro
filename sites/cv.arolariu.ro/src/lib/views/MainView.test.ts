/**
 * @fileoverview Render-smoke test for MainView (the / route's body).
 *
 * Asserts:
 *  - MainView mounts without throwing.
 *  - The HelpDialog is NOT in the initial render tree (it lazy-loads
 *    only after the user opens it).
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import MainView from "./MainView.svelte";

describe("MainView", () => {
  it("mounts without throwing", () => {
    const {container} = render(MainView);
    expect(container.firstChild).not.toBeNull();
  });

  it("does not render HelpDialog before it is opened", () => {
    const {container} = render(MainView);
    // HelpDialog's <dialog> renders with aria-labelledby="help-dialog-title"
    // (per Phase 3 migration). If the dialog is in the initial render tree,
    // that element will be present even when closed. Lazy-loading should
    // keep it out of the DOM entirely until first open.
    const dialog = container.querySelector("dialog[aria-labelledby='help-dialog-title']");
    expect(dialog).toBeNull();
  });
});
