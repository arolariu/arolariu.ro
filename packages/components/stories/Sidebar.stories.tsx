import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator,
  SidebarMenuButton,
  Button,
} from "../dist";
import {
  BarChart3Icon,
  BoxIcon,
  CircleUserIcon,
  HomeIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  LogOutIcon,
  LucideIcon,
  MenuIcon,
  CalendarIcon,
  BellIcon,
  MessageSquareIcon,
  FolderIcon,
} from "lucide-react";

const meta: Meta<typeof Sidebar> = {
  title: "Design System/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof Sidebar>;

// Helper function to create navigation items
interface NavItem {
  title: string;
  icon: LucideIcon;
  isActive?: boolean;
  badge?: number | string;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboardIcon, isActive: true },
  { title: "Home", icon: HomeIcon },
  { title: "Analytics", icon: BarChart3Icon, badge: 3 },
  { title: "Products", icon: BoxIcon },
  { title: "Customers", icon: UsersIcon },
];

const otherNavItems: NavItem[] = [
  { title: "Settings", icon: SettingsIcon },
  { title: "Profile", icon: CircleUserIcon },
];

// Basic sidebar
export const Basic: Story = {
  render: () => (
    <div className="h-[600px] border rounded-md overflow-hidden">
      <SidebarProvider>
        <div className="grid lg:grid-cols-[280px_1fr] h-full">
          <Sidebar className="hidden lg:flex">
            <SidebarHeader className="h-14 flex items-center px-4 border-b">
              <span className="font-semibold text-lg">My App</span>
            </SidebarHeader>

            <SidebarContent className="p-2">
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem
                    key={item.title}
                    className={item.isActive ? "bg-accent" : undefined}
                  >
                    <Button variant="ghost" className="w-full justify-start">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>

              <SidebarSeparator className="my-2" />

              <SidebarMenu>
                {otherNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Button variant="ghost" className="w-full justify-start">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-2 mt-auto border-t">
              <SidebarMenuItem>
                <Button variant="ghost" className="w-full justify-start">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </SidebarMenuItem>
            </SidebarFooter>
          </Sidebar>

          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Main Content</h1>
            <p className="text-muted-foreground">
              This is the main content area. The sidebar is visible on large
              screens.
            </p>
          </div>
        </div>
      </SidebarProvider>
    </div>
  ),
};

// Collapsible sidebar
export const Collapsible: Story = {
  render: function CollapsibleSidebar() {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
      <div className="h-[600px] border rounded-md overflow-hidden">
        <SidebarProvider defaultCollapsed={collapsed}>
          <div className="grid lg:grid-cols-[auto_1fr] h-full">
            <Sidebar className="hidden lg:flex border-r">
              <SidebarHeader className="h-14 flex items-center px-4 border-b justify-between">
                {!collapsed && (
                  <span className="font-semibold text-lg">My App</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  <MenuIcon className="h-4 w-4" />
                </Button>
              </SidebarHeader>

              <SidebarContent className="p-2">
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem
                      key={item.title}
                      className={item.isActive ? "bg-accent" : undefined}
                    >
                      <Button
                        variant="ghost"
                        className={`${
                          collapsed ? "justify-center" : "justify-start"
                        } w-full`}
                      >
                        <item.icon className={collapsed ? "" : "mr-2"} />
                        {!collapsed && item.title}
                        {!collapsed && item.badge && (
                          <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Button>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>

                <SidebarSeparator className="my-2" />

                <SidebarMenu>
                  {otherNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Button
                        variant="ghost"
                        className={`${
                          collapsed ? "justify-center" : "justify-start"
                        } w-full`}
                      >
                        <item.icon className={collapsed ? "" : "mr-2"} />
                        {!collapsed && item.title}
                      </Button>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>

              <SidebarFooter className="p-2 mt-auto border-t">
                <SidebarMenuItem>
                  <Button
                    variant="ghost"
                    className={`${
                      collapsed ? "justify-center" : "justify-start"
                    } w-full`}
                  >
                    <LogOutIcon className={collapsed ? "" : "mr-2"} />
                    {!collapsed && "Logout"}
                  </Button>
                </SidebarMenuItem>
              </SidebarFooter>
            </Sidebar>

            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Collapsible Sidebar</h1>
              <p className="text-muted-foreground mb-4">
                This sidebar can be collapsed to save space. When collapsed, it
                shows only icons.
              </p>
              <Button
                variant="outline"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? "Expand" : "Collapse"} Sidebar
              </Button>
            </div>
          </div>
        </SidebarProvider>
      </div>
    );
  },
};

// Sidebar with groups
export const WithGroups: Story = {
  render: () => (
    <div className="h-[600px] border rounded-md overflow-hidden">
      <SidebarProvider>
        <div className="grid lg:grid-cols-[280px_1fr] h-full">
          <Sidebar className="hidden lg:flex border-r">
            <SidebarHeader className="h-14 flex items-center px-4 border-b">
              <span className="font-semibold text-lg">My App</span>
            </SidebarHeader>

            <SidebarContent className="p-2">
              <SidebarGroup>
                <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem className="bg-accent">
                      <Button variant="ghost" className="w-full justify-start">
                        <HomeIcon className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <Button variant="ghost" className="w-full justify-start">
                        <BarChart3Icon className="mr-2 h-4 w-4" />
                        Analytics
                      </Button>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <Button variant="ghost" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Calendar
                      </Button>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Content</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <Button variant="ghost" className="w-full justify-start">
                        <FolderIcon className="mr-2 h-4 w-4" />
                        Projects
                      </Button>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <Button variant="ghost" className="w-full justify-start">
                        <MessageSquareIcon className="mr-2 h-4 w-4" />
                        Messages
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          5
                        </span>
                      </Button>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <Button variant="ghost" className="w-full justify-start">
                        <BellIcon className="mr-2 h-4 w-4" />
                        Notifications
                      </Button>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <Button variant="ghost" className="w-full justify-start">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <Button variant="ghost" className="w-full justify-start">
                        <CircleUserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </Button>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-2 mt-auto border-t">
              <SidebarMenuItem>
                <Button variant="ghost" className="w-full justify-start">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </SidebarMenuItem>
            </SidebarFooter>
          </Sidebar>

          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Grouped Navigation</h1>
            <p className="text-muted-foreground">
              This example shows how to organize sidebar items into logical
              groups with labels.
            </p>
          </div>
        </div>
      </SidebarProvider>
    </div>
  ),
};

// Mobile sidebar with trigger
export const MobileWithTrigger: Story = {
  render: () => (
    <div className="h-[600px] border rounded-md overflow-hidden">
      <SidebarProvider>
        <div className="h-full">
          <header className="h-14 border-b flex items-center px-4">
            <SidebarTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SidebarTrigger>
            <span className="font-semibold text-lg ml-4">Mobile Layout</span>
          </header>

          <div className="grid lg:grid-cols-[280px_1fr] h-[calc(100%-3.5rem)]">
            <Sidebar>
              <SidebarHeader className="h-14 flex items-center px-4 border-b lg:border-none">
                <span className="font-semibold text-lg">My App</span>
              </SidebarHeader>

              <SidebarContent className="p-2">
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem
                      key={item.title}
                      className={item.isActive ? "bg-accent" : undefined}
                    >
                      <SidebarMenuButton className="w-full justify-start">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                        {item.badge && (
                          <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>

                <SidebarSeparator className="my-2" />

                <SidebarMenu>
                  {otherNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton className="w-full justify-start">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>

              <SidebarFooter className="p-2 mt-auto border-t">
                <SidebarMenuItem>
                  <SidebarMenuButton className="w-full justify-start">
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    Logout
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarFooter>
            </Sidebar>

            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Responsive Sidebar</h1>
              <p className="text-muted-foreground">
                This sidebar is designed to work on both mobile and desktop. On
                small screens, it becomes a drawer that can be toggled using the
                menu button in the header. Try resizing your browser to see how
                it behaves.
              </p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </div>
  ),
};

// Custom styled sidebar
export const CustomStyled: Story = {
  render: () => (
    <div className="h-[600px] border rounded-md overflow-hidden">
      <SidebarProvider>
        <div className="grid lg:grid-cols-[280px_1fr] h-full">
          <Sidebar className="hidden lg:flex bg-gradient-to-b from-blue-950 to-indigo-950 text-white">
            <SidebarHeader className="h-14 flex items-center px-4 border-b border-blue-800">
              <span className="font-semibold text-lg">Custom Sidebar</span>
            </SidebarHeader>

            <SidebarContent className="p-2">
              <SidebarMenu>
                {mainNavItems.map((item, index) => (
                  <SidebarMenuItem
                    key={item.title}
                    className={item.isActive ? "bg-blue-800/50" : undefined}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-800/30"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                          {item.badge}
                        </span>
                      )}
                    </Button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>

              <SidebarSeparator className="my-2 bg-blue-800" />

              <SidebarMenu>
                {otherNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-800/30"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-2 mt-auto border-t border-blue-800">
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-800/30"
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </SidebarMenuItem>
            </SidebarFooter>
          </Sidebar>

          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Custom Styled Sidebar</h1>
            <p className="text-muted-foreground">
              This example shows a sidebar with custom styling to match your
              brand colors. The gradient background and custom hover effects
              create a unique look and feel.
            </p>
          </div>
        </div>
      </SidebarProvider>
    </div>
  ),
};
