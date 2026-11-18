import {act, fireEvent, render, screen, within} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";

import {jsonCVData} from "../../data/json";
import JsonView from "./JsonView.svelte";

describe("JsonView (API documentation)", () => {
  afterEach(() => vi.useRealTimers());

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

  it("copies the selected language and clears feedback without changing the selection", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    render(JsonView);
    const curl = screen.getByRole("tab", {name: "curl"});
    const python = screen.getByRole("tab", {name: "Python"});
    expect(curl).toHaveAttribute("aria-selected", "true");

    await fireEvent.click(python);
    const sample = screen.getByRole("tabpanel", {name: "Python"});
    const copy = within(sample).getByRole("button", {name: "Copy code sample"});
    await fireEvent.click(copy);

    const copied = await navigator.clipboard.readText();
    expect(copied).toContain("urllib.request.urlopen");
    expect(sample).toHaveTextContent(copied.replaceAll(/\s+/gu, " ").trim());
    expect(curl).toHaveAttribute("aria-selected", "false");
    expect(copy).toHaveTextContent("Copied!");

    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(copy).toHaveTextContent(/^Copy$/u);
    expect(python).toHaveAttribute("aria-selected", "true");
  });

  it("does not clear a newer sample's copy confirmation when the previous sample's deadline expires", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    render(JsonView);
    const curl = within(screen.getByRole("tabpanel", {name: "curl"}));
    await fireEvent.click(curl.getByRole("button", {name: "Copy code sample"}));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    await fireEvent.click(screen.getByRole("tab", {name: "PowerShell"}));
    const copy = within(screen.getByRole("tabpanel", {name: "PowerShell"})).getByRole("button", {name: "Copy code sample"});
    await fireEvent.click(copy);

    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(await navigator.clipboard.readText()).toContain("Invoke-RestMethod");
    expect(copy).toHaveTextContent("Copied!");
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(copy).toHaveTextContent(/^Copy$/u);
  });

  it("copies the same resume in formatted and raw modes", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    render(JsonView);
    const formats = within(screen.getByRole("tablist", {name: "JSON format toggle"}));
    const copy = screen.getByRole("button", {name: /copy json/i});

    await fireEvent.click(copy);
    expect(await navigator.clipboard.readText()).toBe(JSON.stringify(jsonCVData, null, 2));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await fireEvent.click(formats.getByRole("tab", {name: /raw/i}));
    await fireEvent.click(copy);

    expect(await navigator.clipboard.readText()).toBe(JSON.stringify(jsonCVData));
    expect(formats.getByRole("tab", {name: /raw/i})).toHaveAttribute("aria-selected", "true");
  });

  it("downloads the selected JSON format and releases each object URL", async () => {
    const created = vi.spyOn(URL, "createObjectURL");
    const released = vi.spyOn(URL, "revokeObjectURL");
    const filenames: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      filenames.push(this.download);
    });
    render(JsonView);
    const formats = within(screen.getByRole("tablist", {name: "JSON format toggle"}));
    const download = screen.getByRole("button", {name: "Download JSON"});

    await fireEvent.click(download);
    await fireEvent.click(formats.getByRole("tab", {name: "Raw"}));
    await fireEvent.click(download);

    expect(filenames).toEqual(["alexandru-olariu-cv.json", "alexandru-olariu-cv.json"]);
    const [formatted, raw] = created.mock.calls.map(([blob]) => blob);
    if (!(formatted instanceof Blob) || !(raw instanceof Blob)) throw new Error("Expected two JSON blobs");
    expect(formatted.type).toBe("application/json");
    expect(await formatted.text()).toBe(JSON.stringify(jsonCVData, null, 2));
    expect(await raw.text()).toBe(JSON.stringify(jsonCVData));
    const urls = created.mock.results.map(({value}) => value);
    expect(released.mock.calls).toEqual(urls.map((url) => [url]));
  });
});
