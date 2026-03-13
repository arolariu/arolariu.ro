// @arolariu/components — Base UI + CSS Modules component library
// Version 1.0.0 — Built on @base-ui/react primitives

// ============================================================
// Base UI Utilities (re-exported for consumer convenience)
// ============================================================
export {CSPProvider} from "@base-ui/react/csp-provider";
export {DirectionProvider} from "@base-ui/react/direction-provider";
export {mergeProps} from "@base-ui/react/merge-props";
export {useRender} from "@base-ui/react/use-render";

// ============================================================
// Components
// ============================================================

export {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "./components/ui/accordion";

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";

export {Alert, AlertDescription, AlertTitle} from "./components/ui/alert";
export type {AlertProps, AlertVariant} from "./components/ui/alert";

export {AspectRatio} from "./components/ui/aspect-ratio";

export {Avatar, AvatarFallback, AvatarImage} from "./components/ui/avatar";

export {Badge, badgeVariants} from "./components/ui/badge";
export type {BadgeProps, BadgeVariant} from "./components/ui/badge";

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";

export {Button, buttonVariants} from "./components/ui/button";
export type {ButtonProps, ButtonSize, ButtonState, ButtonVariant} from "./components/ui/button";

export {ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants} from "./components/ui/button-group";

export {Calendar} from "./components/ui/calendar";
export type {CalendarProps, DateRange, DayPickerProps, Matcher} from "./components/ui/calendar";

export {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "./components/ui/card";

export {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi} from "./components/ui/carousel";
export type {CarouselOptions, CarouselPlugin, CarouselProps} from "./components/ui/carousel";

export {CheckboxGroup} from "./components/ui/checkbox-group";

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  // Recharts chart containers
  AreaChart,
  BarChart,
  ComposedChart,
  FunnelChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  ScatterChart,
  Sankey,
  SunburstChart,
  Treemap,
  // Recharts series elements
  Area,
  Bar,
  BarStack,
  Funnel,
  Line,
  Pie,
  Radar,
  RadialBar,
  Scatter,
  // Recharts axis & grid
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  ZAxis,
  // Recharts annotations & overlays
  Brush,
  ErrorBar,
  RechartsLabel,
  LabelList,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  // Recharts layout
  ResponsiveContainer,
  Customized,
  // Recharts shapes
  Cell,
  Cross,
  Curve,
  Dot,
  Polygon,
  Rectangle,
  Sector,
  Symbols,
  Trapezoid,
  // Recharts z-index (v3.4+)
  ZIndexLayer,
  DefaultZIndexes,
  // Recharts hooks (v3+)
  useChartWidth,
  useChartHeight,
  useOffset,
  usePlotArea,
  useMargin,
  useIsTooltipActive,
  useActiveTooltipCoordinate,
  useActiveTooltipDataPoints,
  useActiveTooltipLabel,
  useXAxisDomain,
  useYAxisDomain,
  // Recharts types
  type DefaultTooltipContentProps,
  type TooltipValueType,
  type DefaultLegendContentProps,
} from "./components/ui/chart";

export {Checkbox} from "./components/ui/checkbox";

export {Collapsible, CollapsibleContent, CollapsibleTrigger} from "./components/ui/collapsible";

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./components/ui/command";

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./components/ui/context-menu";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "./components/ui/drawer";

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

export {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "./components/ui/empty";

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./components/ui/field";

export {
  Controller,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  useFormField,
  useFormState,
  useWatch,
  type FormControlProps,
} from "./components/ui/form";
export type {
  Control,
  ControllerFieldState,
  ControllerProps,
  ControllerRenderProps,
  DefaultValues,
  FieldError as RHFFieldError,
  FieldErrors,
  FieldPath,
  FieldValues,
  Path,
  RegisterOptions,
  Resolver,
  SubmitHandler,
  UseControllerReturn,
  UseFieldArrayReturn,
  UseFormReturn,
} from "./components/ui/form";

export {HoverCard, HoverCardContent, HoverCardTrigger} from "./components/ui/hover-card";

export {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "./components/ui/input-otp";
export type {InputOTPGroupProps, InputOTPProps, InputOTPSeparatorProps, InputOTPSlotProps, OTPInputProps, SlotProps} from "./components/ui/input-otp";

export {Input} from "./components/ui/input";

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./components/ui/input-group";

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./components/ui/item";

export {Kbd, KbdGroup} from "./components/ui/kbd";

export {Label} from "./components/ui/label";

export {Meter, MeterIndicator, MeterLabel, MeterTrack} from "./components/ui/meter";

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./components/ui/menubar";

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "./components/ui/navigation-menu";

export {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "./components/ui/number-field";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./components/ui/pagination";

export {Popover, PopoverAnchor, PopoverContent, PopoverTrigger} from "./components/ui/popover";

export {Progress} from "./components/ui/progress";

export {RadioGroup, RadioGroupItem} from "./components/ui/radio-group";

export {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "./components/ui/resizable";
export type {ImperativePanelGroupHandle, ImperativePanelHandle, ResizableHandleProps, ResizablePanelGroupProps, ResizablePanelProps} from "./components/ui/resizable";

export {ScrollArea, ScrollBar} from "./components/ui/scroll-area";

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

export {Separator} from "./components/ui/separator";

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./components/ui/sidebar";

export {Skeleton} from "./components/ui/skeleton";

export {Spinner} from "./components/ui/spinner";

export {Slider} from "./components/ui/slider";

export {Toaster, toast} from "./components/ui/sonner";
export type {Toast} from "./components/ui/sonner";

export {Switch} from "./components/ui/switch";

export {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "./components/ui/table";

export {Tabs, TabsContent, TabsList, TabsTrigger} from "./components/ui/tabs";

export {Textarea} from "./components/ui/textarea";

export {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator} from "./components/ui/toolbar";

export {ToggleGroup, ToggleGroupItem} from "./components/ui/toggle-group";
export type {ToggleGroupItemProps, ToggleGroupProps} from "./components/ui/toggle-group";

export {Toggle, toggleVariants} from "./components/ui/toggle";
export type {ToggleProps, ToggleSize, ToggleVariant} from "./components/ui/toggle";

export {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "./components/ui/tooltip";

export {CopyButton, type CopyButtonProps} from "./components/ui/copy-button";
export {Stepper, type StepperProps} from "./components/ui/stepper";
export {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  type TimelineContentProps,
  type TimelineDotProps,
  type TimelineItemProps,
  type TimelineProps,
} from "./components/ui/timeline";
export {VisuallyHidden, type VisuallyHiddenProps} from "./components/ui/visually-hidden";

export {useBreakpoint, type Breakpoint} from "./hooks/useBreakpoint";
export {useColorScheme, type ColorScheme} from "./hooks/useColorScheme";
export {useFocusVisible} from "./hooks/useFocusVisible";
export {useIsMobile} from "./hooks/useIsMobile";
export {useMediaQuery} from "./hooks/useMediaQuery";
export {usePrefersContrast} from "./hooks/usePrefersContrast";
export {useReducedMotion} from "./hooks/useReducedMotion";
export {useWindowSize} from "./hooks/useWindowSize";

export {
  adjustHexColorLightness,
  adjustLightness,
  calculateComplementaryHexColor,
  convertHexToHslString,
  convertHslToHexString,
  getComplementaryColor,
  hexToHsl,
  hslToHex,
  isValidHexColor,
  parseHslString,
  parseHslStringToComponents,
  validateHexColorFormat,
} from "./lib/color-conversion-utilities";
export {cn} from "./lib/utilities";
export type {ClassValue} from "./lib/utilities";

// Animate-UI exports:
export {BubbleBackground, type BubbleBackgroundProps} from "./components/ui/bubble-background";
export {CountingNumber, type CountingNumberProps} from "./components/ui/counting-number";
export {FireworksBackground, type FireworksBackgroundProps} from "./components/ui/fireworks-background";
export {FlipButton, type FlipButtonProps, type FlipDirection} from "./components/ui/flip-button";
export {GradientBackground, type GradientBackgroundProps} from "./components/ui/gradient-background";
export {GradientText, type GradientTextProps} from "./components/ui/gradient-text";
export {HighlightText, type HighlightTextProps} from "./components/ui/highlight-text";
export {HoleBackground, type HoleBackgroundProps} from "./components/ui/hole-background";
export {RippleButton, type RippleButtonProps} from "./components/ui/ripple-button";

// Magic UI exports:
export {DotBackground} from "./components/ui/dot-background";
export {Scratcher} from "./components/ui/scratcher";

// Aceternity UI exports:
export {BackgroundBeams} from "./components/ui/background-beams";
export {TypewriterText, TypewriterTextSmooth} from "./components/ui/typewriter";

// DropDrawer export:
export {
  DropDrawer,
  DropDrawerContent,
  DropDrawerFooter,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerSeparator,
  DropDrawerSub,
  DropDrawerSubContent,
  DropDrawerSubTrigger,
  DropDrawerTrigger,
} from "./components/ui/dropdrawer";
