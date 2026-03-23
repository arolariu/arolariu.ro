import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Tabs, TabsContent, TabsList, TabsTrigger} from "./tabs";

function renderTabs(): {
  accountTab: HTMLElement;
  passwordTab: HTMLElement;
} {
  render(
    <Tabs
      defaultValue='account'
      className='custom-root'
      data-testid='tabs-root'>
      <TabsList
        className='custom-list'
        data-testid='tabs-list'>
        <TabsTrigger
          value='account'
          className='custom-trigger'>
          Account
        </TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
      </TabsList>
      <TabsContent
        value='account'
        className='custom-panel'
        data-testid='account-panel'>
        Account panel content
      </TabsContent>
      <TabsContent value='password'>Password panel content</TabsContent>
    </Tabs>,
  );

  return {
    accountTab: screen.getByRole("tab", {name: "Account"}),
    passwordTab: screen.getByRole("tab", {name: "Password"}),
  };
}

function renderThreeTabs(): {
  accountTab: HTMLElement;
  passwordTab: HTMLElement;
  settingsTab: HTMLElement;
} {
  render(
    <Tabs defaultValue='account'>
      <TabsList>
        <TabsTrigger value='account'>Account</TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
        <TabsTrigger value='settings'>Settings</TabsTrigger>
      </TabsList>
      <TabsContent value='account'>Account panel</TabsContent>
      <TabsContent value='password'>Password panel</TabsContent>
      <TabsContent value='settings'>Settings panel</TabsContent>
    </Tabs>,
  );

  return {
    accountTab: screen.getByRole("tab", {name: "Account"}),
    passwordTab: screen.getByRole("tab", {name: "Password"}),
    settingsTab: screen.getByRole("tab", {name: "Settings"}),
  };
}

describe("Tabs", () => {
  it("renders the tab structure, merges class names, and exposes accessible tab semantics", () => {
    // Arrange
    const {accountTab, passwordTab} = renderTabs();

    // Assert
    expect(screen.getByTestId("tabs-root")).toHaveClass("custom-root");
    expect(screen.getByTestId("tabs-list")).toHaveClass("custom-list");
    expect(accountTab).toHaveClass("custom-trigger");
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(accountTab).toHaveAttribute("aria-selected", "true");
    expect(passwordTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("account-panel")).toHaveClass("custom-panel");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Account panel content");
  });

  it("switches tabs when a trigger is clicked and renders the selected panel content", async () => {
    // Arrange
    const user = userEvent.setup();
    const {accountTab, passwordTab} = renderTabs();

    // Act
    await user.click(passwordTab);

    // Assert
    expect(accountTab).toHaveAttribute("aria-selected", "false");
    expect(passwordTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Password panel content");
  });

  it("calls onValueChange with the clicked tab value", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string) => void>();

    render(
      <Tabs
        defaultValue='account'
        onValueChange={handleValueChange}>
        <TabsList>
          <TabsTrigger value='account'>Account</TabsTrigger>
          <TabsTrigger value='password'>Password</TabsTrigger>
        </TabsList>
        <TabsContent value='account'>Account panel content</TabsContent>
        <TabsContent value='password'>Password panel content</TabsContent>
      </Tabs>,
    );

    // Act
    await user.click(screen.getByRole("tab", {name: "Password"}));

    // Assert
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toBe("password");
  });

  it("supports arrow-key navigation and activation from the keyboard", async () => {
    // Arrange
    const user = userEvent.setup();
    const {accountTab, passwordTab} = renderTabs();

    accountTab.focus();

    // Act
    await act(async () => {
      await user.keyboard("{ArrowRight}{Enter}");
    });

    // Assert
    expect(passwordTab).toHaveFocus();
    expect(passwordTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Password panel content");
  });

  it("works in controlled mode", async () => {
    // ... (existing test unchanged)
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string) => void>();

    function ControlledTabs(): React.JSX.Element {
      const [value, setValue] = React.useState("account");

      return (
        <Tabs
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            handleValueChange(nextValue);
          }}>
          <TabsList>
            <TabsTrigger value='account'>Account</TabsTrigger>
            <TabsTrigger value='password'>Password</TabsTrigger>
          </TabsList>
          <TabsContent value='account'>Account content</TabsContent>
          <TabsContent value='password'>Password content</TabsContent>
        </Tabs>
      );
    }

    render(<ControlledTabs />);

    const accountTab = screen.getByRole("tab", {name: "Account"});
    const passwordTab = screen.getByRole("tab", {name: "Password"});

    expect(accountTab).toHaveAttribute("aria-selected", "true");
    expect(passwordTab).toHaveAttribute("aria-selected", "false");

    // Act
    await user.click(passwordTab);

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith("password");
    expect(accountTab).toHaveAttribute("aria-selected", "false");
    expect(passwordTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Password content");
  });

  it("moves focus to the first tab when Home is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    const {settingsTab} = renderThreeTabs();

    // Start focus on the last tab
    settingsTab.focus();

    // Act — Home should jump directly to the first tab in the list
    await act(async () => {
      await user.keyboard("{Home}");
    });

    // Assert
    expect(screen.getByRole("tab", {name: "Account"})).toHaveFocus();
  });

  it("moves focus to the last tab when End is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    const {accountTab, settingsTab} = renderThreeTabs();

    // Start focus on the first tab
    accountTab.focus();

    // Act — End should jump directly to the last tab in the list
    await act(async () => {
      await user.keyboard("{End}");
    });

    // Assert
    expect(settingsTab).toHaveFocus();
  });

  // Base UI Tabs follows ARIA's optional wrap-around recommendation and does implement
  // it, but the behaviour requires the roving-tabindex composite to emit ArrowRight
  // past the last item — which is not guaranteed in happy-dom's synthetic event model.
  it.todo("wraps around from the last tab to the first tab with ArrowRight");
});
