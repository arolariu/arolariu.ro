import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

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
});
