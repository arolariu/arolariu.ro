/** @format */

"use client";

import type {Currency} from "@/types/DDD";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {ChevronsUpDown, CurrencyIcon, DollarSign, EuroIcon, PoundSterling, JapaneseYenIcon as Yen} from "lucide-react";

type Props = {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
};

export function CurrencySelector({selectedCurrency, setSelectedCurrency}: Readonly<Props>) {
  const availableCurrencies = [
    {code: "EUR", name: "Euro", symbol: "€", icon: <EuroIcon className='h-4 w-4' />},
    {code: "RON", name: "Romanian Leu", symbol: "lei", icon: <CurrencyIcon className='h-4 w-4' />},
    {code: "MLD", name: "Moldovan Leu", symbol: "lei", icon: <CurrencyIcon className='h-4 w-4' />},
    {code: "GBP", name: "British Pound", symbol: "£", icon: <PoundSterling className='h-4 w-4' />},
    {code: "JPY", name: "Japanese Yen", symbol: "¥", icon: <Yen className='h-4 w-4' />},
    {code: "CAD", name: "Canadian Dollar", symbol: "C$", icon: <DollarSign className='h-4 w-4' />},
    {code: "USD", name: "US Dollar", symbol: "$", icon: <DollarSign className='h-4 w-4' />},
  ];

  const selectedCurrencyInfo = availableCurrencies.find((currency) => currency.code === selectedCurrency.code);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='h-9 gap-1 pr-1.5'>
                <motion.div
                  initial={{scale: 0.9}}
                  animate={{scale: 1}}
                  className='flex items-center'>
                  {selectedCurrencyInfo?.icon}
                  <span className='ml-1'>{selectedCurrencyInfo?.code}</span>
                </motion.div>
                <ChevronsUpDown className='h-3.5 w-3.5 opacity-50' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              className='w-[160px]'>
              {availableCurrencies.map((currency) => (
                <DropdownMenuItem
                  key={currency.code}
                  onClick={() => setSelectedCurrency(currency)}
                  className={`flex items-center gap-2 ${currency.code === selectedCurrency.code ? "bg-muted" : ""}`}>
                  {currency.icon}
                  <span>{currency.name}</span>
                  <span className='text-muted-foreground ml-auto'>{currency.symbol}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>Change currency display</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

