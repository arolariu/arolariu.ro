import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

import {useIsMobile} from "@/hooks/useIsMobile";

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

describe("Sidebar", () => {
  it("renders SidebarProvider, Sidebar, SidebarContent, and SidebarTrigger with className and forwarded refs", async () => {
    // Arrange
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(false);

    const providerRef = {current: null as HTMLDivElement | null};
    const sidebarRef = {current: null as HTMLDivElement | null};
    const contentRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <SidebarProvider
        ref={providerRef}
        className='sidebar-provider-class'
        data-testid='sidebar-provider'>
        <Sidebar
          ref={sidebarRef}
          className='sidebar-class'>
          <SidebarContent
            ref={contentRef}
            className='sidebar-content-class'
            data-testid='sidebar-content'>
            Navigation content
          </SidebarContent>
        </Sidebar>
        <SidebarTrigger className='sidebar-trigger-class' />
      </SidebarProvider>,
    );

    // Assert
    const provider = screen.getByTestId("sidebar-provider");
    const content = screen.getByTestId("sidebar-content");
    const trigger = screen.getByRole("button", {name: "Toggle Sidebar"});
    const sidebarRoot = content.closest("[data-state]");
    const sidebarWrap = content.closest("[data-sidebar='sidebar']")?.parentElement;

    expect(provider).toHaveClass("sidebar-provider-class");
    expect(sidebarWrap).toHaveClass("sidebar-class");
    expect(content).toHaveClass("sidebar-content-class");
    expect(trigger).toHaveClass("sidebar-trigger-class");
    expect(providerRef.current).toBe(provider);
    expect(sidebarRef.current).toBe(sidebarRoot);
    expect(contentRef.current).toBe(content);
    expect(sidebarRoot).toHaveAttribute("data-state", "expanded");

    await user.click(trigger);

    await waitFor(() => {
      expect(sidebarRoot).toHaveAttribute("data-state", "collapsed");
    });
  });

  it("renders SidebarMenu component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu data-testid='sidebar-menu'>Menu content</SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const menu = screen.getByTestId("sidebar-menu");
    expect(menu).toBeInTheDocument();
    expect(menu.tagName).toBe("UL");
    expect(menu).toHaveAttribute("data-sidebar", "menu");
  });

  it("renders SidebarMenuItem component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem data-testid='sidebar-menu-item'>Item</SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const menuItem = screen.getByTestId("sidebar-menu-item");
    expect(menuItem).toBeInTheDocument();
    expect(menuItem.tagName).toBe("LI");
    expect(menuItem).toHaveAttribute("data-sidebar", "menu-item");
  });

  it("renders SidebarMenuButton component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const button = screen.getByRole("button", {name: "Dashboard"});
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-sidebar", "menu-button");
  });

  it("renders SidebarGroup component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup data-testid='sidebar-group'>Group content</SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const group = screen.getByTestId("sidebar-group");
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute("data-sidebar", "group");
  });

  it("renders SidebarGroupLabel component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const label = screen.getByText("Projects");
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute("data-sidebar", "group-label");
  });

  it("renders SidebarGroupContent component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent data-testid='sidebar-group-content'>Content</SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const groupContent = screen.getByTestId("sidebar-group-content");
    expect(groupContent).toBeInTheDocument();
    expect(groupContent).toHaveAttribute("data-sidebar", "group-content");
  });

  it("renders SidebarMenuSkeleton component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSkeleton data-testid='sidebar-menu-skeleton' />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const skeleton = screen.getByTestId("sidebar-menu-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("data-sidebar", "menu-skeleton");
  });

  it("renders SidebarMenuSkeleton with icon", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSkeleton
                  showIcon
                  data-testid='sidebar-menu-skeleton'
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const skeleton = screen.getByTestId("sidebar-menu-skeleton");
    expect(skeleton).toBeInTheDocument();

    // Check if the icon skeleton is rendered
    const iconSkeleton = skeleton.querySelector("[data-sidebar='menu-skeleton-icon']");
    expect(iconSkeleton).toBeInTheDocument();
  });

  it("renders SidebarRail component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    const railRef = {current: null as HTMLButtonElement | null};

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Menu</SidebarContent>
          <SidebarRail
            ref={railRef}
            data-testid='sidebar-rail'
          />
        </Sidebar>
      </SidebarProvider>,
    );

    const rail = screen.getByTestId("sidebar-rail");
    expect(rail).toBeInTheDocument();
    expect(rail).toHaveAttribute("data-sidebar", "rail");
    expect(rail).toHaveAttribute("aria-label", "Toggle Sidebar");
    expect(railRef.current).toBe(rail);
  });

  it("SidebarRail toggles sidebar on click", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Menu</SidebarContent>
          <SidebarRail data-testid='sidebar-rail' />
        </Sidebar>
      </SidebarProvider>,
    );

    const rail = screen.getByTestId("sidebar-rail");
    const sidebarContent = screen.getByText("Menu");
    const sidebarRoot = sidebarContent.closest("[data-state]");

    expect(sidebarRoot).toHaveAttribute("data-state", "expanded");

    await user.click(rail);

    await waitFor(() => {
      expect(sidebarRoot).toHaveAttribute("data-state", "collapsed");
    });
  });

  it("renders SidebarHeader component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader data-testid='sidebar-header'>Header content</SidebarHeader>
        </Sidebar>
      </SidebarProvider>,
    );

    const header = screen.getByTestId("sidebar-header");
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute("data-sidebar", "header");
    expect(header).toHaveTextContent("Header content");
  });

  it("renders SidebarFooter component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarFooter data-testid='sidebar-footer'>Footer content</SidebarFooter>
        </Sidebar>
      </SidebarProvider>,
    );

    const footer = screen.getByTestId("sidebar-footer");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute("data-sidebar", "footer");
    expect(footer).toHaveTextContent("Footer content");
  });

  it("renders SidebarInput component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarInput
              placeholder='Search...'
              data-testid='sidebar-input'
            />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const input = screen.getByTestId("sidebar-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-sidebar", "input");
    expect(input).toHaveAttribute("placeholder", "Search...");
  });

  it("renders SidebarInset component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Menu</SidebarContent>
        </Sidebar>
        <SidebarInset data-testid='sidebar-inset'>Main content</SidebarInset>
      </SidebarProvider>,
    );

    const inset = screen.getByTestId("sidebar-inset");
    expect(inset).toBeInTheDocument();
    expect(inset.tagName).toBe("MAIN");
    expect(inset).toHaveTextContent("Main content");
  });

  it("renders SidebarSeparator component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarSeparator data-testid='sidebar-separator' />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const separator = screen.getByTestId("sidebar-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("data-sidebar", "separator");
  });

  it("renders SidebarMenuAction component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Item</SidebarMenuButton>
                <SidebarMenuAction data-testid='sidebar-menu-action'>⋯</SidebarMenuAction>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const action = screen.getByTestId("sidebar-menu-action");
    expect(action).toBeInTheDocument();
    expect(action).toHaveAttribute("data-sidebar", "menu-action");
  });

  it("renders SidebarMenuBadge component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Dashboard</SidebarMenuButton>
                <SidebarMenuBadge data-testid='sidebar-menu-badge'>3</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const badge = screen.getByTestId("sidebar-menu-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-sidebar", "menu-badge");
    expect(badge).toHaveTextContent("3");
  });

  it("renders SidebarMenuSub component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Parent</SidebarMenuButton>
                <SidebarMenuSub data-testid='sidebar-menu-sub'>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton href='/child'>Child</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const menuSub = screen.getByTestId("sidebar-menu-sub");
    expect(menuSub).toBeInTheDocument();
    expect(menuSub).toHaveAttribute("data-sidebar", "menu-sub");
    expect(menuSub.tagName).toBe("UL");
  });

  it("renders SidebarMenuSubButton component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton href='/settings'>Settings</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const subButton = screen.getByRole("link", {name: "Settings"});
    expect(subButton).toBeInTheDocument();
    expect(subButton).toHaveAttribute("href", "/settings");
  });

  it("renders SidebarMenuSubItem component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSub>
                  <SidebarMenuSubItem data-testid='sidebar-menu-sub-item'>
                    <SidebarMenuSubButton href='/test'>Test</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const subItem = screen.getByTestId("sidebar-menu-sub-item");
    expect(subItem).toBeInTheDocument();
    expect(subItem.tagName).toBe("LI");
  });

  it("useSidebar hook returns context values", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    function TestComponent(): React.JSX.Element {
      const {open, state, isMobile, toggleSidebar} = useSidebar();

      return (
        <div>
          <span data-testid='open-state'>{String(open)}</span>
          <span data-testid='state'>{state}</span>
          <span data-testid='is-mobile'>{String(isMobile)}</span>
          <button
            type='button'
            onClick={toggleSidebar}
            data-testid='toggle-button'>
            Toggle
          </button>
        </div>
      );
    }

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <TestComponent />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId("open-state")).toHaveTextContent("true");
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    expect(screen.getByTestId("is-mobile")).toHaveTextContent("false");
  });

  it("useSidebar throws error when used outside SidebarProvider", () => {
    // Arrange
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponent(): React.JSX.Element {
      useSidebar();
      return <div>Test</div>;
    }

    // Act & Assert
    expect(() => render(<TestComponent />)).toThrow("useSidebar must be used within a SidebarProvider.");

    consoleErrorSpy.mockRestore();
  });

  it("renders SidebarProvider with defaultOpen={false}", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarContent data-testid='sidebar-content'>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-state]");
    expect(sidebarRoot).toHaveAttribute("data-state", "collapsed");
  });

  it("renders Sidebar with collapsible='none'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar
          collapsible='none'
          data-testid='sidebar-static'>
          <SidebarContent>Static Sidebar</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const sidebar = screen.getByTestId("sidebar-static");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).not.toHaveAttribute("data-state");
  });

  it("renders Sidebar with collapsible='icon'", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar collapsible='icon'>
          <SidebarContent data-testid='sidebar-content'>Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-state]");

    expect(sidebarRoot).toHaveAttribute("data-state", "expanded");

    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));

    await waitFor(() => {
      expect(sidebarRoot).toHaveAttribute("data-state", "collapsed");
      expect(sidebarRoot).toHaveAttribute("data-collapsible", "icon");
    });
  });

  it("calls custom onClick handler on SidebarTrigger", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(false);
    const mockOnClick = vi.fn();

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger onClick={mockOnClick} />
      </SidebarProvider>,
    );

    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));

    expect(mockOnClick).toHaveBeenCalled();
  });

  it("renders SidebarMenuSub component", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Parent</SidebarMenuButton>
                <SidebarMenuSub data-testid='sidebar-menu-sub'>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton href='/child'>Child</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const menuSub = screen.getByTestId("sidebar-menu-sub");
    expect(menuSub).toBeInTheDocument();
    expect(menuSub).toHaveAttribute("data-sidebar", "menu-sub");
  });

  it("renders SidebarMenuAction with showOnHover prop", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Item</SidebarMenuButton>
                <SidebarMenuAction
                  showOnHover
                  data-testid='sidebar-menu-action'>
                  Actions
                </SidebarMenuAction>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const action = screen.getByTestId("sidebar-menu-action");
    expect(action).toBeInTheDocument();
    expect(action).toHaveAttribute("data-sidebar", "menu-action");
  });

  it("renders controlled SidebarProvider with open={true}", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider open={true}>
        <Sidebar>
          <SidebarContent data-testid='sidebar-content'>Controlled Open Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-state]");
    expect(sidebarRoot).toHaveAttribute("data-state", "expanded");
  });

  it("renders controlled SidebarProvider with open={false}", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider open={false}>
        <Sidebar>
          <SidebarContent data-testid='sidebar-content'>Controlled Closed Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-state]");
    expect(sidebarRoot).toHaveAttribute("data-state", "collapsed");
  });

  it("calls onOpenChange when sidebar is toggled in controlled mode", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(false);
    const mockOnOpenChange = vi.fn();

    render(
      <SidebarProvider
        open={true}
        onOpenChange={mockOnOpenChange}>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders mobile sidebar when isMobile is true", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Mobile Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    const trigger = screen.getByRole("button", {name: "Toggle Sidebar"});
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Mobile Content")).toBeInTheDocument();
    });
  });

  it("renders Sidebar with side='right'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar side='right'>
          <SidebarContent data-testid='sidebar-content'>Right Sidebar</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-side]");
    expect(sidebarRoot).toHaveAttribute("data-side", "right");
  });

  it("renders Sidebar with variant='inset'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar variant='inset'>
          <SidebarContent data-testid='sidebar-content'>Inset Sidebar</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-variant]");
    expect(sidebarRoot).toHaveAttribute("data-variant", "inset");
  });

  it("renders Sidebar with variant='floating'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar variant='floating'>
          <SidebarContent data-testid='sidebar-content'>Floating Sidebar</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-variant]");
    expect(sidebarRoot).toHaveAttribute("data-variant", "floating");
  });

  it("renders SidebarMenuButton with isActive prop", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive
                  data-testid='active-button'>
                  Active Item
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const button = screen.getByTestId("active-button");
    expect(button).toHaveAttribute("data-active", "true");
  });

  it("renders SidebarMenuButton with asChild pattern", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <span data-testid='menu-button-link'>Dashboard Link</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const links = screen.getAllByTestId("menu-button-link");
    // asChild clones props, so we may get duplicates - just check the first one
    expect(links[0].tagName).toBe("SPAN");
    expect(links[0]).toHaveAttribute("data-sidebar", "menu-button");
  });

  it("falls back to the default button when SidebarMenuButton receives a non-element child via asChild", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>{"Plain text child"}</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByRole("button", {name: "Plain text child"})).toHaveAttribute("data-sidebar", "menu-button");
  });

  it("renders SidebarMenuButton with size='sm'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size='sm'
                  data-testid='sm-button'>
                  Small Button
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const button = screen.getByTestId("sm-button");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("renders SidebarMenuButton with size='lg'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size='lg'
                  data-testid='lg-button'>
                  Large Button
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const button = screen.getByTestId("lg-button");
    expect(button).toHaveAttribute("data-size", "lg");
  });

  it("renders SidebarMenuButton with variant='outline'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton variant='outline'>Outline Button</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByRole("button", {name: "Outline Button"})).toBeInTheDocument();
  });

  it("renders SidebarMenuButton with tooltip when collapsed on desktop", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip='Dashboard tooltip'>Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByRole("button", {name: "Dashboard"})).toBeInTheDocument();
  });

  it("renders SidebarMenuButton with object tooltip", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "Custom tooltip content"}}>Settings</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByRole("button", {name: "Settings"})).toBeInTheDocument();
  });

  it("toggles sidebar on mobile when trigger is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Mobile Sidebar Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    const trigger = screen.getByRole("button", {name: "Toggle Sidebar"});

    // Open sidebar
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Mobile Sidebar Content")).toBeInTheDocument();
    });
  });

  it("renders SidebarGroupLabel with asChild pattern", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <span data-testid='group-label-heading'>Custom Heading</span>
              </SidebarGroupLabel>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const labels = screen.getAllByTestId("group-label-heading");
    expect(labels[0].tagName).toBe("SPAN");
    expect(labels[0]).toHaveAttribute("data-sidebar", "group-label");
  });

  it("falls back to the default wrapper when SidebarGroupLabel receives a non-element child via asChild", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel asChild>{"Plain text heading"}</SidebarGroupLabel>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByText("Plain text heading")).toHaveAttribute("data-sidebar", "group-label");
  });

  it("renders SidebarGroupAction with asChild pattern", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
              <SidebarGroupAction asChild>
                <span data-testid='add-project-link'>+</span>
              </SidebarGroupAction>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const actions = screen.getAllByTestId("add-project-link");
    expect(actions[0].tagName).toBe("SPAN");
    expect(actions[0]).toHaveAttribute("data-sidebar", "group-action");
  });

  it("renders SidebarGroupAction with type='submit'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupAction
                type='submit'
                data-testid='submit-action'>
                Submit
              </SidebarGroupAction>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const action = screen.getByTestId("submit-action");
    expect(action).toHaveAttribute("type", "submit");
  });

  it("renders SidebarMenuAction with asChild pattern", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Item</SidebarMenuButton>
                <SidebarMenuAction asChild>
                  <span data-testid='menu-action-link'>More</span>
                </SidebarMenuAction>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const actions = screen.getAllByTestId("menu-action-link");
    expect(actions[0].tagName).toBe("SPAN");
    expect(actions[0]).toHaveAttribute("data-sidebar", "menu-action");
  });

  it("falls back to the default button when SidebarMenuAction receives a non-element child via asChild", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Item</SidebarMenuButton>
                <SidebarMenuAction asChild>{"More actions"}</SidebarMenuAction>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByRole("button", {name: "More actions"})).toHaveAttribute("data-sidebar", "menu-action");
  });

  it("renders SidebarMenuSubButton with isActive prop", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      href='/active-sub'
                      isActive
                      data-testid='active-sub-button'>
                      Active Sub
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const button = screen.getByTestId("active-sub-button");
    expect(button).toHaveAttribute("data-active", "true");
  });

  it("renders SidebarMenuSubButton with size='sm'", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      href='/small-sub'
                      size='sm'
                      data-testid='small-sub-button'>
                      Small Sub
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const button = screen.getByTestId("small-sub-button");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("renders SidebarMenuSubButton with asChild pattern", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <span data-testid='custom-sub-link'>Custom Sub Link</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const links = screen.getAllByTestId("custom-sub-link");
    expect(links[0].tagName).toBe("SPAN");
    expect(links[0]).toHaveAttribute("data-sidebar", "menu-sub-button");
  });

  it("falls back to the default link when SidebarMenuSubButton receives a non-element child via asChild", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>{"Plain nested link"}</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByText("Plain nested link")).toHaveAttribute("data-sidebar", "menu-sub-button");
  });

  it("handles keyboard shortcut (Ctrl+B) to toggle sidebar", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent data-testid='sidebar-content'>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-state]");

    expect(sidebarRoot).toHaveAttribute("data-state", "expanded");

    await user.keyboard("{Control>}b{/Control}");

    await waitFor(() => {
      expect(sidebarRoot).toHaveAttribute("data-state", "collapsed");
    });
  });

  it("handles keyboard shortcut (Cmd+B) to toggle sidebar on Mac", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent data-testid='sidebar-content'>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const content = screen.getByTestId("sidebar-content");
    const sidebarRoot = content.closest("[data-state]");

    expect(sidebarRoot).toHaveAttribute("data-state", "expanded");

    await user.keyboard("{Meta>}b{/Meta}");

    await waitFor(() => {
      expect(sidebarRoot).toHaveAttribute("data-state", "collapsed");
    });
  });

  it("closes mobile sidebar with Escape key", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Mobile Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    // Open sidebar
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));

    await waitFor(() => {
      expect(screen.getByText("Mobile Content")).toBeInTheDocument();
    });

    // Close with Escape
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByText("Mobile Content")).not.toBeInTheDocument();
    });
  });

  it("closes mobile sidebar by clicking overlay", async () => {
    const user = userEvent.setup();
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Mobile Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    // Open sidebar
    await user.click(screen.getByRole("button", {name: "Toggle Sidebar"}));

    await waitFor(() => {
      expect(screen.getByText("Mobile Content")).toBeInTheDocument();
    });

    // Click overlay (the button with aria-label "Close sidebar")
    const overlay = screen.getByLabelText("Close sidebar");
    await user.click(overlay);

    await waitFor(() => {
      expect(screen.queryByText("Mobile Content")).not.toBeInTheDocument();
    });
  });
});
