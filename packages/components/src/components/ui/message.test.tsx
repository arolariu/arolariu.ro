import {fireEvent, render, screen} from "@testing-library/react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import * as React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, expectTypeOf, it} from "vitest";

import {Avatar, AvatarBadge, AvatarFallback} from "./avatar";
import avatarStyles from "./avatar.module.css";
import {Bubble, BubbleContent} from "./bubble";
import {Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader} from "./message";
import styles from "./message.module.css";

const css = parse(readFileSync(join(import.meta.dirname, "message.module.css"), "utf8"));
function cssClass(name: string): string {
  const value = styles[name];
  if (!value) throw new Error(`Missing message class: ${name}`);
  return value;
}

function declarations(selector: string): Record<string, string> {
  const result: Record<string, string> = {};
  css.walkRules(selector, (rule) => rule.walkDecls((declaration) => void (result[declaration.prop] = declaration.value)));
  return result;
}

function mountedModule(file: string, classes: Record<string, string>): string {
  return readFileSync(join(import.meta.dirname, file), "utf8")
    .replace(/:global\(([^)]+)\)/g, "$1")
    .replace(/\.([a-zA-Z][\w-]*)/g, (selector: string, name: string): string => (classes[name] ? `.${classes[name]}` : selector));
}

describe("Message", () => {
  it("leaves the composed Avatar focus outline and corner badge outside an unclipped layout wrapper", () => {
    const wrapper = React.createRef<HTMLDivElement>();
    const avatar = React.createRef<HTMLButtonElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <>
        <style>{mountedModule("message.module.css", styles)}</style>
        <style>{mountedModule("avatar.module.css", avatarStyles)}</style>
        <Message>
          <MessageAvatar
            ref={wrapper}
            title='Caller avatar wrapper'
            onClick={() => calls.push("wrapper")}>
            <Avatar
              ref={avatar}
              render={
                <button
                  type='button'
                  aria-label='Open Alex profile, online'
                />
              }>
              <AvatarFallback>AL</AvatarFallback>
              <AvatarBadge aria-hidden='true' />
            </Avatar>
          </MessageAvatar>
        </Message>
      </>,
    );
    // A button's content is presentational, so the presence status belongs in its computed name; the badge is decorative.
    const profile = screen.getByRole("button", {name: "Open Alex profile, online"});
    const badge = profile.querySelector('[data-slot="avatar-badge"]');
    if (!(badge instanceof HTMLElement)) throw new Error("Missing composed AvatarBadge");
    expect(badge).toHaveAttribute("aria-hidden", "true");
    expect(badge).not.toHaveAttribute("aria-label");
    expect(avatar.current).toBe(profile);
    expect(profile.parentElement).toBe(wrapper.current);
    expect(wrapper.current).toHaveAttribute("data-slot", "message-avatar");
    expect(wrapper.current).toHaveAttribute("title", "Caller avatar wrapper");
    expect(badge.parentElement).toBe(profile);
    profile.focus();
    expect(profile).toHaveFocus();
    expect(getComputedStyle(profile).borderRadius).toBe("9999px");
    expect(getComputedStyle(badge).position).toBe("absolute");
    expect(getComputedStyle(profile).overflow).toBe("visible");
    const wrapperElement = profile.parentElement;
    if (!wrapperElement) throw new Error("Missing composed MessageAvatar");
    expect(getComputedStyle(wrapperElement).overflow).toBe("visible");
    expect(getComputedStyle(wrapperElement).borderRadius).not.toBe("9999px");
    fireEvent.click(profile);
    expect(calls).toEqual(["wrapper"]);
    unmount();
    expect(wrapper.current).toBeNull();
    expect(avatar.current).toBeNull();
  });

  it("lets native rest props override preset slot attributes", () => {
    render(<MessageAvatar {...{"data-slot": "caller-avatar"}} />);
    expect(document.querySelector('[data-slot="caller-avatar"]')).toHaveClass(cssClass("avatar"));
  });

  it("publishes native div refs for all server-compatible presentation slots", () => {
    expectTypeOf<React.ComponentRef<typeof Message>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof MessageGroup>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof MessageAvatar>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof MessageContent>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof MessageHeader>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof MessageFooter>>().toEqualTypeOf<HTMLDivElement>();
  });

  it("forwards every native ref in a complete real Avatar/Bubble composition", () => {
    const group = React.createRef<HTMLDivElement>();
    const root = React.createRef<HTMLDivElement>();
    const avatar = React.createRef<HTMLDivElement>();
    const content = React.createRef<HTMLDivElement>();
    const header = React.createRef<HTMLDivElement>();
    const footer = React.createRef<HTMLDivElement>();
    const fixture: Message.Props = {ref: root, align: "start"};
    expectTypeOf(fixture).toMatchTypeOf<Message.Props>();
    const {unmount} = render(
      <MessageGroup
        ref={group}
        className='caller-group'>
        <Message {...fixture}>
          <MessageAvatar ref={avatar}>
            <Avatar>
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent ref={content}>
            <MessageHeader ref={header}>Alex</MessageHeader>
            <Bubble>
              <BubbleContent>Hello from the caller</BubbleContent>
            </Bubble>
            <MessageFooter ref={footer}>Delivered</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>,
    );
    for (const [ref, slot] of [
      [group, "message-group"],
      [root, "message"],
      [avatar, "message-avatar"],
      [content, "message-content"],
      [header, "message-header"],
      [footer, "message-footer"],
    ] as const) {
      expect(ref.current).toHaveAttribute("data-slot", slot);
      expect(ref.current?.tagName).toBe("DIV");
      expect(ref.current).not.toHaveAttribute("role");
    }
    expect(group.current).toHaveClass("caller-group");
    expect(root.current).toHaveAttribute("data-align", "start");
    expect(screen.getByText("AL")).toHaveAttribute("data-slot", "avatar-fallback");
    expect(screen.getByText("Hello from the caller")).toHaveAttribute("data-slot", "bubble-content");
    unmount();
    for (const ref of [group, root, avatar, content, header, footer]) expect(ref.current).toBeNull();
  });

  it("preserves end alignment, RTL, caller metadata and bubbling native events", () => {
    const calls: string[] = [];
    const {container} = render(
      <Message
        dir='rtl'
        align='end'
        onClick={() => calls.push("message")}
        className='caller'>
        <MessageContent>
          <MessageHeader>الاسم</MessageHeader>
          <Bubble>
            <BubbleContent>رسالة</BubbleContent>
          </Bubble>
          <MessageFooter>
            <button
              type='button'
              onClick={() => calls.push("caller")}>
              Retry
            </button>
          </MessageFooter>
        </MessageContent>
      </Message>,
    );
    expect(container.firstElementChild).toHaveAttribute("dir", "rtl");
    expect(container.firstElementChild).toHaveAttribute("data-align", "end");
    expect(container.firstElementChild).toHaveClass(cssClass("message"), "caller");
    fireEvent.click(screen.getByRole("button", {name: "Retry"}));
    expect(calls).toEqual(["caller", "message"]);
  });

  it("keeps empty and long caller content intact", () => {
    const {rerender} = render(<MessageContent data-testid='content' />);
    expect(screen.getByTestId("content")).toBeEmptyDOMElement();
    const text = "CallerUnbrokenMessage".repeat(60);
    rerender(<MessageContent data-testid='content'>{text}</MessageContent>);
    expect(screen.getByTestId("content").textContent).toBe(text);
  });

  it("renders the pure native family on the server without inventing live log semantics", () => {
    const html = renderToStaticMarkup(
      <MessageGroup>
        <Message>
          <MessageAvatar>A</MessageAvatar>
          <MessageContent>
            <MessageHeader>Name</MessageHeader>Content<MessageFooter>Time</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>,
    );
    expect(html).toContain('data-align="start"');
    expect(html).toContain('data-slot="message-footer"');
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain('role="log"');
  });

  it("binds shrinking rows, logical alignments and wrapped content CSS contracts", () => {
    render(
      <Message align='end'>
        <MessageContent>Long content</MessageContent>
        <MessageFooter>Footer</MessageFooter>
      </Message>,
    );
    expect(screen.getByText("Long content")).toHaveClass(cssClass("content"));
    expect(declarations(".message")).toMatchObject({display: "flex", "inline-size": "100%", "min-inline-size": "0"});
    expect(declarations('.message[data-align="end"]')).toHaveProperty("flex-direction", "row-reverse");
    expect(declarations(".content")).toMatchObject({"min-inline-size": "0", "overflow-wrap": "anywhere", "flex-direction": "column"});
    expect(declarations('.message[data-align="end"] .footer')).toHaveProperty("justify-content", "flex-end");
    expect(declarations('.message[data-align="end"] .content > [data-slot]')).toHaveProperty("align-self", "flex-end");
    expect(declarations(".avatar")).toMatchObject({"flex-shrink": "0", overflow: "visible", "align-self": "flex-end"});
  });
});
