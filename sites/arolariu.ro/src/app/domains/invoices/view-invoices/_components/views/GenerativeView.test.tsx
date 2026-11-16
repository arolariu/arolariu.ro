/**
 * @fileoverview Unit tests for the generative (AI assistant) invoices view.
 * @module app/domains/invoices/view-invoices/_components/views/GenerativeView.test
 *
 * @remarks
 * Renders the real view, tabs, select, and {@link MessageList}. Only the `Date` clock is faked so the welcome
 * message timestamp is deterministic; `console.log` is silenced because the view still logs its unfinished wiring.
 */

import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {buildInvoice} from "../../../../../../../tests/helpers/invoiceDomain";
import RenderGenerativeView from "./GenerativeView";

const VIEW_KEY = "pages.invoices.viewInvoices.generativeView";
const SETTINGS_KEY = `${VIEW_KEY}.settings`;
const NOW = new Date("2026-03-15T09:45:00.000Z");

const invoices = [buildInvoice({id: "11111111-1111-4111-8111-111111111111", name: "Groceries"})];

describe("RenderGenerativeView", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when motion elements unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(NOW);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the header, help action, and the chat tab with the assistant welcome message", () => {
    // Arrange
    const expectedTimestamp = new Intl.DateTimeFormat("en", {dateStyle: "short", timeStyle: "short"}).format(NOW);

    // Act
    render(<RenderGenerativeView invoices={invoices} />);

    // Assert
    expect(screen.getByRole("heading", {level: 2, name: `${VIEW_KEY}.title`})).toBeInTheDocument();
    expect(screen.getByText(`${VIEW_KEY}.subtitle`)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: `${VIEW_KEY}.help`})).toBeInTheDocument();
    expect(screen.getByRole("tab", {name: `${VIEW_KEY}.tabs.chat`})).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", {name: `${VIEW_KEY}.tabs.settings`})).toHaveAttribute("aria-selected", "false");

    const chatPanel = screen.getByRole("tabpanel");
    expect(within(chatPanel).getByText(`${VIEW_KEY}.chatDescription`)).toBeInTheDocument();
    expect(within(chatPanel).getByText(`${VIEW_KEY}.welcomeMessage`)).toBeInTheDocument();
    expect(within(chatPanel).getByText("pages.invoices.viewInvoices.messageList.aiAssistant")).toBeInTheDocument();
    expect(within(chatPanel).getByText(expectedTimestamp)).toBeInTheDocument();
    expect(screen.queryByText(`${SETTINGS_KEY}.title`)).not.toBeInTheDocument();
  });

  it("shows the assistant settings with every data-access and notification option enabled by default", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RenderGenerativeView invoices={invoices} />);

    // Act
    await user.click(screen.getByRole("tab", {name: `${VIEW_KEY}.tabs.settings`}));

    // Assert
    const settingsPanel = screen.getByRole("tabpanel");
    expect(within(settingsPanel).getByText(`${SETTINGS_KEY}.title`)).toBeInTheDocument();
    expect(within(settingsPanel).getByText(`${SETTINGS_KEY}.description`)).toBeInTheDocument();
    expect(within(settingsPanel).getByText(`${SETTINGS_KEY}.historyLabel`)).toBeInTheDocument();
    expect(within(settingsPanel).getByText(`${SETTINGS_KEY}.dataAccessTitle`)).toBeInTheDocument();
    expect(within(settingsPanel).getByText(`${SETTINGS_KEY}.notificationPreferences`)).toBeInTheDocument();
    expect(within(settingsPanel).getByRole("button", {name: `${SETTINGS_KEY}.save`})).toBeInTheDocument();

    for (const option of ["allowInvoiceData", "allowMerchantData", "notifyInsights"]) {
      expect(within(settingsPanel).getByRole("checkbox", {name: `${SETTINGS_KEY}.${option}`})).toBeChecked();
    }

    expect(within(settingsPanel).getByRole("combobox")).toHaveTextContent(`${SETTINGS_KEY}.retention.item30`);
    expect(screen.queryByText(`${VIEW_KEY}.welcomeMessage`)).not.toBeInTheDocument();
  });

  it("lists every retention period and shows the chosen period in the trigger", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RenderGenerativeView invoices={invoices} />);
    await user.click(screen.getByRole("tab", {name: `${VIEW_KEY}.tabs.settings`}));

    // Act
    await user.click(screen.getByRole("combobox"));
    const options = await screen.findAllByRole("option");
    await user.click(screen.getByRole("option", {name: `${SETTINGS_KEY}.retention.item90`}));

    // Assert
    expect(options.map((option) => option.textContent)).toEqual([
      `${SETTINGS_KEY}.retention.item30`,
      `${SETTINGS_KEY}.retention.item60`,
      `${SETTINGS_KEY}.retention.item90`,
      `${SETTINGS_KEY}.retention.none`,
    ]);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent(`${SETTINGS_KEY}.retention.item90`);
    expect(trigger).not.toHaveTextContent(`${SETTINGS_KEY}.retention.item30`);
  });

  it("lets the user turn off a default-enabled data-access option", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RenderGenerativeView invoices={invoices} />);
    await user.click(screen.getByRole("tab", {name: `${VIEW_KEY}.tabs.settings`}));
    const invoiceAccess = screen.getByRole("checkbox", {name: `${SETTINGS_KEY}.allowInvoiceData`});

    // Act
    await user.click(invoiceAccess);

    // Assert
    expect(invoiceAccess).not.toBeChecked();
    expect(screen.getByRole("checkbox", {name: `${SETTINGS_KEY}.allowMerchantData`})).toBeChecked();
  });

  it("returns to the chat conversation after visiting the settings tab", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RenderGenerativeView invoices={invoices} />);
    await user.click(screen.getByRole("tab", {name: `${VIEW_KEY}.tabs.settings`}));

    // Act
    await user.click(screen.getByRole("tab", {name: `${VIEW_KEY}.tabs.chat`}));

    // Assert
    expect(screen.getByText(`${VIEW_KEY}.welcomeMessage`)).toBeInTheDocument();
    expect(screen.queryByText(`${SETTINGS_KEY}.title`)).not.toBeInTheDocument();
  });
});
