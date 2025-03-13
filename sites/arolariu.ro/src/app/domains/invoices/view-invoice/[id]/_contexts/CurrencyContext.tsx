/** @format */

import type {Currency} from "@/types/DDD";
import {createContext, Dispatch, SetStateAction, useContext, useMemo, useState} from "react";
import {TbCoinEuro, TbCoinPound, TbCoins, TbCoinYen, TbCurrencyDollar} from "react-icons/tb";

export const availableCurrencies = [
  {code: "EUR", name: "Euro", symbol: "€", icon: <TbCoinEuro className='h-4 w-4' />},
  {code: "RON", name: "Romanian Leu", symbol: "lei", icon: <TbCoins className='h-4 w-4' />},
  {code: "MLD", name: "Moldovan Leu", symbol: "lei", icon: <TbCoins className='h-4 w-4' />},
  {code: "GBP", name: "British Pound", symbol: "£", icon: <TbCoinPound className='h-4 w-4' />},
  {code: "JPY", name: "Japanese Yen", symbol: "¥", icon: <TbCoinYen className='h-4 w-4' />},
  {code: "CAD", name: "Canadian Dollar", symbol: "C$", icon: <TbCurrencyDollar className='h-4 w-4' />},
  {code: "USD", name: "US Dollar", symbol: "$", icon: <TbCurrencyDollar className='h-4 w-4' />},
];

/**
 * CurrencyContextValue is an interface that defines the shape of the context value.
 */
interface CurrencyContextValue {
  currency: Currency;
  setCurrency: Dispatch<SetStateAction<Currency>>;
}

/**
 * CurrencyContext is a React context that provides the current currency and a function to update it.
 * It is initialized with default values, which can be overridden by the provider.
 */
const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

/**
 * CurrencyContextProviderProps is an interface that defines the props for the CurrencyProvider component.
 */
interface CurrencyContextProviderProps {
  children: React.ReactNode;
  initialValue?: CurrencyContextValue;
}

/**
 * CurrencyProvider component that manages currency state for the application.
 * This component creates a context that tracks the current currency and provides
 * a way to update it.
 */
export function CurrencyProvider({children, initialValue}: Readonly<CurrencyContextProviderProps>) {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(() => {
    if (initialValue) return initialValue.currency;
    return {code: "RON", name: "Romanian Leu", symbol: "lei"};
  });

  const value = useMemo(
    () => ({
      currency: currentCurrency,
      setCurrency: setCurrentCurrency,
    }),
    [currentCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * Custom hook to use the CurrencyContext.
 * This hook provides access to the current currency and a function to update it.
 * It throws an error if used outside of the CurrencyProvider.
 * @throws Error if used outside of the CurrencyProvider.
 * @returns The current value of the CurrencyContext, which includes the current currency and a function to update it.
 * @example
 * const {currency, setCurrency} = useCurrencyContext();
 * setCurrency({code: "USD", name: "US Dollar", symbol: "$"});
 */
export function useCurrencyContext() {
  const context = useContext(CurrencyContext);

  if (context === undefined) {
    throw new Error("useCurrencyContext must be used within a CurrencyProvider");
  }
  return context;
}
