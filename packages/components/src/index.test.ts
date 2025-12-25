import {describe, expect, it} from "vitest";
import * as exports from "./index";

describe("index.ts exports", () => {
  it("should export components and utilities", () => {
    expect(exports).toBeDefined();
    const exportKeys = Object.keys(exports);
    expect(exportKeys.length).toBeGreaterThan(0);
  });

  describe("Accordion", () => {
    it("should export Accordion", () => expect(exports).toHaveProperty("Accordion"));
    it("should export AccordionContent", () => expect(exports).toHaveProperty("AccordionContent"));
    it("should export AccordionItem", () => expect(exports).toHaveProperty("AccordionItem"));
    it("should export AccordionTrigger", () => expect(exports).toHaveProperty("AccordionTrigger"));
  });

  describe("Alert", () => {
    it("should export Alert", () => expect(exports).toHaveProperty("Alert"));
    it("should export AlertDescription", () => expect(exports).toHaveProperty("AlertDescription"));
    it("should export AlertTitle", () => expect(exports).toHaveProperty("AlertTitle"));
  });

  describe("AlertDialog", () => {
    it("should export AlertDialog", () => expect(exports).toHaveProperty("AlertDialog"));
    it("should export AlertDialogAction", () => expect(exports).toHaveProperty("AlertDialogAction"));
    it("should export AlertDialogCancel", () => expect(exports).toHaveProperty("AlertDialogCancel"));
    it("should export AlertDialogContent", () => expect(exports).toHaveProperty("AlertDialogContent"));
    it("should export AlertDialogDescription", () => expect(exports).toHaveProperty("AlertDialogDescription"));
    it("should export AlertDialogFooter", () => expect(exports).toHaveProperty("AlertDialogFooter"));
    it("should export AlertDialogHeader", () => expect(exports).toHaveProperty("AlertDialogHeader"));
    it("should export AlertDialogOverlay", () => expect(exports).toHaveProperty("AlertDialogOverlay"));
    it("should export AlertDialogPortal", () => expect(exports).toHaveProperty("AlertDialogPortal"));
    it("should export AlertDialogTitle", () => expect(exports).toHaveProperty("AlertDialogTitle"));
    it("should export AlertDialogTrigger", () => expect(exports).toHaveProperty("AlertDialogTrigger"));
  });

  describe("AspectRatio", () => {
    it("should export AspectRatio", () => expect(exports).toHaveProperty("AspectRatio"));
  });

  describe("Avatar", () => {
    it("should export Avatar", () => expect(exports).toHaveProperty("Avatar"));
    it("should export AvatarFallback", () => expect(exports).toHaveProperty("AvatarFallback"));
    it("should export AvatarImage", () => expect(exports).toHaveProperty("AvatarImage"));
  });

  describe("BackgroundBeams", () => {
    it("should export BackgroundBeams", () => expect(exports).toHaveProperty("BackgroundBeams"));
  });

  describe("Badge", () => {
    it("should export Badge", () => expect(exports).toHaveProperty("Badge"));
    it("should export badgeVariants", () => expect(exports).toHaveProperty("badgeVariants"));
  });

  describe("Breadcrumb", () => {
    it("should export Breadcrumb", () => expect(exports).toHaveProperty("Breadcrumb"));
    it("should export BreadcrumbEllipsis", () => expect(exports).toHaveProperty("BreadcrumbEllipsis"));
    it("should export BreadcrumbItem", () => expect(exports).toHaveProperty("BreadcrumbItem"));
    it("should export BreadcrumbLink", () => expect(exports).toHaveProperty("BreadcrumbLink"));
    it("should export BreadcrumbList", () => expect(exports).toHaveProperty("BreadcrumbList"));
    it("should export BreadcrumbPage", () => expect(exports).toHaveProperty("BreadcrumbPage"));
    it("should export BreadcrumbSeparator", () => expect(exports).toHaveProperty("BreadcrumbSeparator"));
  });

  describe("BubbleBackground", () => {
    it("should export BubbleBackground", () => expect(exports).toHaveProperty("BubbleBackground"));
  });

  describe("Button", () => {
    it("should export Button", () => expect(exports).toHaveProperty("Button"));
    it("should export buttonVariants", () => expect(exports).toHaveProperty("buttonVariants"));
  });

  describe("ButtonGroup", () => {
    it("should export ButtonGroup", () => expect(exports).toHaveProperty("ButtonGroup"));
    it("should export ButtonGroupSeparator", () => expect(exports).toHaveProperty("ButtonGroupSeparator"));
    it("should export ButtonGroupText", () => expect(exports).toHaveProperty("ButtonGroupText"));
    it("should export buttonGroupVariants", () => expect(exports).toHaveProperty("buttonGroupVariants"));
  });

  describe("Calendar", () => {
    it("should export Calendar", () => expect(exports).toHaveProperty("Calendar"));
  });

  describe("Card", () => {
    it("should export Card", () => expect(exports).toHaveProperty("Card"));
    it("should export CardAction", () => expect(exports).toHaveProperty("CardAction"));
    it("should export CardContent", () => expect(exports).toHaveProperty("CardContent"));
    it("should export CardDescription", () => expect(exports).toHaveProperty("CardDescription"));
    it("should export CardFooter", () => expect(exports).toHaveProperty("CardFooter"));
    it("should export CardHeader", () => expect(exports).toHaveProperty("CardHeader"));
    it("should export CardTitle", () => expect(exports).toHaveProperty("CardTitle"));
  });

  describe("Carousel", () => {
    it("should export Carousel", () => expect(exports).toHaveProperty("Carousel"));
    it("should export CarouselContent", () => expect(exports).toHaveProperty("CarouselContent"));
    it("should export CarouselItem", () => expect(exports).toHaveProperty("CarouselItem"));
    it("should export CarouselNext", () => expect(exports).toHaveProperty("CarouselNext"));
    it("should export CarouselPrevious", () => expect(exports).toHaveProperty("CarouselPrevious"));
  });

  describe("Chart", () => {
    it("should export ChartContainer", () => expect(exports).toHaveProperty("ChartContainer"));
    it("should export ChartLegend", () => expect(exports).toHaveProperty("ChartLegend"));
    it("should export ChartLegendContent", () => expect(exports).toHaveProperty("ChartLegendContent"));
    it("should export ChartStyle", () => expect(exports).toHaveProperty("ChartStyle"));
    it("should export ChartTooltip", () => expect(exports).toHaveProperty("ChartTooltip"));
    it("should export ChartTooltipContent", () => expect(exports).toHaveProperty("ChartTooltipContent"));
  });

  describe("Checkbox", () => {
    it("should export Checkbox", () => expect(exports).toHaveProperty("Checkbox"));
  });

  describe("Utilities", () => {
    it("should export cn", () => expect(exports).toHaveProperty("cn"));
  });

  describe("Collapsible", () => {
    it("should export Collapsible", () => expect(exports).toHaveProperty("Collapsible"));
    it("should export CollapsibleContent", () => expect(exports).toHaveProperty("CollapsibleContent"));
    it("should export CollapsibleTrigger", () => expect(exports).toHaveProperty("CollapsibleTrigger"));
  });

  describe("Command", () => {
    it("should export Command", () => expect(exports).toHaveProperty("Command"));
    it("should export CommandDialog", () => expect(exports).toHaveProperty("CommandDialog"));
    it("should export CommandEmpty", () => expect(exports).toHaveProperty("CommandEmpty"));
    it("should export CommandGroup", () => expect(exports).toHaveProperty("CommandGroup"));
    it("should export CommandInput", () => expect(exports).toHaveProperty("CommandInput"));
    it("should export CommandItem", () => expect(exports).toHaveProperty("CommandItem"));
    it("should export CommandList", () => expect(exports).toHaveProperty("CommandList"));
    it("should export CommandSeparator", () => expect(exports).toHaveProperty("CommandSeparator"));
    it("should export CommandShortcut", () => expect(exports).toHaveProperty("CommandShortcut"));
  });

  describe("ContextMenu", () => {
    it("should export ContextMenu", () => expect(exports).toHaveProperty("ContextMenu"));
    it("should export ContextMenuCheckboxItem", () => expect(exports).toHaveProperty("ContextMenuCheckboxItem"));
    it("should export ContextMenuContent", () => expect(exports).toHaveProperty("ContextMenuContent"));
    it("should export ContextMenuGroup", () => expect(exports).toHaveProperty("ContextMenuGroup"));
    it("should export ContextMenuItem", () => expect(exports).toHaveProperty("ContextMenuItem"));
    it("should export ContextMenuLabel", () => expect(exports).toHaveProperty("ContextMenuLabel"));
    it("should export ContextMenuPortal", () => expect(exports).toHaveProperty("ContextMenuPortal"));
    it("should export ContextMenuRadioGroup", () => expect(exports).toHaveProperty("ContextMenuRadioGroup"));
    it("should export ContextMenuRadioItem", () => expect(exports).toHaveProperty("ContextMenuRadioItem"));
    it("should export ContextMenuSeparator", () => expect(exports).toHaveProperty("ContextMenuSeparator"));
    it("should export ContextMenuShortcut", () => expect(exports).toHaveProperty("ContextMenuShortcut"));
    it("should export ContextMenuSub", () => expect(exports).toHaveProperty("ContextMenuSub"));
    it("should export ContextMenuSubContent", () => expect(exports).toHaveProperty("ContextMenuSubContent"));
    it("should export ContextMenuSubTrigger", () => expect(exports).toHaveProperty("ContextMenuSubTrigger"));
    it("should export ContextMenuTrigger", () => expect(exports).toHaveProperty("ContextMenuTrigger"));
  });

  describe("CountingNumber", () => {
    it("should export CountingNumber", () => expect(exports).toHaveProperty("CountingNumber"));
  });

  describe("Dialog", () => {
    it("should export Dialog", () => expect(exports).toHaveProperty("Dialog"));
    it("should export DialogClose", () => expect(exports).toHaveProperty("DialogClose"));
    it("should export DialogContent", () => expect(exports).toHaveProperty("DialogContent"));
    it("should export DialogDescription", () => expect(exports).toHaveProperty("DialogDescription"));
    it("should export DialogFooter", () => expect(exports).toHaveProperty("DialogFooter"));
    it("should export DialogHeader", () => expect(exports).toHaveProperty("DialogHeader"));
    it("should export DialogOverlay", () => expect(exports).toHaveProperty("DialogOverlay"));
    it("should export DialogPortal", () => expect(exports).toHaveProperty("DialogPortal"));
    it("should export DialogTitle", () => expect(exports).toHaveProperty("DialogTitle"));
    it("should export DialogTrigger", () => expect(exports).toHaveProperty("DialogTrigger"));
  });

  describe("DotBackground", () => {
    it("should export DotBackground", () => expect(exports).toHaveProperty("DotBackground"));
  });

  describe("Drawer", () => {
    it("should export Drawer", () => expect(exports).toHaveProperty("Drawer"));
    it("should export DrawerClose", () => expect(exports).toHaveProperty("DrawerClose"));
    it("should export DrawerContent", () => expect(exports).toHaveProperty("DrawerContent"));
    it("should export DrawerDescription", () => expect(exports).toHaveProperty("DrawerDescription"));
    it("should export DrawerFooter", () => expect(exports).toHaveProperty("DrawerFooter"));
    it("should export DrawerHeader", () => expect(exports).toHaveProperty("DrawerHeader"));
    it("should export DrawerOverlay", () => expect(exports).toHaveProperty("DrawerOverlay"));
    it("should export DrawerPortal", () => expect(exports).toHaveProperty("DrawerPortal"));
    it("should export DrawerTitle", () => expect(exports).toHaveProperty("DrawerTitle"));
    it("should export DrawerTrigger", () => expect(exports).toHaveProperty("DrawerTrigger"));
  });

  describe("DropdownMenu", () => {
    it("should export DropdownMenu", () => expect(exports).toHaveProperty("DropdownMenu"));
    it("should export DropdownMenuCheckboxItem", () => expect(exports).toHaveProperty("DropdownMenuCheckboxItem"));
    it("should export DropdownMenuContent", () => expect(exports).toHaveProperty("DropdownMenuContent"));
    it("should export DropdownMenuGroup", () => expect(exports).toHaveProperty("DropdownMenuGroup"));
    it("should export DropdownMenuItem", () => expect(exports).toHaveProperty("DropdownMenuItem"));
    it("should export DropdownMenuLabel", () => expect(exports).toHaveProperty("DropdownMenuLabel"));
    it("should export DropdownMenuPortal", () => expect(exports).toHaveProperty("DropdownMenuPortal"));
    it("should export DropdownMenuRadioGroup", () => expect(exports).toHaveProperty("DropdownMenuRadioGroup"));
    it("should export DropdownMenuRadioItem", () => expect(exports).toHaveProperty("DropdownMenuRadioItem"));
    it("should export DropdownMenuSeparator", () => expect(exports).toHaveProperty("DropdownMenuSeparator"));
    it("should export DropdownMenuShortcut", () => expect(exports).toHaveProperty("DropdownMenuShortcut"));
    it("should export DropdownMenuSub", () => expect(exports).toHaveProperty("DropdownMenuSub"));
    it("should export DropdownMenuSubContent", () => expect(exports).toHaveProperty("DropdownMenuSubContent"));
    it("should export DropdownMenuSubTrigger", () => expect(exports).toHaveProperty("DropdownMenuSubTrigger"));
    it("should export DropdownMenuTrigger", () => expect(exports).toHaveProperty("DropdownMenuTrigger"));
  });

  describe("DropDrawer", () => {
    it("should export DropDrawer", () => expect(exports).toHaveProperty("DropDrawer"));
    it("should export DropDrawerContent", () => expect(exports).toHaveProperty("DropDrawerContent"));
    it("should export DropDrawerFooter", () => expect(exports).toHaveProperty("DropDrawerFooter"));
    it("should export DropDrawerGroup", () => expect(exports).toHaveProperty("DropDrawerGroup"));
    it("should export DropDrawerItem", () => expect(exports).toHaveProperty("DropDrawerItem"));
    it("should export DropDrawerLabel", () => expect(exports).toHaveProperty("DropDrawerLabel"));
    it("should export DropDrawerSeparator", () => expect(exports).toHaveProperty("DropDrawerSeparator"));
    it("should export DropDrawerSub", () => expect(exports).toHaveProperty("DropDrawerSub"));
    it("should export DropDrawerSubContent", () => expect(exports).toHaveProperty("DropDrawerSubContent"));
    it("should export DropDrawerSubTrigger", () => expect(exports).toHaveProperty("DropDrawerSubTrigger"));
    it("should export DropDrawerTrigger", () => expect(exports).toHaveProperty("DropDrawerTrigger"));
  });

  describe("Empty", () => {
    it("should export Empty", () => expect(exports).toHaveProperty("Empty"));
    it("should export EmptyContent", () => expect(exports).toHaveProperty("EmptyContent"));
    it("should export EmptyDescription", () => expect(exports).toHaveProperty("EmptyDescription"));
    it("should export EmptyHeader", () => expect(exports).toHaveProperty("EmptyHeader"));
    it("should export EmptyMedia", () => expect(exports).toHaveProperty("EmptyMedia"));
    it("should export EmptyTitle", () => expect(exports).toHaveProperty("EmptyTitle"));
  });

  describe("Field", () => {
    it("should export Field", () => expect(exports).toHaveProperty("Field"));
    it("should export FieldContent", () => expect(exports).toHaveProperty("FieldContent"));
    it("should export FieldDescription", () => expect(exports).toHaveProperty("FieldDescription"));
    it("should export FieldError", () => expect(exports).toHaveProperty("FieldError"));
    it("should export FieldGroup", () => expect(exports).toHaveProperty("FieldGroup"));
    it("should export FieldLabel", () => expect(exports).toHaveProperty("FieldLabel"));
    it("should export FieldLegend", () => expect(exports).toHaveProperty("FieldLegend"));
    it("should export FieldSeparator", () => expect(exports).toHaveProperty("FieldSeparator"));
    it("should export FieldSet", () => expect(exports).toHaveProperty("FieldSet"));
    it("should export FieldTitle", () => expect(exports).toHaveProperty("FieldTitle"));
  });

  describe("FireworksBackground", () => {
    it("should export FireworksBackground", () => expect(exports).toHaveProperty("FireworksBackground"));
  });

  describe("FlipButton", () => {
    it("should export FlipButton", () => expect(exports).toHaveProperty("FlipButton"));
  });

  describe("Form", () => {
    it("should export Form", () => expect(exports).toHaveProperty("Form"));
    it("should export FormControl", () => expect(exports).toHaveProperty("FormControl"));
    it("should export FormDescription", () => expect(exports).toHaveProperty("FormDescription"));
    it("should export FormField", () => expect(exports).toHaveProperty("FormField"));
    it("should export FormItem", () => expect(exports).toHaveProperty("FormItem"));
    it("should export FormLabel", () => expect(exports).toHaveProperty("FormLabel"));
    it("should export FormMessage", () => expect(exports).toHaveProperty("FormMessage"));
  });

  describe("GradientBackground", () => {
    it("should export GradientBackground", () => expect(exports).toHaveProperty("GradientBackground"));
  });

  describe("GradientText", () => {
    it("should export GradientText", () => expect(exports).toHaveProperty("GradientText"));
  });

  describe("HighlightText", () => {
    it("should export HighlightText", () => expect(exports).toHaveProperty("HighlightText"));
  });

  describe("HoleBackground", () => {
    it("should export HoleBackground", () => expect(exports).toHaveProperty("HoleBackground"));
  });

  describe("HoverCard", () => {
    it("should export HoverCard", () => expect(exports).toHaveProperty("HoverCard"));
    it("should export HoverCardContent", () => expect(exports).toHaveProperty("HoverCardContent"));
    it("should export HoverCardTrigger", () => expect(exports).toHaveProperty("HoverCardTrigger"));
  });

  describe("Input", () => {
    it("should export Input", () => expect(exports).toHaveProperty("Input"));
  });

  describe("InputGroup", () => {
    it("should export InputGroup", () => expect(exports).toHaveProperty("InputGroup"));
    it("should export InputGroupAddon", () => expect(exports).toHaveProperty("InputGroupAddon"));
    it("should export InputGroupButton", () => expect(exports).toHaveProperty("InputGroupButton"));
    it("should export InputGroupInput", () => expect(exports).toHaveProperty("InputGroupInput"));
    it("should export InputGroupText", () => expect(exports).toHaveProperty("InputGroupText"));
    it("should export InputGroupTextarea", () => expect(exports).toHaveProperty("InputGroupTextarea"));
  });

  describe("InputOTP", () => {
    it("should export InputOTP", () => expect(exports).toHaveProperty("InputOTP"));
    it("should export InputOTPGroup", () => expect(exports).toHaveProperty("InputOTPGroup"));
    it("should export InputOTPSeparator", () => expect(exports).toHaveProperty("InputOTPSeparator"));
    it("should export InputOTPSlot", () => expect(exports).toHaveProperty("InputOTPSlot"));
  });

  describe("Item", () => {
    it("should export Item", () => expect(exports).toHaveProperty("Item"));
    it("should export ItemActions", () => expect(exports).toHaveProperty("ItemActions"));
    it("should export ItemContent", () => expect(exports).toHaveProperty("ItemContent"));
    it("should export ItemDescription", () => expect(exports).toHaveProperty("ItemDescription"));
    it("should export ItemFooter", () => expect(exports).toHaveProperty("ItemFooter"));
    it("should export ItemGroup", () => expect(exports).toHaveProperty("ItemGroup"));
    it("should export ItemHeader", () => expect(exports).toHaveProperty("ItemHeader"));
    it("should export ItemMedia", () => expect(exports).toHaveProperty("ItemMedia"));
    it("should export ItemSeparator", () => expect(exports).toHaveProperty("ItemSeparator"));
    it("should export ItemTitle", () => expect(exports).toHaveProperty("ItemTitle"));
  });

  describe("Kbd", () => {
    it("should export Kbd", () => expect(exports).toHaveProperty("Kbd"));
    it("should export KbdGroup", () => expect(exports).toHaveProperty("KbdGroup"));
  });

  describe("Label", () => {
    it("should export Label", () => expect(exports).toHaveProperty("Label"));
  });

  describe("Menubar", () => {
    it("should export Menubar", () => expect(exports).toHaveProperty("Menubar"));
    it("should export MenubarCheckboxItem", () => expect(exports).toHaveProperty("MenubarCheckboxItem"));
    it("should export MenubarContent", () => expect(exports).toHaveProperty("MenubarContent"));
    it("should export MenubarGroup", () => expect(exports).toHaveProperty("MenubarGroup"));
    it("should export MenubarItem", () => expect(exports).toHaveProperty("MenubarItem"));
    it("should export MenubarLabel", () => expect(exports).toHaveProperty("MenubarLabel"));
    it("should export MenubarMenu", () => expect(exports).toHaveProperty("MenubarMenu"));
    it("should export MenubarPortal", () => expect(exports).toHaveProperty("MenubarPortal"));
    it("should export MenubarRadioGroup", () => expect(exports).toHaveProperty("MenubarRadioGroup"));
    it("should export MenubarRadioItem", () => expect(exports).toHaveProperty("MenubarRadioItem"));
    it("should export MenubarSeparator", () => expect(exports).toHaveProperty("MenubarSeparator"));
    it("should export MenubarShortcut", () => expect(exports).toHaveProperty("MenubarShortcut"));
    it("should export MenubarSub", () => expect(exports).toHaveProperty("MenubarSub"));
    it("should export MenubarSubContent", () => expect(exports).toHaveProperty("MenubarSubContent"));
    it("should export MenubarSubTrigger", () => expect(exports).toHaveProperty("MenubarSubTrigger"));
    it("should export MenubarTrigger", () => expect(exports).toHaveProperty("MenubarTrigger"));
  });

  describe("NavigationMenu", () => {
    it("should export NavigationMenu", () => expect(exports).toHaveProperty("NavigationMenu"));
    it("should export NavigationMenuContent", () => expect(exports).toHaveProperty("NavigationMenuContent"));
    it("should export NavigationMenuIndicator", () => expect(exports).toHaveProperty("NavigationMenuIndicator"));
    it("should export NavigationMenuItem", () => expect(exports).toHaveProperty("NavigationMenuItem"));
    it("should export NavigationMenuLink", () => expect(exports).toHaveProperty("NavigationMenuLink"));
    it("should export NavigationMenuList", () => expect(exports).toHaveProperty("NavigationMenuList"));
    it("should export NavigationMenuTrigger", () => expect(exports).toHaveProperty("NavigationMenuTrigger"));
    it("should export navigationMenuTriggerStyle", () => expect(exports).toHaveProperty("navigationMenuTriggerStyle"));
    it("should export NavigationMenuViewport", () => expect(exports).toHaveProperty("NavigationMenuViewport"));
  });

  describe("Pagination", () => {
    it("should export Pagination", () => expect(exports).toHaveProperty("Pagination"));
    it("should export PaginationContent", () => expect(exports).toHaveProperty("PaginationContent"));
    it("should export PaginationEllipsis", () => expect(exports).toHaveProperty("PaginationEllipsis"));
    it("should export PaginationItem", () => expect(exports).toHaveProperty("PaginationItem"));
    it("should export PaginationLink", () => expect(exports).toHaveProperty("PaginationLink"));
    it("should export PaginationNext", () => expect(exports).toHaveProperty("PaginationNext"));
    it("should export PaginationPrevious", () => expect(exports).toHaveProperty("PaginationPrevious"));
  });

  describe("Popover", () => {
    it("should export Popover", () => expect(exports).toHaveProperty("Popover"));
    it("should export PopoverAnchor", () => expect(exports).toHaveProperty("PopoverAnchor"));
    it("should export PopoverContent", () => expect(exports).toHaveProperty("PopoverContent"));
    it("should export PopoverTrigger", () => expect(exports).toHaveProperty("PopoverTrigger"));
  });

  describe("Progress", () => {
    it("should export Progress", () => expect(exports).toHaveProperty("Progress"));
  });

  describe("RadioGroup", () => {
    it("should export RadioGroup", () => expect(exports).toHaveProperty("RadioGroup"));
    it("should export RadioGroupItem", () => expect(exports).toHaveProperty("RadioGroupItem"));
  });

  describe("Resizable", () => {
    it("should export ResizableHandle", () => expect(exports).toHaveProperty("ResizableHandle"));
    it("should export ResizablePanel", () => expect(exports).toHaveProperty("ResizablePanel"));
    it("should export ResizablePanelGroup", () => expect(exports).toHaveProperty("ResizablePanelGroup"));
  });

  describe("RippleButton", () => {
    it("should export RippleButton", () => expect(exports).toHaveProperty("RippleButton"));
  });

  describe("Scratcher", () => {
    it("should export Scratcher", () => expect(exports).toHaveProperty("Scratcher"));
  });

  describe("ScrollArea", () => {
    it("should export ScrollArea", () => expect(exports).toHaveProperty("ScrollArea"));
    it("should export ScrollBar", () => expect(exports).toHaveProperty("ScrollBar"));
  });

  describe("Select", () => {
    it("should export Select", () => expect(exports).toHaveProperty("Select"));
    it("should export SelectContent", () => expect(exports).toHaveProperty("SelectContent"));
    it("should export SelectGroup", () => expect(exports).toHaveProperty("SelectGroup"));
    it("should export SelectItem", () => expect(exports).toHaveProperty("SelectItem"));
    it("should export SelectLabel", () => expect(exports).toHaveProperty("SelectLabel"));
    it("should export SelectScrollDownButton", () => expect(exports).toHaveProperty("SelectScrollDownButton"));
    it("should export SelectScrollUpButton", () => expect(exports).toHaveProperty("SelectScrollUpButton"));
    it("should export SelectSeparator", () => expect(exports).toHaveProperty("SelectSeparator"));
    it("should export SelectTrigger", () => expect(exports).toHaveProperty("SelectTrigger"));
    it("should export SelectValue", () => expect(exports).toHaveProperty("SelectValue"));
  });

  describe("Separator", () => {
    it("should export Separator", () => expect(exports).toHaveProperty("Separator"));
  });

  describe("Sheet", () => {
    it("should export Sheet", () => expect(exports).toHaveProperty("Sheet"));
    it("should export SheetClose", () => expect(exports).toHaveProperty("SheetClose"));
    it("should export SheetContent", () => expect(exports).toHaveProperty("SheetContent"));
    it("should export SheetDescription", () => expect(exports).toHaveProperty("SheetDescription"));
    it("should export SheetFooter", () => expect(exports).toHaveProperty("SheetFooter"));
    it("should export SheetHeader", () => expect(exports).toHaveProperty("SheetHeader"));
    it("should export SheetOverlay", () => expect(exports).toHaveProperty("SheetOverlay"));
    it("should export SheetPortal", () => expect(exports).toHaveProperty("SheetPortal"));
    it("should export SheetTitle", () => expect(exports).toHaveProperty("SheetTitle"));
    it("should export SheetTrigger", () => expect(exports).toHaveProperty("SheetTrigger"));
  });

  describe("Sidebar", () => {
    it("should export Sidebar", () => expect(exports).toHaveProperty("Sidebar"));
    it("should export SidebarContent", () => expect(exports).toHaveProperty("SidebarContent"));
    it("should export SidebarFooter", () => expect(exports).toHaveProperty("SidebarFooter"));
    it("should export SidebarGroup", () => expect(exports).toHaveProperty("SidebarGroup"));
    it("should export SidebarGroupAction", () => expect(exports).toHaveProperty("SidebarGroupAction"));
    it("should export SidebarGroupContent", () => expect(exports).toHaveProperty("SidebarGroupContent"));
    it("should export SidebarGroupLabel", () => expect(exports).toHaveProperty("SidebarGroupLabel"));
    it("should export SidebarHeader", () => expect(exports).toHaveProperty("SidebarHeader"));
    it("should export SidebarInput", () => expect(exports).toHaveProperty("SidebarInput"));
    it("should export SidebarInset", () => expect(exports).toHaveProperty("SidebarInset"));
    it("should export SidebarMenu", () => expect(exports).toHaveProperty("SidebarMenu"));
    it("should export SidebarMenuAction", () => expect(exports).toHaveProperty("SidebarMenuAction"));
    it("should export SidebarMenuBadge", () => expect(exports).toHaveProperty("SidebarMenuBadge"));
    it("should export SidebarMenuButton", () => expect(exports).toHaveProperty("SidebarMenuButton"));
    it("should export SidebarMenuItem", () => expect(exports).toHaveProperty("SidebarMenuItem"));
    it("should export SidebarMenuSkeleton", () => expect(exports).toHaveProperty("SidebarMenuSkeleton"));
    it("should export SidebarMenuSub", () => expect(exports).toHaveProperty("SidebarMenuSub"));
    it("should export SidebarMenuSubButton", () => expect(exports).toHaveProperty("SidebarMenuSubButton"));
    it("should export SidebarMenuSubItem", () => expect(exports).toHaveProperty("SidebarMenuSubItem"));
    it("should export SidebarProvider", () => expect(exports).toHaveProperty("SidebarProvider"));
    it("should export SidebarRail", () => expect(exports).toHaveProperty("SidebarRail"));
    it("should export SidebarSeparator", () => expect(exports).toHaveProperty("SidebarSeparator"));
    it("should export SidebarTrigger", () => expect(exports).toHaveProperty("SidebarTrigger"));
  });

  describe("Skeleton", () => {
    it("should export Skeleton", () => expect(exports).toHaveProperty("Skeleton"));
  });

  describe("Slider", () => {
    it("should export Slider", () => expect(exports).toHaveProperty("Slider"));
  });

  describe("Spinner", () => {
    it("should export Spinner", () => expect(exports).toHaveProperty("Spinner"));
  });

  describe("Switch", () => {
    it("should export Switch", () => expect(exports).toHaveProperty("Switch"));
  });

  describe("Table", () => {
    it("should export Table", () => expect(exports).toHaveProperty("Table"));
    it("should export TableBody", () => expect(exports).toHaveProperty("TableBody"));
    it("should export TableCaption", () => expect(exports).toHaveProperty("TableCaption"));
    it("should export TableCell", () => expect(exports).toHaveProperty("TableCell"));
    it("should export TableFooter", () => expect(exports).toHaveProperty("TableFooter"));
    it("should export TableHead", () => expect(exports).toHaveProperty("TableHead"));
    it("should export TableHeader", () => expect(exports).toHaveProperty("TableHeader"));
    it("should export TableRow", () => expect(exports).toHaveProperty("TableRow"));
  });

  describe("Tabs", () => {
    it("should export Tabs", () => expect(exports).toHaveProperty("Tabs"));
    it("should export TabsContent", () => expect(exports).toHaveProperty("TabsContent"));
    it("should export TabsList", () => expect(exports).toHaveProperty("TabsList"));
    it("should export TabsTrigger", () => expect(exports).toHaveProperty("TabsTrigger"));
  });

  describe("Textarea", () => {
    it("should export Textarea", () => expect(exports).toHaveProperty("Textarea"));
  });

  describe("Toast", () => {
    it("should export toast", () => expect(exports).toHaveProperty("toast"));
    it("should export Toaster", () => expect(exports).toHaveProperty("Toaster"));
  });

  describe("Toggle", () => {
    it("should export Toggle", () => expect(exports).toHaveProperty("Toggle"));
    it("should export toggleVariants", () => expect(exports).toHaveProperty("toggleVariants"));
  });

  describe("ToggleGroup", () => {
    it("should export ToggleGroup", () => expect(exports).toHaveProperty("ToggleGroup"));
    it("should export ToggleGroupItem", () => expect(exports).toHaveProperty("ToggleGroupItem"));
  });

  describe("Tooltip", () => {
    it("should export Tooltip", () => expect(exports).toHaveProperty("Tooltip"));
    it("should export TooltipContent", () => expect(exports).toHaveProperty("TooltipContent"));
    it("should export TooltipProvider", () => expect(exports).toHaveProperty("TooltipProvider"));
    it("should export TooltipTrigger", () => expect(exports).toHaveProperty("TooltipTrigger"));
  });

  describe("TypewriterText", () => {
    it("should export TypewriterText", () => expect(exports).toHaveProperty("TypewriterText"));
    it("should export TypewriterTextSmooth", () => expect(exports).toHaveProperty("TypewriterTextSmooth"));
  });

  describe("Hooks", () => {
    it("should export useFormField", () => expect(exports).toHaveProperty("useFormField"));
    it("should export useIsMobile", () => expect(exports).toHaveProperty("useIsMobile"));
    it("should export useSidebar", () => expect(exports).toHaveProperty("useSidebar"));
    it("should export useWindowSize", () => expect(exports).toHaveProperty("useWindowSize"));
  });

  it("should not have undefined exports", () => {
    Object.entries(exports).forEach(([key, value]) => {
      expect(value, `Export "${key}" should not be undefined`).toBeDefined();
    });
  });
});
