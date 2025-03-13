/** @format */

"use client";

import {Currency} from "@/types/DDD";
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
import {ChevronsUpDown} from "lucide-react";
import React from "react";
import {TbCoin} from "react-icons/tb";
import {availableCurrencies, useCurrencyContext} from "../_contexts/CurrencyContext";

export function CurrencySelector() {
  const {currency, setCurrency} = useCurrencyContext();

  const handleSetCurrency = (currency: {code: string; name: string; symbol: string; icon: React.JSX.Element}) => {
    const {icon, ...rest} = currency;
    setCurrency?.(rest as Currency);
  };

  const selectedCurrency = availableCurrencies.find((curr) => curr.code === currency.code);

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
                  {selectedCurrency?.icon ?? <TbCoin className='h-4 w-4' />}
                  <span className='ml-1'>{selectedCurrency?.code ?? currency.code}</span>
                </motion.div>
                <ChevronsUpDown className='h-3.5 w-3.5 opacity-50' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              className='w-[160px]'>
              {availableCurrencies.map((curr) => (
                <DropdownMenuItem
                  key={curr.code}
                  onClick={() => handleSetCurrency(curr)}
                  className={`flex items-center gap-2 ${curr.code === currency.code ? "bg-muted" : ""}`}>
                  {curr.icon}
                  <span>{curr.name}</span>
                  <span className='text-muted-foreground ml-auto'>{curr.symbol}</span>
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
