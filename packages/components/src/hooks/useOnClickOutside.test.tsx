import {renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useOnClickOutside} from "./useOnClickOutside";

describe("useOnClickOutside", () => {
  let element: HTMLDivElement;
  let outsideElement: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement("div");
    outsideElement = document.createElement("div");
    document.body.appendChild(element);
    document.body.appendChild(outsideElement);
  });

  afterEach(() => {
    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
    vi.clearAllMocks();
  });

  it("calls handler when clicking outside the element", () => {
    const handler = vi.fn();
    const ref = {current: element};

    renderHook(() => useOnClickOutside(ref, handler));

    outsideElement.dispatchEvent(new MouseEvent("mousedown", {bubbles: true}));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when clicking inside the element", () => {
    const handler = vi.fn();
    const ref = {current: element};

    renderHook(() => useOnClickOutside(ref, handler));

    element.dispatchEvent(new MouseEvent("mousedown", {bubbles: true}));

    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler when touching outside the element", () => {
    const handler = vi.fn();
    const ref = {current: element};

    renderHook(() => useOnClickOutside(ref, handler));

    outsideElement.dispatchEvent(new TouchEvent("touchstart", {bubbles: true}));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when touching inside the element", () => {
    const handler = vi.fn();
    const ref = {current: element};

    renderHook(() => useOnClickOutside(ref, handler));

    element.dispatchEvent(new TouchEvent("touchstart", {bubbles: true}));

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call handler when clicking child elements", () => {
    const handler = vi.fn();
    const ref = {current: element};
    const childElement = document.createElement("span");
    element.appendChild(childElement);

    renderHook(() => useOnClickOutside(ref, handler));

    childElement.dispatchEvent(new MouseEvent("mousedown", {bubbles: true}));

    expect(handler).not.toHaveBeenCalled();
  });

  it("handles null ref gracefully", () => {
    const handler = vi.fn();
    const ref = {current: null};

    renderHook(() => useOnClickOutside(ref, handler));

    outsideElement.dispatchEvent(new MouseEvent("mousedown", {bubbles: true}));

    // Handler should NOT be called when ref is null (hook ignores the event)
    expect(handler).not.toHaveBeenCalled();
  });

  it("removes event listeners on unmount", () => {
    const handler = vi.fn();
    const ref = {current: element};
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const {unmount} = renderHook(() => useOnClickOutside(ref, handler));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
  });

  it("updates handler when it changes", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const ref = {current: element};

    const {rerender} = renderHook(({handler}) => useOnClickOutside(ref, handler), {
      initialProps: {handler: handler1},
    });

    outsideElement.dispatchEvent(new MouseEvent("mousedown", {bubbles: true}));
    expect(handler1).toHaveBeenCalledTimes(1);

    rerender({handler: handler2});

    outsideElement.dispatchEvent(new MouseEvent("mousedown", {bubbles: true}));
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("passes the event to the handler", () => {
    const handler = vi.fn();
    const ref = {current: element};

    renderHook(() => useOnClickOutside(ref, handler));

    const event = new MouseEvent("mousedown", {bubbles: true});
    outsideElement.dispatchEvent(event);

    expect(handler).toHaveBeenCalledWith(expect.any(MouseEvent));
  });
});
