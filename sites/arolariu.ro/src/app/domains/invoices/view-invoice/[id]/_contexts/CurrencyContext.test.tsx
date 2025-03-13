/** @format */

import {act, render, renderHook} from "@testing-library/react";
import {CurrencyProvider, useCurrencyContext} from "./CurrencyContext";

describe("CurrencyContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("provides default currency value", () => {
    const {result} = renderHook(() => useCurrencyContext(), {
      wrapper: ({children}) => <CurrencyProvider>{children}</CurrencyProvider>,
    });

    expect(result.current.currency).toEqual({
      code: "RON",
      name: "Romanian Leu",
      symbol: "lei",
    });
  });

  it("uses initialValue when provided", () => {
    const initialValue = {
      currency: {code: "USD", name: "US Dollar", symbol: "$"},
      setCurrency: jest.fn(),
    };

    const {result} = renderHook(() => useCurrencyContext(), {
      wrapper: ({children}) => <CurrencyProvider initialValue={initialValue}>{children}</CurrencyProvider>,
    });

    expect(result.current.currency).toEqual({
      code: "USD",
      name: "US Dollar",
      symbol: "$",
    });
  });

  it("provides setCurrency function", () => {
    const {result} = renderHook(() => useCurrencyContext(), {
      wrapper: ({children}) => <CurrencyProvider>{children}</CurrencyProvider>,
    });

    expect(typeof result.current.setCurrency).toBe("function");
  });

  it("updates the currency when setCurrency is called", () => {
    const {result} = renderHook(() => useCurrencyContext(), {
      wrapper: ({children}) => <CurrencyProvider>{children}</CurrencyProvider>,
    });

    act(() => {
      result.current.setCurrency({code: "USD", name: "US Dollar", symbol: "$"});
    });

    expect(result.current.currency).toEqual({
      code: "USD",
      name: "US Dollar",
      symbol: "$",
    });
  });

  it("allows updating the currency", () => {
    const {result} = renderHook(() => useCurrencyContext(), {
      wrapper: ({children}) => <CurrencyProvider>{children}</CurrencyProvider>,
    });

    act(() => {
      result.current.setCurrency({code: "EUR", name: "Euro", symbol: "€"});
    });

    expect(result.current.currency).toEqual({
      code: "EUR",
      name: "Euro",
      symbol: "€",
    });
  });

  it("throws error when used outside of provider", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCurrencyContext());
    }).toThrow("useCurrencyContext must be used within a CurrencyProvider");

    consoleErrorSpy.mockRestore();
  });

  it("memoizes the context value", () => {
    const TestComponent = () => {
      const contextValue = useCurrencyContext();
      return <div data-testid='currency-code'>{contextValue.currency.code}</div>;
    };

    const {getByTestId} = render(
      <CurrencyProvider>
        <TestComponent />
      </CurrencyProvider>,
    );

    expect(getByTestId("currency-code").textContent).toBe("RON");
  });

  it("updates the currency in the context when setCurrency is called", () => {
    const TestComponent = () => {
      const {currency, setCurrency} = useCurrencyContext();
      return (
        <div>
          <span data-testid='currency-code'>{currency.code}</span>
          <button onClick={() => setCurrency({code: "USD", name: "US Dollar", symbol: "$"})}>Change Currency</button>
        </div>
      );
    };

    const {getByTestId, getByText} = render(
      <CurrencyProvider>
        <TestComponent />
      </CurrencyProvider>,
    );

    expect(getByTestId("currency-code").textContent).toBe("RON");

    act(() => {
      getByText("Change Currency").click();
    });

    expect(getByTestId("currency-code").textContent).toBe("USD");
  });

  it("does not re-render when the currency is not changed", () => {
    const mockSetCurrency = jest.fn();

    const TestComponent = () => {
      const {currency, setCurrency} = useCurrencyContext();
      return (
        <div>
          <span data-testid='currency-code'>{currency.code}</span>
          <button onClick={() => setCurrency({code: "RON", name: "Romanian Leu", symbol: "lei"})}>Change Currency</button>
        </div>
      );
    };

    const {getByTestId, getByText} = render(
      <CurrencyProvider>
        <TestComponent />
      </CurrencyProvider>,
    );

    expect(getByTestId("currency-code").textContent).toBe("RON");

    act(() => {
      getByText("Change Currency").click();
    });

    expect(mockSetCurrency).not.toHaveBeenCalled();
  });

  it("does not re-render when the currency is not changed (with memoization)", () => {
    const mockSetCurrency = jest.fn();

    const TestComponent = () => {
      const {currency, setCurrency} = useCurrencyContext();
      return (
        <div>
          <span data-testid='currency-code'>{currency.code}</span>
          <button onClick={() => setCurrency({code: "RON", name: "Romanian Leu", symbol: "lei"})}>Change Currency</button>
        </div>
      );
    };

    const {getByTestId, getByText} = render(
      <CurrencyProvider>
        <TestComponent />
      </CurrencyProvider>,
    );

    expect(getByTestId("currency-code").textContent).toBe("RON");

    act(() => {
      getByText("Change Currency").click();
    });

    expect(mockSetCurrency).not.toHaveBeenCalled();
  });

  it("updates the currency in the context when setCurrency is called (with memoization)", () => {
    const TestComponent = () => {
      const {currency, setCurrency} = useCurrencyContext();
      return (
        <div>
          <span data-testid='currency-code'>{currency.code}</span>
          <button onClick={() => setCurrency({code: "USD", name: "US Dollar", symbol: "$"})}>Change Currency</button>
        </div>
      );
    };

    const {getByTestId, getByText} = render(
      <CurrencyProvider>
        <TestComponent />
      </CurrencyProvider>,
    );

    expect(getByTestId("currency-code").textContent).toBe("RON");

    act(() => {
      getByText("Change Currency").click();
    });

    expect(getByTestId("currency-code").textContent).toBe("USD");
  });
});
