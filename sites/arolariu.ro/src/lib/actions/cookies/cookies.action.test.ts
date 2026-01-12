/**
 * @fileoverview Unit tests for cookie helper actions.
 * @module sites/arolariu.ro/src/lib/actions/cookies/cookies.action/tests
 */

import {cookies} from "next/headers";
import {describe, expect, it, vi, type Mock} from "vitest";
import {deleteCookie, getCookie, setCookie} from "./cookies.action";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("getCookie", () => {
  it("should return the value of the cookie if it exists", async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue({value: "testValue"}),
    };
    (cookies as Mock).mockResolvedValue(mockCookies);

    const result = await getCookie("testCookie");

    expect(result).toBe("testValue");
    expect(mockCookies.get).toHaveBeenCalledWith("testCookie");
  });

  it("should return undefined if the cookie does not exist", async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue(undefined),
    };
    (cookies as Mock).mockResolvedValue(mockCookies);

    const result = await getCookie("nonExistentCookie");

    expect(result).toBeUndefined();
    expect(mockCookies.get).toHaveBeenCalledWith("nonExistentCookie");
  });
});

describe("setCookie", () => {
  it("should set the cookie with the given name and value", async () => {
    const mockCookies = {
      set: vi.fn(),
    };
    (cookies as Mock).mockResolvedValue(mockCookies);

    await setCookie("testCookie", "testValue");

    expect(mockCookies.set).toHaveBeenCalledWith("testCookie", "testValue", {path: "/"});
  });

  it("should handle setting a cookie with an empty value", async () => {
    const mockCookies = {
      set: vi.fn(),
    };
    (cookies as Mock).mockResolvedValue(mockCookies);

    await setCookie("emptyCookie", "");

    expect(mockCookies.set).toHaveBeenCalledWith("emptyCookie", "", {path: "/"});
  });
});

describe("deleteCookie", () => {
  it("should delete the cookie with the given name", async () => {
    const mockCookies = {
      delete: vi.fn(),
    };
    (cookies as Mock).mockResolvedValue(mockCookies);

    await deleteCookie("testCookie");

    expect(mockCookies.delete).toHaveBeenCalledWith("testCookie");
  });

  it("should handle deleting a non-existent cookie", async () => {
    const mockCookies = {
      delete: vi.fn(),
    };
    (cookies as Mock).mockResolvedValue(mockCookies);

    await deleteCookie("nonExistentCookie");

    expect(mockCookies.delete).toHaveBeenCalledWith("nonExistentCookie");
  });
});
