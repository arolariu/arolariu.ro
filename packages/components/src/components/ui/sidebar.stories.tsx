"use client";

import {Menu as BaseMenu} from "@base-ui/react/menu";
import {useDirection} from "@base-ui/react/direction-provider";
import {Home, MoreHorizontal, Plus, Settings} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Button} from "./button";
import {
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
} from "./sidebar";

function SidebarStatus(): React.JSX.Element {
  const {state, isMobile, openMobile} = useSidebar();
  return <p role='status'>{isMobile ? `Mobile sheet ${openMobile ? "open" : "closed"}` : `Desktop sidebar ${state}`}</p>;
}

type CurrentDestination = "home" | "overview";

/** Marks only the current destination with `isActive`, which also exposes `aria-current="page"`. */
function Navigation({current = "home"}: Readonly<{current?: CurrentDestination}>): React.JSX.Element {
  return (
    <>
      <SidebarHeader>
        <strong className={storyClasses.storyBrand}>Workspace</strong>
        <SidebarInput
          aria-label='Search navigation'
          placeholder='Search navigation…'
        />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel render={<h2>Navigation</h2>} />
          <SidebarGroupAction aria-label='Create a project'>
            <Plus aria-hidden='true' />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={current === "home"}
                  tooltip='Home'
                  render={
                    <a href='#home'>
                      <Home aria-hidden='true' />
                      <span>Home</span>
                    </a>
                  }
                />
                <SidebarMenuBadge>3</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip='Projects'
                  render={<a href='#projects' />}>
                  <Plus aria-hidden='true' />
                  <span>Projects</span>
                </SidebarMenuButton>
                <BaseMenu.Root>
                  <BaseMenu.Trigger
                    render={
                      <SidebarMenuAction
                        showOnHover
                        aria-label='Project actions'
                      />
                    }>
                    <MoreHorizontal aria-hidden='true' />
                  </BaseMenu.Trigger>
                  <BaseMenu.Portal>
                    <BaseMenu.Positioner>
                      <BaseMenu.Popup className={storyClasses.storyMenu}>
                        <BaseMenu.Item className={storyClasses.storyMenuItem}>Rename project</BaseMenu.Item>
                        <BaseMenu.Item className={storyClasses.storyMenuItem}>Archive project</BaseMenu.Item>
                      </BaseMenu.Popup>
                    </BaseMenu.Positioner>
                  </BaseMenu.Portal>
                </BaseMenu.Root>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      href='#overview'
                      isActive={current === "overview"}>
                      Overview
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      size='sm'
                      render={<a href='#activity' />}>
                      Activity
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton
          tooltip='Settings'
          size='lg'
          variant='outline'
          render={<a href='#settings' />}>
          <Settings aria-hidden='true' />
          <span>Settings</span>
        </SidebarMenuButton>
      </SidebarFooter>
      <SidebarRail />
    </>
  );
}

function SidebarDemo({
  defaultOpen = true,
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  dir,
  current = "home",
}: Readonly<
  Pick<Sidebar.Props, "side" | "variant" | "collapsible" | "dir"> & {defaultOpen?: boolean; current?: CurrentDestination}
>): React.JSX.Element {
  const inheritedDirection = useDirection();
  const sidebarFirst = (side === "left") !== ((dir ?? inheritedDirection) === "rtl");
  const sidebar = (
    <Sidebar
      key='sidebar'
      side={side}
      variant={variant}
      collapsible={collapsible}
      dir={dir}>
      <Navigation current={current} />
    </Sidebar>
  );
  const main = (
    <SidebarInset
      key='main'
      className={storyClasses.storyMain}>
      <SidebarTrigger />
      <h1 id='home'>Responsive navigation</h1>
      <p>Toggle with the control or Ctrl+B / ⌘B. Below 768px, the real Sheet provides modal focus and dismissal.</p>
      <SidebarStatus />
      <Button>Outside focus target</Button>
    </SidebarInset>
  );
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      dir={dir}>
      {sidebarFirst ? [sidebar, main] : [main, sidebar]}
    </SidebarProvider>
  );
}

function ControlledDemo(): React.JSX.Element {
  const [open, setOpen] = React.useState(true);
  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      persistState={false}>
      <Sidebar collapsible='icon'>
        <Navigation />
      </Sidebar>
      <SidebarInset className={storyClasses.storyMain}>
        <SidebarTrigger />
        <h1>Controlled sidebar</h1>
        <Button onClick={() => setOpen((value) => !value)}>Owner toggle</Button>
        <SidebarStatus />
      </SidebarInset>
    </SidebarProvider>
  );
}
const storyStyles = `
.ac-story-sidebar-storyMain {
  align-items: flex-start;
  gap: var(--ac-space-4);
  padding: var(--ac-space-6);
}

.ac-story-sidebar-storyBrand {
  padding: var(--ac-space-2);
}

.ac-story-sidebar-storyMenu {
  min-width: 10rem;
  padding: var(--ac-space-1);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-md);
  background-color: var(--ac-popover);
  color: var(--ac-popover-foreground);
}

.ac-story-sidebar-storyMenuItem {
  padding: var(--ac-space-2);
  border-radius: var(--ac-radius-sm);
  outline: none;
}

.ac-story-sidebar-storyMenuItem[data-highlighted] {
  background-color: var(--ac-accent);
  color: var(--ac-accent-foreground);
}
`;

const storyClasses = {
  storyMain: "ac-story-sidebar-storyMain",
  storyBrand: "ac-story-sidebar-storyBrand",
  storyMenu: "ac-story-sidebar-storyMenu",
  storyMenuItem: "ac-story-sidebar-storyMenuItem",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Layout/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: {layout: "fullscreen"},
  argTypes: {
    side: {control: "select", options: ["left", "right"]},
    variant: {control: "select", options: ["sidebar", "floating", "inset"]},
    collapsible: {control: "select", options: ["offcanvas", "icon", "none"]},
  },
  render: (args) => <SidebarDemo {...args} />,
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Expanded offcanvas navigation with all public structural parts. */
export const Default: Story = {};
/** Icon collapse, real tooltips, nested links, and a real portaled action menu. */
export const WithGroups: Story = {args: {collapsible: "icon"}};
/** Collapsed icon rail; the main-region toggle remains keyboard focusable. */
export const Collapsible: Story = {
  render: () => (
    <SidebarDemo
      defaultOpen={false}
      collapsible='icon'
    />
  ),
};
/** Both the sidebar trigger and an owning control use controlled state; the owner keeps the state, so `persistState={false}` writes no cookie. */
export const Controlled: Story = {render: () => <ControlledDemo />};
/** Floating panels reserve full expanded space and icon-only collapsed space. */
export const Floating: Story = {args: {variant: "floating", collapsible: "icon"}};
/** Inset main-region geometry shares the same native state contract. */
export const Inset: Story = {args: {variant: "inset", collapsible: "icon"}};
/** Logical sidebar placement and nested-list borders follow RTL direction. */
export const RightToLeft: Story = {args: {dir: "rtl", side: "right", variant: "floating", collapsible: "icon"}};
/** Narrow the viewport below 768px, open, Tab/Shift+Tab, Escape, the named close control, and the actual backdrop. No hook is mocked. */
export const MobileFocus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use a viewport below 768px. Verify focus entry/containment/return, outside inertness, Escape, the localizable “Close sidebar” control after the navigation (shown at the top inline-end corner), and backdrop dismissal in the real Sheet.",
      },
    },
  },
};
/** Noncollapsible navigation is intentionally nonmodal at every viewport. */
export const Static: Story = {args: {collapsible: "none"}};
/** A nested link is the current page: only it sets `isActive` (`aria-current="page"`) and it is underlined, not only coloured. */
export const NestedCurrentPage: Story = {render: () => <SidebarDemo current='overview' />};
