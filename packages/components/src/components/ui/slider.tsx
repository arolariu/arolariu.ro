"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import {cn} from "@/lib/utilities";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({className, ...props}, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none items-center select-none", className)}
    {...props}>
    <SliderPrimitive.Track className='relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-900/20 dark:bg-neutral-50/20'>
      <SliderPrimitive.Range className='absolute h-full bg-neutral-900 dark:bg-neutral-50' />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className='block h-4 w-4 rounded-full border border-neutral-200 border-neutral-900/50 bg-white shadow transition-colors focus-visible:ring-1 focus-visible:ring-neutral-950 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-950 dark:focus-visible:ring-neutral-300' />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export {Slider};
