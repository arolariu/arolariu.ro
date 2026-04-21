import {describe, expect, it} from "vitest";
import type {AggregateFile, ServiceSeries} from "../types/status";
import {BUCKET_SIZE_TO_MS} from "../types/status";
import {shouldIgnoreKeydown} from "./keyboardShortcuts";
import {SERVICE_DISPLAY_ORDER, bucketDurationMsFor, orderedServices, showWeekdayChart} from "./pageLogic";

function mkSeries(service: ServiceSeries["service"]): ServiceSeries {
  return {service, buckets: []};
}

function mkFile(services: readonly ServiceSeries[]): AggregateFile {
  return {
    generatedAt: "2026-04-19T14:00:00Z",
    bucketSize: "30m",
    windowDays: 14,
    services,
  };
}

describe("orderedServices", () => {
  it("returns [] for null file", () => {
    expect(orderedServices(null)).toEqual([]);
  });

  it("sorts services by canonical display order regardless of input order", () => {
    // Input order intentionally reversed relative to SERVICE_DISPLAY_ORDER.
    const reversed = [...SERVICE_DISPLAY_ORDER].reverse().map(mkSeries);
    const sorted = orderedServices(mkFile(reversed));
    expect(sorted.map((s) => s.service)).toEqual([...SERVICE_DISPLAY_ORDER]);
  });

  it("is stable — does not mutate the input file", () => {
    const original = [mkSeries("cv.arolariu.ro"), mkSeries("arolariu.ro")];
    const file = mkFile(original);
    orderedServices(file);
    // Original array retains its shuffled order — sort was on a copy.
    expect(file.services[0]!.service).toBe("cv.arolariu.ro");
  });

  it("pushes unknown service IDs to the end", () => {
    // "unknown.service" is not in SERVICE_DISPLAY_ORDER → idx === -1 branch
    const services = [mkSeries("unknown.service" as ServiceId), mkSeries("arolariu.ro")];
    const sorted = orderedServices(mkFile(services));
    expect(sorted[0]!.service).toBe("arolariu.ro");
    expect(sorted[sorted.length - 1]!.service).toBe("unknown.service");
  });
});

describe("bucketDurationMsFor", () => {
  it("maps 30m → 30 minutes", () => {
    expect(bucketDurationMsFor("30m")).toBe(30 * 60_000);
    expect(bucketDurationMsFor("30m")).toBe(BUCKET_SIZE_TO_MS["30m"]);
  });

  it("maps 1h → 1 hour", () => {
    expect(bucketDurationMsFor("1h")).toBe(60 * 60_000);
  });

  it("maps 1d → 24 hours", () => {
    expect(bucketDurationMsFor("1d")).toBe(24 * 60 * 60_000);
  });

  it("defaults to 30m for undefined bucketSize", () => {
    expect(bucketDurationMsFor(undefined)).toBe(30 * 60_000);
  });
});

describe("showWeekdayChart", () => {
  it("returns false for windows < 14 days", () => {
    expect(showWeekdayChart("1d")).toBe(false);
    expect(showWeekdayChart("3d")).toBe(false);
    expect(showWeekdayChart("7d")).toBe(false);
  });

  it("returns true for windows ≥ 14 days", () => {
    expect(showWeekdayChart("14d")).toBe(true);
    expect(showWeekdayChart("30d")).toBe(true);
    expect(showWeekdayChart("365d")).toBe(true);
  });
});

describe("shouldIgnoreKeydown", () => {
  function mkEvent(partial: Partial<KeyboardEventInit> & {target?: EventTarget}): KeyboardEvent {
    const ev = new KeyboardEvent("keydown", {key: "r", ...partial});
    if (partial.target) {
      Object.defineProperty(ev, "target", {value: partial.target});
    }
    return ev;
  }

  it("ignores when ctrl is held", () => {
    expect(shouldIgnoreKeydown(mkEvent({ctrlKey: true}))).toBe(true);
  });

  it("ignores when meta is held", () => {
    expect(shouldIgnoreKeydown(mkEvent({metaKey: true}))).toBe(true);
  });

  it("ignores when alt is held", () => {
    expect(shouldIgnoreKeydown(mkEvent({altKey: true}))).toBe(true);
  });

  it("does not ignore a bare key with no target", () => {
    expect(shouldIgnoreKeydown(mkEvent({}))).toBe(false);
  });

  it("ignores when target is an <input>", () => {
    const input = document.createElement("input");
    expect(shouldIgnoreKeydown(mkEvent({target: input}))).toBe(true);
  });

  it("ignores when target is a <textarea>", () => {
    const ta = document.createElement("textarea");
    expect(shouldIgnoreKeydown(mkEvent({target: ta}))).toBe(true);
  });

  it("ignores when target is contenteditable", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    expect(shouldIgnoreKeydown(mkEvent({target: div}))).toBe(true);
  });

  it("does not ignore a <button> target", () => {
    const btn = document.createElement("button");
    expect(shouldIgnoreKeydown(mkEvent({target: btn}))).toBe(false);
  });
});
