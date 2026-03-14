import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

import {useIsMobile} from "@/hooks/useIsMobile";

import {Sidebar, SidebarContent, SidebarProvider, SidebarTrigger} from "./sidebar";

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
});
