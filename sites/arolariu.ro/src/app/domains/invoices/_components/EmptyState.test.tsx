/**
 * @fileoverview Unit tests for the shared invoice EmptyState component.
 * @module sites/arolariu.ro/src/app/domains/invoices/_components/EmptyState.test
 *
 * @remarks
 * Pins the rendering contract for EmptyState:
 * 1. Icon, title and description always render.
 * 2. The action row only renders when at least one action is configured.
 * 3. Primary and secondary actions render independently as navigable links.
 */

import {render, screen, within} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import EmptyState from "./EmptyState";

const primaryAction = {label: "Upload a scan", href: "/domains/invoices/upload-scans"} as const;
const secondaryAction = {label: "Browse invoices", href: "/domains/invoices/view-invoices"} as const;

function renderEmptyState(actions: Partial<Readonly<{primaryAction: typeof primaryAction; secondaryAction: typeof secondaryAction}>> = {}) {
  return render(
    <EmptyState
      icon={<svg data-testid='empty-state-icon' />}
      title='No invoices yet'
      description='Upload your first receipt to get started.'
      {...actions}
    />,
  );
}

describe("EmptyState", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  it("renders the icon, title and description without an action row when no actions are configured", () => {
    // Arrange & Act
    renderEmptyState();

    // Assert
    expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
    expect(screen.getByRole("heading", {level: 3, name: "No invoices yet"})).toBeInTheDocument();
    expect(screen.getByText("Upload your first receipt to get started.")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders both actions as links in primary-then-secondary order", () => {
    // Arrange & Act
    renderEmptyState({primaryAction, secondaryAction});

    // Assert
    const links = screen.getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      [primaryAction.label, primaryAction.href],
      [secondaryAction.label, secondaryAction.href],
    ]);
    expect(links[0]?.className).not.toBe(links[1]?.className);
  });

  it("renders only the primary action when no secondary action is configured", () => {
    // Arrange & Act
    renderEmptyState({primaryAction});

    // Assert
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", primaryAction.href);
    expect(screen.queryByRole("link", {name: secondaryAction.label})).not.toBeInTheDocument();
  });

  it("renders only the secondary action when no primary action is configured", () => {
    // Arrange & Act
    const {container} = renderEmptyState({secondaryAction});

    // Assert
    const link = within(container).getByRole("link");
    expect(link).toHaveTextContent(secondaryAction.label);
    expect(link).toHaveAttribute("href", secondaryAction.href);
    expect(screen.queryByRole("link", {name: primaryAction.label})).not.toBeInTheDocument();
  });
});
