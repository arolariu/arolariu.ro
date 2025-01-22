/** @format */
import {fonts} from "@/fonts";
import {render, waitFor} from "@testing-library/react";
import {NextFont} from "next/dist/compiled/@next/font";
import {Caudex} from "next/font/google";
import {act} from "react";
import {FontContextProvider, useFontContext} from "./FontContext";

const defaultFont = fonts[0] as NextFont;
const customFont: NextFont = Caudex({
  weight: "400",
  style: "italic",
  subsets: ["latin-ext"],
  preload: true,
});

const TestComponent = () => {
  const {font, setFont} = useFontContext();
  return (
    <div>
      <span data-testid='font'>{JSON.stringify(font)}</span>
      <button onClick={() => setFont(customFont)}>Set Font</button>
    </div>
  );
};

describe("useFontContext", () => {
  it("should use default font when no currentFont is provided", async () => {
    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(
        <FontContextProvider>
          <TestComponent />
        </FontContextProvider>,
      );
      getByTestId = result.getByTestId;
    });

    await waitFor(() => expect(getByTestId("font").textContent).toEqual(JSON.stringify(defaultFont)));
  });

  it("should use provided currentFont", async () => {
    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(
        <FontContextProvider currentFont={customFont}>
          <TestComponent />
        </FontContextProvider>,
      );
      getByTestId = result.getByTestId;
    });

    await waitFor(() => expect(getByTestId("font").textContent).toEqual(JSON.stringify(customFont)));
  });

  it("should update font when setFont is called", async () => {
    let getByTestId: (id: string) => HTMLElement;
    let getByText: (text: string) => HTMLElement;
    await act(async () => {
      const result = render(
        <FontContextProvider>
          <TestComponent />
        </FontContextProvider>,
      );
      getByTestId = result.getByTestId;
      getByText = result.getByText;
    });

    // Confirm default font
    await waitFor(() => expect(getByTestId("font").textContent).toEqual(JSON.stringify(defaultFont)));

    // Set custom font
    await act(async () => {
      getByText("Set Font").click();
    });

    // Confirm custom font
    await waitFor(() => expect(getByTestId("font").textContent).toEqual(JSON.stringify(customFont)));
  });

  it("should throw error if used outside of FontContextProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow("useFontContext must be used within a FontContextProvider");
    consoleError.mockRestore();
  });

  it("should not throw error if used within FontContextProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <FontContextProvider>
          <TestComponent />
        </FontContextProvider>,
      ),
    ).not.toThrow();
    consoleError.mockRestore();
  });

  it("should get the font set from localStorage", async () => {
    const localStorageMock = (function () {
      let store: Record<string, string> = {};

      return {
        getItem: function (key: string) {
          return store[key] || null;
        },
        setItem: function (key: string, value: string) {
          store[key] = value.toString();
        },
        removeItem: function (key: string) {
          delete store[key];
        },
        clear: function () {
          store = {};
        },
      };
    })();

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });

    localStorageMock.setItem("selectedFont", JSON.stringify(customFont));

    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(
        <FontContextProvider>
          <TestComponent />
        </FontContextProvider>,
      );
      getByTestId = result.getByTestId;
    });

    await waitFor(() => expect(getByTestId("font").textContent).toEqual(JSON.stringify(customFont)));
    await waitFor(() => expect(localStorageMock.getItem("selectedFont")).toEqual(JSON.stringify(customFont)));
  });

  it("should update the font in localStorage", async () => {
    const localStorageMock = (function () {
      let store: Record<string, string> = {};

      return {
        getItem: function (key: string) {
          return store[key] || null;
        },
        setItem: function (key: string, value: string) {
          store[key] = value.toString();
        },
        removeItem: function (key: string) {
          delete store[key];
        },
        clear: function () {
          store = {};
        },
      };
    })();

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });

    let getByText: (text: string) => HTMLElement;
    await act(async () => {
      const result = render(
        <FontContextProvider>
          <TestComponent />
        </FontContextProvider>,
      );
      getByText = result.getByText;
    });

    const initialFont = localStorageMock.getItem("selectedFont");
    expect(initialFont).toEqual(JSON.stringify(defaultFont));

    await act(async () => {
      getByText("Set Font").click();
    });

    await waitFor(() => expect(localStorageMock.getItem("selectedFont")).toEqual(JSON.stringify(customFont)));

    const newFont = localStorageMock.getItem("selectedFont");
    expect(newFont).toEqual(JSON.stringify(customFont));
  });

  it("should fetch the updated font from localStorage", async () => {
    const localStorageMock = (function () {
      let store: Record<string, string> = {};

      return {
        getItem: function (key: string) {
          return store[key] || null;
        },
        setItem: function (key: string, value: string) {
          store[key] = value.toString();
        },
        removeItem: function (key: string) {
          delete store[key];
        },
        clear: function () {
          store = {};
        },
      };
    })();

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });

    localStorageMock.setItem("selectedFont", JSON.stringify(defaultFont));

    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(
        <FontContextProvider>
          <TestComponent />
        </FontContextProvider>,
      );
      getByTestId = result.getByTestId;
    });

    await waitFor(() => expect(getByTestId("font").textContent).toEqual(JSON.stringify(defaultFont)));
    const initialFont = localStorageMock.getItem("selectedFont");
    expect(initialFont).toEqual(JSON.stringify(defaultFont));

    // Set custom font
    await act(async () => {
      getByTestId("font").click();
    });

    // Confirm custom font
    await waitFor(() => expect(getByTestId("font").textContent).toEqual(JSON.stringify(customFont)));
    const receivedFont = localStorageMock.getItem("selectedFont");
    expect(receivedFont).toEqual(JSON.stringify(customFont));
  });
});
