/**
 * @fileoverview Unit tests for the generative-view chat message list.
 * @module app/domains/invoices/view-invoices/_components/MessageList.test
 *
 * @remarks
 * Renders the real {@link MessageList} with deterministic messages and asserts the sender labels, avatar
 * variants, per-line content splitting, and locale-formatted timestamps a reader actually sees.
 */

import {render, screen} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {MessageList} from "./MessageList";

type Message = Parameters<typeof MessageList>[0]["messages"][number];

const AI_ASSISTANT_LABEL = "pages.invoices.viewInvoices.messageList.aiAssistant";
const USER_LABEL = "pages.invoices.viewInvoices.messageList.you";

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "message-1",
    content: "Hello there",
    role: "assistant",
    timestamp: "2026-03-15T14:30:00.000Z",
    ...overrides,
  };
}

function getMessageItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[class*='messageItem']"));
}

describe("MessageList", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when motion elements unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("labels assistant messages as the AI assistant and user messages as the current user", () => {
    // Arrange
    const messages = [
      buildMessage({id: "assistant-1", role: "assistant", content: "How can I help?"}),
      buildMessage({id: "user-1", role: "user", content: "Summarize my invoices"}),
    ];

    // Act
    const {container} = render(<MessageList messages={messages} />);

    // Assert
    const [assistantItem, userItem] = getMessageItems(container);
    expect(assistantItem).toHaveTextContent(AI_ASSISTANT_LABEL);
    expect(assistantItem).not.toHaveTextContent(USER_LABEL);
    expect(assistantItem?.className).toContain("messageAssistant");
    expect(assistantItem?.querySelector("[class*='avatarFallbackAssistant']")).not.toBeNull();
    expect(assistantItem?.querySelector("[class*='avatarFallbackUser']")).toBeNull();

    expect(userItem).toHaveTextContent(USER_LABEL);
    expect(userItem).not.toHaveTextContent(AI_ASSISTANT_LABEL);
    expect(userItem?.className).toContain("messageUser");
    expect(userItem?.querySelector("[class*='avatarFallbackUser']")).not.toBeNull();
    expect(userItem?.querySelector("[class*='avatarFallbackAssistant']")).toBeNull();
  });

  it("renders each line of a multi-line message as its own paragraph, keeping duplicate lines", () => {
    // Arrange
    const messages = [buildMessage({content: "Total: 10 RON\nTotal: 10 RON\nDone"})];

    // Act
    const {container} = render(<MessageList messages={messages} />);

    // Assert
    const lines = Array.from(container.querySelectorAll("[class*='messageLine']"), (line) => line.textContent);
    expect(lines).toEqual(["Total: 10 RON", "Total: 10 RON", "Done"]);
    const consoleErrors = vi.mocked(console.error).mock.calls.flat().map(String).join("\n");
    expect(consoleErrors).not.toContain("same key");
  });

  it("keeps a single-line message in one paragraph", () => {
    // Arrange
    const messages = [buildMessage({content: "Just one line"})];

    // Act
    const {container} = render(<MessageList messages={messages} />);

    // Assert
    expect(container.querySelectorAll("[class*='messageLine']")).toHaveLength(1);
    expect(screen.getByText("Just one line")).toBeInTheDocument();
  });

  it("shows each message timestamp formatted for the active locale", () => {
    // Arrange
    const timestamp = "2026-03-15T14:30:00.000Z";
    const expected = new Intl.DateTimeFormat("en", {dateStyle: "short", timeStyle: "short"}).format(new Date(timestamp));

    // Act
    const {container} = render(<MessageList messages={[buildMessage({timestamp})]} />);

    // Assert
    expect(container.querySelector("[class*='messageTimestamp']")).toHaveTextContent(expected);
  });

  it("renders no messages when the conversation is empty", () => {
    // Arrange & Act
    const {container} = render(<MessageList messages={[]} />);

    // Assert
    expect(getMessageItems(container)).toHaveLength(0);
    expect(screen.queryByText(AI_ASSISTANT_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(USER_LABEL)).not.toBeInTheDocument();
  });
});
