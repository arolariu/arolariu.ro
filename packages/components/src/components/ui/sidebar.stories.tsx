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
import styles from "./sidebar.module.css";

function SidebarStatus(): React.JSX.Element {
  const {state, isMobile, openMobile} = useSidebar();
  return <p role='status'>{isMobile ? `Mobile sheet ${openMobile ? "open" : "closed"}` : `Desktop sidebar ${state}`}</p>;
}

function Navigation(): React.JSX.Element {
  return (
    <>
      <SidebarHeader>
        <strong className={styles.storyBrand}>Workspace</strong>
        <SidebarInput
          aria-label='Search navigation'
          placeholder='Search navigation…'
        />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <h2>Navigation</h2>
          </SidebarGroupLabel>
          <SidebarGroupAction aria-label='Create a project'>
            <Plus aria-hidden='true' />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive
                  tooltip='Home'
                  asChild>
                  <a href='#home'>
                    <Home aria-hidden='true' />
                    <span>Home</span>
                  </a>
                </SidebarMenuButton>
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
                      <BaseMenu.Popup className={styles.storyMenu}>
                        <BaseMenu.Item className={styles.storyMenuItem}>Rename project</BaseMenu.Item>
                        <BaseMenu.Item className={styles.storyMenuItem}>Archive project</BaseMenu.Item>
                      </BaseMenu.Popup>
                    </BaseMenu.Positioner>
                  </BaseMenu.Portal>
                </BaseMenu.Root>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      href='#overview'
                      isActive>
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
}: Readonly<Pick<Sidebar.Props, "side" | "variant" | "collapsible" | "dir"> & {defaultOpen?: boolean}>): React.JSX.Element {
  const inheritedDirection = useDirection();
  const sidebarFirst = (side === "left") !== ((dir ?? inheritedDirection) === "rtl");
  const sidebar = (
    <Sidebar
      key='sidebar'
      side={side}
      variant={variant}
      collapsible={collapsible}
      dir={dir}>
      <Navigation />
    </Sidebar>
  );
  const main = (
    <SidebarInset
      key='main'
      className={styles.storyMain}>
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
      onOpenChange={setOpen}>
      <Sidebar collapsible='icon'>
        <Navigation />
      </Sidebar>
      <SidebarInset className={styles.storyMain}>
        <SidebarTrigger />
        <h1>Controlled sidebar</h1>
        <Button onClick={() => setOpen((value) => !value)}>Owner toggle</Button>
        <SidebarStatus />
      </SidebarInset>
    </SidebarProvider>
  );
}

const meta = {
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
/** Both the sidebar trigger and an owning control use controlled state. */
export const Controlled: Story = {render: () => <ControlledDemo />};
/** Floating panels reserve full expanded space and icon-only collapsed space. */
export const Floating: Story = {args: {variant: "floating", collapsible: "icon"}};
/** Inset main-region geometry shares the same native state contract. */
export const Inset: Story = {args: {variant: "inset", collapsible: "icon"}};
/** Logical sidebar placement and nested-list borders follow RTL direction. */
export const RightToLeft: Story = {args: {dir: "rtl", side: "right", variant: "floating", collapsible: "icon"}};
/** Narrow the viewport below 768px, open, Tab/Shift+Tab, Escape, and try the actual backdrop. No hook is mocked. */
export const MobileFocus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use a viewport below 768px. Verify focus entry/containment/return, outside inertness, Escape, and backdrop dismissal in the real Sheet.",
      },
    },
  },
};
/** Noncollapsible navigation is intentionally nonmodal at every viewport. */
export const Static: Story = {args: {collapsible: "none"}};
