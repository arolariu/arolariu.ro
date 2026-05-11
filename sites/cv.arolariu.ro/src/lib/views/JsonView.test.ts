import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import JsonView from "./JsonView.svelte";

describe("JsonView (API documentation)", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders the hero with 'This CV is also an API'", () => {
    const {getByRole} = render(JsonView);
    const heading = getByRole("heading", {name: /this cv is also an api/i, level: 1});
    expect(heading).toBeTruthy();
  });

  it("renders the REST · JSON Resume eyebrow pill", () => {
    const {getByText} = render(JsonView);
    expect(getByText(/REST.*JSON Resume v1\.0\.0/i)).toBeTruthy();
  });

  it("renders 4 code-sample tabs (curl, JavaScript, Python, PowerShell)", () => {
    const {getAllByRole} = render(JsonView);
    const tabs = getAllByRole("tab").filter((t) => /^(curl|javascript|python|powershell)$/i.test(t.textContent?.trim() ?? ""));
    expect(tabs).toHaveLength(4);
  });

  it("renders a stat strip with exactly 4 stat items", () => {
    const {container} = render(JsonView);
    const stats = container.querySelectorAll("[data-json-stat]");
    expect(stats).toHaveLength(4);
  });

  it("renders the endpoint catalog with 6 endpoint cards", () => {
    const {container} = render(JsonView);
    const cards = container.querySelectorAll("[data-json-endpoint]");
    expect(cards).toHaveLength(6);
  });

  it("renders the schema footer with 4 capability chips", () => {
    const {container} = render(JsonView);
    const chips = container.querySelectorAll("[data-json-chip]");
    expect(chips).toHaveLength(4);
  });

  it("exposes a copy button for the active code sample (with explicit aria-label)", () => {
    const {getByLabelText} = render(JsonView);
    const copyBtn = getByLabelText(/copy code sample/i);
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.tagName).toBe("BUTTON");
  });
});
