import {renderHook} from "@testing-library/react";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {useMergedRefs} from "./useMergedRefs";

describe("useMergedRefs", () => {
  it("returns a callback ref", () => {
    const {result} = renderHook(() => useMergedRefs());

    expect(typeof result.current).toBe("function");
  });

  it("sets a single mutable ref object", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(ref));

    const element = document.createElement("div");
    result.current(element);

    expect(ref.current).toBe(element);
  });

  it("calls a single callback ref", () => {
    const callbackRef = vi.fn();
    const {result} = renderHook(() => useMergedRefs(callbackRef));

    const element = document.createElement("div");
    result.current(element);

    expect(callbackRef).toHaveBeenCalledWith(element);
  });

  it("merges multiple mutable ref objects", () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(ref1, ref2));

    const element = document.createElement("div");
    result.current(element);

    expect(ref1.current).toBe(element);
    expect(ref2.current).toBe(element);
  });

  it("merges callback refs and mutable refs", () => {
    const callbackRef = vi.fn();
    const mutableRef = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(callbackRef, mutableRef));

    const element = document.createElement("div");
    result.current(element);

    expect(callbackRef).toHaveBeenCalledWith(element);
    expect(mutableRef.current).toBe(element);
  });

  it("handles undefined refs gracefully", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(undefined, ref, undefined));

    const element = document.createElement("div");
    expect(() => result.current(element)).not.toThrow();
    expect(ref.current).toBe(element);
  });

  it("handles null refs gracefully", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(null, ref));

    const element = document.createElement("div");
    expect(() => result.current(element)).not.toThrow();
    expect(ref.current).toBe(element);
  });

  it("clears refs when element is null", () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const {result} = renderHook(() => useMergedRefs(ref1, ref2, callbackRef));

    const element = document.createElement("div");
    result.current(element);

    expect(ref1.current).toBe(element);
    expect(ref2.current).toBe(element);
    expect(callbackRef).toHaveBeenCalledWith(element);

    result.current(null);

    expect(ref1.current).toBe(null);
    expect(ref2.current).toBe(null);
    expect(callbackRef).toHaveBeenCalledWith(null);
  });

  it("updates refs when element changes", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useMergedRefs(ref));

    const element1 = document.createElement("div");
    result.current(element1);
    expect(ref.current).toBe(element1);

    const element2 = document.createElement("div");
    result.current(element2);
    expect(ref.current).toBe(element2);
  });

  it("works with no refs provided", () => {
    const {result} = renderHook(() => useMergedRefs());

    const element = document.createElement("div");
    expect(() => result.current(element)).not.toThrow();
  });
});
