import {act, render} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "./accordion";
import {BackgroundBeams} from "./background-beams";
import {Badge} from "./badge";
import {Button} from "./button";
import {Checkbox} from "./checkbox";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger} from "./dialog";
import {DotBackground} from "./dot-background";
import {Input} from "./input";
import {Popover, PopoverContent, PopoverTrigger} from "./popover";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "./select";
import {Slider} from "./slider";
import {Switch} from "./switch";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "./tabs";
import {Toggle} from "./toggle";
import {Tooltip, TooltipContent, TooltipTrigger} from "./tooltip";
import {TypewriterText, TypewriterTextSmooth} from "./typewriter";

const typewriterWords = [{text: "Hello"}] as const;

describe("DOM wrapper ref forwarding", () => {
  it("forwards refs for div and svg wrappers", () => {
    // Arrange
    const badgeRef = {current: null as HTMLDivElement | null};
    const backgroundBeamsRef = {current: null as HTMLDivElement | null};
    const dialogHeaderRef = {current: null as HTMLDivElement | null};
    const dialogFooterRef = {current: null as HTMLDivElement | null};
    const dotBackgroundRef = {current: null as SVGSVGElement | null};

    // Act
    render(
      <>
        <Badge ref={badgeRef}>New</Badge>
        <BackgroundBeams ref={backgroundBeamsRef} />
        <DialogHeader ref={dialogHeaderRef}>Header</DialogHeader>
        <DialogFooter ref={dialogFooterRef}>Footer</DialogFooter>
        <DotBackground ref={dotBackgroundRef} />
      </>,
    );

    // Assert
    expect(badgeRef.current).toBeInstanceOf(HTMLDivElement);
    expect(backgroundBeamsRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dialogHeaderRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dialogFooterRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dotBackgroundRef.current).toBeInstanceOf(SVGSVGElement);
  });

  it("forwards refs for typewriter variants", () => {
    // Arrange
    const typewriterRef = {current: null as HTMLDivElement | null};
    const smoothTypewriterRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <>
        <TypewriterText
          ref={typewriterRef}
          words={typewriterWords}
        />
        <TypewriterTextSmooth
          ref={smoothTypewriterRef}
          words={typewriterWords}
        />
      </>,
    );

    // Assert
    expect(typewriterRef.current).toBeInstanceOf(HTMLDivElement);
    expect(smoothTypewriterRef.current).toBeInstanceOf(HTMLDivElement);
  });

  it("forwards refs for tier 1 Base UI wrappers", async () => {
    // Arrange
    const buttonRef = {current: null as HTMLButtonElement | null};
    const inputRef = {current: null as HTMLElement | null};
    const checkboxRef = {current: null as HTMLElement | null};
    const switchRef = {current: null as HTMLElement | null};
    const sliderRef = {current: null as HTMLDivElement | null};
    const toggleRef = {current: null as HTMLButtonElement | null};
    const selectTriggerRef = {current: null as HTMLButtonElement | null};
    const selectContentRef = {current: null as HTMLDivElement | null};
    const dialogTriggerRef = {current: null as HTMLElement | null};
    const dialogContentRef = {current: null as HTMLDivElement | null};
    const popoverTriggerRef = {current: null as HTMLElement | null};
    const popoverContentRef = {current: null as HTMLDivElement | null};
    const tooltipTriggerRef = {current: null as HTMLElement | null};
    const tooltipContentRef = {current: null as HTMLDivElement | null};
    const tabsTriggerRef = {current: null as HTMLElement | null};
    const tabsContentRef = {current: null as HTMLDivElement | null};
    const accordionTriggerRef = {current: null as HTMLElement | null};
    const accordionContentRef = {current: null as HTMLDivElement | null};

    // Act
    await act(async () => {
      render(
        <>
          <Button ref={buttonRef}>Click me</Button>
          <Input
            ref={inputRef}
            defaultValue='Hello'
          />
          <Checkbox ref={checkboxRef} />
          <Switch ref={switchRef} />
          <Slider
            ref={sliderRef}
            defaultValue={[25]}
          />
          <Toggle ref={toggleRef}>Toggle</Toggle>
          <Select defaultOpen>
            <SelectTrigger ref={selectTriggerRef}>
              <SelectValue placeholder='Pick one' />
            </SelectTrigger>
            <SelectContent ref={selectContentRef}>
              <SelectItem value='one'>One</SelectItem>
            </SelectContent>
          </Select>
          <Dialog defaultOpen>
            <DialogTrigger ref={dialogTriggerRef}>Open dialog</DialogTrigger>
            <DialogContent ref={dialogContentRef}>Dialog content</DialogContent>
          </Dialog>
          <Popover defaultOpen>
            <PopoverTrigger ref={popoverTriggerRef}>Open popover</PopoverTrigger>
            <PopoverContent ref={popoverContentRef}>Popover content</PopoverContent>
          </Popover>
          <Tooltip defaultOpen>
            <TooltipTrigger ref={tooltipTriggerRef}>Hover me</TooltipTrigger>
            <TooltipContent ref={tooltipContentRef}>Tooltip content</TooltipContent>
          </Tooltip>
          <Tabs defaultValue='overview'>
            <TabsList>
              <TabsTrigger
                ref={tabsTriggerRef}
                value='overview'>
                Overview
              </TabsTrigger>
            </TabsList>
            <TabsContent
              ref={tabsContentRef}
              value='overview'>
              Tab content
            </TabsContent>
          </Tabs>
          <Accordion defaultValue='item-1'>
            <AccordionItem value='item-1'>
              <AccordionTrigger ref={accordionTriggerRef}>Section</AccordionTrigger>
              <AccordionContent ref={accordionContentRef}>Accordion content</AccordionContent>
            </AccordionItem>
          </Accordion>
        </>,
      );
      await Promise.resolve();
    });

    // Assert
    expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    expect(checkboxRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(switchRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(sliderRef.current).toBeInstanceOf(HTMLDivElement);
    expect(toggleRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(selectTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(selectContentRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dialogTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(dialogContentRef.current).toBeInstanceOf(HTMLDivElement);
    expect(popoverTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(popoverContentRef.current).toBeInstanceOf(HTMLDivElement);
    expect(tooltipTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(tooltipContentRef.current).toBeInstanceOf(HTMLDivElement);
    expect(tabsTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(tabsContentRef.current).toBeInstanceOf(HTMLDivElement);
    expect(accordionTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(accordionContentRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
