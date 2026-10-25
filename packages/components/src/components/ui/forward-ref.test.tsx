import {act, render, screen} from "@testing-library/react";
import {createRef} from "react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";

// Polyfill for Base UI ScrollArea which calls getAnimations() in happy-dom
beforeAll(() => {
  if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => [];
  }
});

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger, type AccordionProps} from "./accordion";
import {BackgroundBeams} from "./background-beams";
import {Badge} from "./badge";
import {Button} from "./button";
import {Checkbox} from "./checkbox";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "./collapsible";
import {ContextMenu, ContextMenuTrigger} from "./context-menu";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger} from "./dialog";
import {DotBackground} from "./dot-background";
import {Drawer, DrawerContent, DrawerTrigger} from "./drawer";
import {DropdownMenu, DropdownMenuTrigger} from "./dropdown-menu";
import {HoverCard, HoverCardContent, HoverCardTrigger} from "./hover-card";
import {Input} from "./input";
import {Menubar, MenubarMenu, MenubarTrigger} from "./menubar";
import {NumberField, NumberFieldGroup, NumberFieldInput} from "./number-field";
import {Popover, PopoverContent, PopoverTrigger} from "./popover";
import {RadioGroup, RadioGroupItem} from "./radio-group";
import {ScrollArea} from "./scroll-area";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "./select";
import {Sheet, SheetContent, SheetTrigger} from "./sheet";
import {Slider} from "./slider";
import {Switch} from "./switch";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "./tabs";
import {Toggle} from "./toggle";
import {Tooltip, TooltipContent, TooltipTrigger} from "./tooltip";
import {TypewriterText, TypewriterTextSmooth} from "./typewriter";

afterEach(() => vi.restoreAllMocks());

const typewriterWords = [{text: "Hello"}];
const accordionModes: readonly AccordionProps[] = [{defaultValue: ["item-1"]}, {multiple: true, defaultValue: ["item-1"]}];

describe("DOM wrapper ref forwarding", () => {
  it("forwards refs for span, div, and svg wrappers", () => {
    // Arrange
    const badgeRef = createRef<HTMLSpanElement>();
    const backgroundBeamsRef = createRef<HTMLDivElement>();
    const dialogHeaderRef = createRef<HTMLDivElement>();
    const dialogFooterRef = createRef<HTMLDivElement>();
    const dotBackgroundRef = createRef<SVGSVGElement>();
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 32, 16));

    // Act
    render(
      <>
        <Badge ref={badgeRef}>New</Badge>
        <BackgroundBeams ref={backgroundBeamsRef} />
        <DialogHeader ref={dialogHeaderRef}>Header</DialogHeader>
        <DialogFooter ref={dialogFooterRef}>Footer</DialogFooter>
        <DotBackground
          ref={dotBackgroundRef}
          data-testid='dot-background'
        />
      </>,
    );

    // Assert
    expect(badgeRef.current).toBeInstanceOf(HTMLSpanElement);
    expect(badgeRef.current).toBe(screen.getByText("New"));
    expect(badgeRef.current?.tagName).toBe("SPAN");
    expect(backgroundBeamsRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dialogHeaderRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dialogFooterRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dotBackgroundRef.current).toBeInstanceOf(SVGSVGElement);
    expect(dotBackgroundRef.current).toBe(screen.getByTestId("dot-background"));
    expect(dotBackgroundRef.current?.tagName).toBe("svg");
  });

  it("forwards refs for typewriter variants", () => {
    // Arrange
    const typewriterRef = createRef<HTMLDivElement>();
    const smoothTypewriterRef = createRef<HTMLDivElement>();

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
    const buttonRef = createRef<HTMLButtonElement>();
    const inputRef = createRef<HTMLInputElement>();
    const checkboxRef = createRef<HTMLSpanElement>();
    const switchRef = createRef<HTMLSpanElement>();
    const sliderRef = createRef<HTMLDivElement>();
    const toggleRef = createRef<HTMLButtonElement>();
    const selectTriggerRef = createRef<HTMLButtonElement>();
    const selectContentRef = createRef<HTMLDivElement>();
    const dialogTriggerRef = createRef<HTMLElement>();
    const dialogContentRef = createRef<HTMLDivElement>();
    const popoverTriggerRef = createRef<HTMLElement>();
    const popoverContentRef = createRef<HTMLDivElement>();
    const tooltipTriggerRef = createRef<HTMLElement>();
    const tooltipContentRef = createRef<HTMLDivElement>();
    const tabsTriggerRef = createRef<HTMLElement>();
    const tabsContentRef = createRef<HTMLDivElement>();
    const accordionRootRef = createRef<HTMLDivElement>();
    const accordionTriggerRef = createRef<HTMLElement>();
    const accordionContentRef = createRef<HTMLDivElement>();

    // Act
    await act(async () => {
      render(
        <>
          <Button ref={buttonRef}>Click me</Button>
          <Input
            ref={inputRef}
            defaultValue='Hello'
            data-testid='input'
          />
          <Checkbox
            ref={checkboxRef}
            data-testid='checkbox'
          />
          <Switch
            ref={switchRef}
            data-testid='switch'
          />
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
          <Accordion
            ref={accordionRootRef}
            defaultValue={["item-1"]}
            data-testid='canonical-accordion'>
            <AccordionItem value='item-1'>
              <AccordionTrigger
                ref={accordionTriggerRef}
                data-testid='canonical-accordion-trigger'>
                Section
              </AccordionTrigger>
              <AccordionContent
                ref={accordionContentRef}
                data-testid='canonical-accordion-content'>
                Accordion content
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>,
      );
      await Promise.resolve();
    });

    // Assert
    expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    expect(inputRef.current).toBe(screen.getByTestId("input"));
    expect(inputRef.current?.tagName).toBe("INPUT");
    expect(checkboxRef.current).toBeInstanceOf(HTMLSpanElement);
    expect(checkboxRef.current).toBe(screen.getByTestId("checkbox"));
    expect(checkboxRef.current?.tagName).toBe("SPAN");
    expect(switchRef.current).toBeInstanceOf(HTMLSpanElement);
    expect(switchRef.current).toBe(screen.getByTestId("switch"));
    expect(switchRef.current?.tagName).toBe("SPAN");
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
    expect(accordionRootRef.current).toBe(screen.getByTestId("canonical-accordion"));
    expect(accordionRootRef.current?.tagName).toBe("DIV");
    expect(accordionTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(accordionTriggerRef.current).toBe(screen.getByTestId("canonical-accordion-trigger"));
    expect(accordionTriggerRef.current).toHaveAttribute("aria-expanded", "true");
    expect(accordionContentRef.current).toBeInstanceOf(HTMLDivElement);
    expect(accordionContentRef.current).toBe(screen.getByTestId("canonical-accordion-content"));
    expect(accordionContentRef.current).toHaveTextContent("Accordion content");
  });

  it.each(accordionModes)("preserves real DOM refs and native array selection for Accordion mode %#", async (props) => {
    const rootRef = createRef<HTMLDivElement>();
    const triggerRef = createRef<HTMLButtonElement>();
    const contentRef = createRef<HTMLDivElement>();
    const {unmount} = render(
      <Accordion
        {...props}
        ref={rootRef}
        data-testid='array-accordion'>
        <AccordionItem value='item-1'>
          <AccordionTrigger ref={triggerRef}>Expanded section</AccordionTrigger>
          <AccordionContent
            ref={contentRef}
            data-testid='array-accordion-content'>
            Expanded content
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(rootRef.current).toBe(screen.getByTestId("array-accordion"));
    expect(rootRef.current?.tagName).toBe("DIV");
    expect(triggerRef.current).toBe(screen.getByRole("button", {name: "Expanded section"}));
    expect(triggerRef.current?.tagName).toBe("BUTTON");
    expect(triggerRef.current).toHaveAttribute("aria-expanded", "true");
    expect(contentRef.current).toBe(screen.getByTestId("array-accordion-content"));
    expect(contentRef.current?.tagName).toBe("DIV");
    expect(contentRef.current).toHaveTextContent("Expanded content");
    unmount();
    expect(rootRef.current).toBeNull();
    expect(triggerRef.current).toBeNull();
    expect(contentRef.current).toBeNull();
  });

  it("forwards refs for tier 2 Base UI wrappers", async () => {
    // Arrange — trigger refs only (content refs require portal rendering)
    const radioGroupRef = createRef<HTMLDivElement>();
    const radioGroupItemRef = createRef<HTMLSpanElement>();
    const numberFieldGroupRef = createRef<HTMLDivElement>();
    const numberFieldInputRef = createRef<HTMLInputElement>();
    const contextMenuTriggerRef = createRef<HTMLDivElement>();
    const dropdownMenuTriggerRef = createRef<HTMLButtonElement>();
    const menubarTriggerRef = createRef<HTMLButtonElement>();
    const sheetTriggerRef = createRef<HTMLButtonElement>();
    const sheetContentRef = createRef<HTMLDivElement>();
    const drawerTriggerRef = createRef<HTMLButtonElement>();
    const drawerContentRef = createRef<HTMLDivElement>();
    const hoverCardTriggerRef = createRef<HTMLAnchorElement>();
    const hoverCardContentRef = createRef<HTMLDivElement>();
    const scrollAreaRef = createRef<HTMLDivElement>();
    const collapsibleTriggerRef = createRef<HTMLButtonElement>();
    const collapsibleContentRef = createRef<HTMLDivElement>();

    // Act
    await act(async () => {
      render(
        <>
          <RadioGroup
            ref={radioGroupRef}
            aria-label='Plans'>
            <RadioGroupItem
              ref={radioGroupItemRef}
              value='starter'
              aria-label='Starter'
              data-testid='radio'
            />
          </RadioGroup>
          <NumberField
            aria-label='Quantity'
            defaultValue={2}>
            <NumberFieldGroup ref={numberFieldGroupRef}>
              <NumberFieldInput
                ref={numberFieldInputRef}
                data-testid='number-field-input'
              />
            </NumberFieldGroup>
          </NumberField>
          <ContextMenu>
            <ContextMenuTrigger ref={contextMenuTriggerRef}>Right-click me</ContextMenuTrigger>
          </ContextMenu>
          <DropdownMenu>
            <DropdownMenuTrigger ref={dropdownMenuTriggerRef}>Open dropdown</DropdownMenuTrigger>
          </DropdownMenu>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger ref={menubarTriggerRef}>File</MenubarTrigger>
            </MenubarMenu>
          </Menubar>
          <Sheet defaultOpen>
            <SheetTrigger ref={sheetTriggerRef}>Open sheet</SheetTrigger>
            <SheetContent ref={sheetContentRef}>Sheet content</SheetContent>
          </Sheet>
          <Drawer defaultOpen>
            <DrawerTrigger ref={drawerTriggerRef}>Open drawer</DrawerTrigger>
            <DrawerContent ref={drawerContentRef}>Drawer content</DrawerContent>
          </Drawer>
          <HoverCard defaultOpen>
            <HoverCardTrigger
              ref={hoverCardTriggerRef}
              href='/profile'>
              Hover card link
            </HoverCardTrigger>
            <HoverCardContent ref={hoverCardContentRef}>Hover card content</HoverCardContent>
          </HoverCard>
          <ScrollArea ref={scrollAreaRef}>Scrollable content</ScrollArea>
          <Collapsible defaultOpen>
            <CollapsibleTrigger ref={collapsibleTriggerRef}>Toggle details</CollapsibleTrigger>
            <CollapsibleContent ref={collapsibleContentRef}>Hidden details content</CollapsibleContent>
          </Collapsible>
        </>,
      );
      await Promise.resolve();
    });

    // Assert — trigger refs are set on mount, content refs only for defaultOpen components
    expect(radioGroupRef.current).toBeInstanceOf(HTMLDivElement);
    expect(radioGroupItemRef.current).toBeInstanceOf(HTMLSpanElement);
    expect(radioGroupItemRef.current).toBe(screen.getByTestId("radio"));
    expect(radioGroupItemRef.current?.tagName).toBe("SPAN");
    expect(numberFieldGroupRef.current).toBeInstanceOf(HTMLDivElement);
    expect(numberFieldInputRef.current).toBeInstanceOf(HTMLInputElement);
    expect(numberFieldInputRef.current).toBe(screen.getByTestId("number-field-input"));
    expect(numberFieldInputRef.current?.tagName).toBe("INPUT");
    expect(contextMenuTriggerRef.current).toBeInstanceOf(HTMLElement);
    expect(dropdownMenuTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(menubarTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(sheetTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(drawerTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(hoverCardTriggerRef.current).toBeInstanceOf(HTMLElement);
    expect(scrollAreaRef.current).toBeInstanceOf(HTMLDivElement);
    expect(collapsibleTriggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(collapsibleContentRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
