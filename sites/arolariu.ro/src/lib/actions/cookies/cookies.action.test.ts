import {cookies} from "next/headers";
import {deleteCookie, getCookie, setCookie} from "./cookies.action";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("getCookie", () => {
  it("should return the value of the cookie if it exists", async () => {
    const mockCookies = {
      get: jest.fn().mockReturnValue({value: "testValue"}),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    const result = await getCookie("testCookie");

    expect(result).toBe("testValue");
    expect(mockCookies.get).toHaveBeenCalledWith("testCookie");
  });

  it("should return undefined if the cookie does not exist", async () => {
    const mockCookies = {
      get: jest.fn().mockReturnValue(undefined),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    const result = await getCookie("nonExistentCookie");

    expect(result).toBeUndefined();
    expect(mockCookies.get).toHaveBeenCalledWith("nonExistentCookie");
  });
});

describe("setCookie", () => {
  it("should set the cookie with the given name and value", async () => {
    const mockCookies = {
      set: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    await setCookie("testCookie", "testValue");

    expect(mockCookies.set).toHaveBeenCalledWith("testCookie", "testValue", {
      path: "/",
      maxAge: undefined,
      httpOnly: undefined,
      secure: undefined,
      sameSite: undefined,
    });
  });

  it("should handle setting a cookie with an empty value", async () => {
    const mockCookies = {
      set: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    await setCookie("emptyCookie", "");

    expect(mockCookies.set).toHaveBeenCalledWith("emptyCookie", "", {
      path: "/",
      maxAge: undefined,
      httpOnly: undefined,
      secure: undefined,
      sameSite: undefined,
    });
  });

  it("should set cookie with custom options", async () => {
    const mockCookies = {
      set: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    await setCookie("secureCookie", "secureValue", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600,
      path: "/custom",
    });

    expect(mockCookies.set).toHaveBeenCalledWith("secureCookie", "secureValue", {
      path: "/custom",
      maxAge: 3600,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
  });

  it("should use default path when not specified in options", async () => {
    const mockCookies = {
      set: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    await setCookie("testCookie", "testValue", {httpOnly: true});

    expect(mockCookies.set).toHaveBeenCalledWith("testCookie", "testValue", {
      path: "/",
      maxAge: undefined,
      httpOnly: true,
      secure: undefined,
      sameSite: undefined,
    });
  });
});

describe("deleteCookie", () => {
  it("should delete the cookie with the given name", async () => {
    const mockCookies = {
      delete: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    await deleteCookie("testCookie");

    expect(mockCookies.delete).toHaveBeenCalledWith("testCookie");
  });

  it("should handle deleting a non-existent cookie", async () => {
    const mockCookies = {
      delete: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    await deleteCookie("nonExistentCookie");

    expect(mockCookies.delete).toHaveBeenCalledWith("nonExistentCookie");
  });
});
