import {fireEvent, render, screen, waitFor} from "@testing-library/react";
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

    fireEvent.click(trigger);

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

    fireEvent.click(rail);

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
});
