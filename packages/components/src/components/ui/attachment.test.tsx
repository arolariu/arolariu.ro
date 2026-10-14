import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import * as React from "react";
import {describe, expect, expectTypeOf, it} from "vitest";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "./attachment";
import styles from "./attachment.module.css";
import type {Button} from "./button";

const css = parse(readFileSync(join(import.meta.dirname, "attachment.module.css"), "utf8"));

function cssClass(name: string): string {
  const value = styles[name];
  if (!value) throw new Error(`Missing attachment class: ${name}`);
  return value;
}

function declarations(selector: string): Record<string, string> {
  const result: Record<string, string> = {};
  css.walkRules(selector, (rule) => rule.walkDecls((declaration) => void (result[declaration.prop] = declaration.value)));
  return result;
}

describe("Attachment", () => {
  it("publishes fixed native refs and polymorphic refs only for composed controls", () => {
    expectTypeOf<React.ComponentRef<typeof Attachment>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<React.ComponentRef<typeof AttachmentTitle>>().toEqualTypeOf<HTMLSpanElement>();
    expectTypeOf<React.ComponentRef<typeof AttachmentDescription>>().toEqualTypeOf<HTMLSpanElement>();
    expectTypeOf<React.ComponentRef<typeof AttachmentAction>>().toEqualTypeOf<HTMLElement>();
    expectTypeOf<React.ComponentRef<typeof AttachmentTrigger>>().toEqualTypeOf<HTMLElement>();
  });

  it.each(["done", "idle", "uploading", "processing", "error"] as const)("leaves %s state and its text owned by the caller", (state) => {
    const ref = React.createRef<HTMLDivElement>();
    const {rerender} = render(
      <Attachment
        ref={ref}
        state={state}
        data-testid='attachment'>
        <AttachmentContent>
          <AttachmentTitle>Caller document</AttachmentTitle>
          <AttachmentDescription>Caller status</AttachmentDescription>
        </AttachmentContent>
      </Attachment>,
    );
    expect(ref.current).toHaveAttribute("data-slot", "attachment");
    expect(ref.current).toHaveAttribute("data-state", state);
    expect(ref.current).toHaveTextContent("Caller documentCaller status");
    expect(ref.current).not.toHaveAttribute("role");
    expect(ref.current).not.toHaveAttribute("aria-live");
    rerender(
      <Attachment
        state='done'
        data-testid='attachment'>
        New caller content
      </Attachment>,
    );
    expect(screen.getByTestId("attachment")).toHaveAttribute("data-state", "done");
    expect(screen.getByTestId("attachment")).toHaveTextContent("New caller content");
  });

  it.each(["default", "sm", "xs"] as const)("exposes %s size with both orientations", (size) => {
    const {rerender} = render(
      <Attachment
        size={size}
        data-testid='attachment'
      />,
    );
    expect(screen.getByTestId("attachment")).toHaveAttribute("data-size", size);
    expect(screen.getByTestId("attachment")).toHaveAttribute("data-orientation", "horizontal");
    rerender(
      <Attachment
        size={size}
        orientation='vertical'
        data-testid='attachment'
      />,
    );
    expect(screen.getByTestId("attachment")).toHaveAttribute("data-size", size);
    expect(screen.getByTestId("attachment")).toHaveAttribute("data-orientation", "vertical");
  });

  it("defaults to a completed horizontal attachment with no invented content", () => {
    render(<Attachment data-testid='attachment' />);
    expect(screen.getByTestId("attachment")).toHaveAttribute("data-state", "done");
    expect(screen.getByTestId("attachment")).toHaveAttribute("data-size", "default");
    expect(screen.getByTestId("attachment")).toBeEmptyDOMElement();
  });

  it("forwards every native slot ref and preserves native events and attributes", () => {
    const group = React.createRef<HTMLDivElement>();
    const root = React.createRef<HTMLDivElement>();
    const media = React.createRef<HTMLDivElement>();
    const content = React.createRef<HTMLDivElement>();
    const title = React.createRef<HTMLSpanElement>();
    const description = React.createRef<HTMLSpanElement>();
    const actions = React.createRef<HTMLDivElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <AttachmentGroup
        ref={group}
        dir='rtl'
        className='caller-group'>
        <Attachment
          ref={root}
          onClick={() => calls.push("root")}>
          <AttachmentMedia
            ref={media}
            className='caller-media'>
            <svg
              aria-hidden='true'
              data-testid='file-icon'
            />
          </AttachmentMedia>
          <AttachmentContent ref={content}>
            <AttachmentTitle
              ref={title}
              title='Unabridged document title'>
              Document
            </AttachmentTitle>
            <AttachmentDescription ref={description}>Description</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions ref={actions}>Actions</AttachmentActions>
        </Attachment>
      </AttachmentGroup>,
    );
    const slots = [
      [group, "attachment-group", "DIV"],
      [root, "attachment", "DIV"],
      [media, "attachment-media", "DIV"],
      [content, "attachment-content", "DIV"],
      [title, "attachment-title", "SPAN"],
      [description, "attachment-description", "SPAN"],
      [actions, "attachment-actions", "DIV"],
    ] as const;
    for (const [ref, slot, tag] of slots) {
      expect(ref.current).toHaveAttribute("data-slot", slot);
      expect(ref.current?.tagName).toBe(tag);
    }
    expect(group.current).toHaveAttribute("dir", "rtl");
    expect(group.current).toHaveClass("caller-group");
    expect(media.current).toHaveAttribute("data-variant", "icon");
    expect(media.current).toHaveClass("caller-media");
    expect(title.current).toHaveAttribute("title", "Unabridged document title");
    fireEvent.click(screen.getByText("Document"));
    expect(calls).toEqual(["root"]);
    expect(screen.getByTestId("file-icon")).toHaveAttribute("aria-hidden", "true");
    unmount();
    for (const [ref] of slots) expect(ref.current).toBeNull();
  });

  it("accepts caller image content without owning its lifecycle or URL", () => {
    render(
      <AttachmentMedia variant='image'>
        <img
          src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
          alt='Caller preview'
        />
      </AttachmentMedia>,
    );
    const image = screen.getByRole("img", {name: "Caller preview"});
    expect(image.parentElement).toHaveAttribute("data-variant", "image");
    expect(image.parentElement).toHaveClass(cssClass("mediaImage"));
  });

  it("uses a non-submitting native trigger with real disabled and keyboard behavior", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    const calls: string[] = [];
    const {rerender, unmount} = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          calls.push("submit");
        }}>
        <AttachmentTrigger
          ref={ref}
          onClick={() => calls.push("trigger")}>
          Open attachment
        </AttachmentTrigger>
      </form>,
    );
    const button = screen.getByRole("button", {name: "Open attachment"});
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-slot", "attachment-trigger");
    expect(ref.current).toBe(button);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(calls).toEqual(["trigger"]);
    rerender(
      <AttachmentTrigger
        disabled
        onClick={() => calls.push("disabled")}>
        Open attachment
      </AttachmentTrigger>,
    );
    await user.click(screen.getByRole("button", {name: "Open attachment"}));
    expect(calls).toEqual(["trigger"]);
    unmount();
    expect(ref.current).toBeNull();
  });

  it("preserves an explicitly submitting trigger", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          calls.push("submit");
        }}>
        <AttachmentTrigger type='submit'>Submit choice</AttachmentTrigger>
      </form>,
    );
    await user.click(screen.getByRole("button", {name: "Submit choice"}));
    expect(calls).toEqual(["submit"]);
  });

  it("preserves a composed native button's disabled semantics and safe default type", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const {rerender} = render(
      <AttachmentTrigger
        onClick={() => calls.push("wrapper")}
        render={
          <button
            disabled
            onClick={() => calls.push("child")}>
            Native target
          </button>
        }
      />,
    );
    expect(screen.getByRole("button", {name: "Native target"})).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", {name: "Native target"})).toBeDisabled();
    await user.click(screen.getByRole("button", {name: "Native target"}));
    expect(calls).toEqual([]);
    rerender(<AttachmentTrigger render={<button type='submit'>Native target</button>} />);
    expect(screen.getByRole("button", {name: "Native target"})).toHaveAttribute("type", "submit");
  });

  it("composes child-first navigation, content, ARIA and both refs without adding button attributes", () => {
    const parentRef = React.createRef<HTMLAnchorElement>();
    const childRef = React.createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <AttachmentTrigger
        ref={parentRef}
        className='parent'
        onClick={(event) => calls.push(`parent:${event.defaultPrevented}`)}
        render={
          <a
            ref={childRef}
            href='#file'
            className='child'
            aria-label='Read document'
            onClick={(event) => {
              calls.push("child");
              event.preventDefault();
            }}>
            Child document
          </a>
        }>
        Ignored fallback
      </AttachmentTrigger>,
    );
    const link = screen.getByRole("link", {name: "Read document"});
    expect(fireEvent.click(link)).toBe(false);
    expect(calls).toEqual(["child", "parent:true"]);
    expect(link).toHaveTextContent("Child document");
    expect(link).toHaveClass("parent", "child");
    expect(link).not.toHaveAttribute("type");
    expect(link.querySelector("button")).toBeNull();
    expect(parentRef.current).toBe(link);
    expect(childRef.current).toBe(link);
    unmount();
    expect(parentRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("allows a child to cancel the composed wrapper handler", () => {
    const calls: string[] = [];
    render(
      <AttachmentTrigger
        onClick={() => calls.push("wrapper")}
        render={
          <button
            type='button'
            onClick={(event) => {
              event.preventDefault();
              if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") event.preventBaseUIHandler();
              calls.push("child");
            }}>
            Cancel
          </button>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "Cancel"}));
    expect(calls).toEqual(["child"]);
    expect(screen.getByRole("button", {name: "Cancel"})).toHaveAttribute("type", "button");
  });

  it("supplies trigger-owned state and a polymorphic merged callback ref to callback renders", () => {
    const ref = React.createRef<HTMLLabelElement>();
    const fixture: AttachmentTrigger.Props = {
      ref,
      children: "Choose attachment",
      render: (props, state) => {
        expectTypeOf(state).toEqualTypeOf<AttachmentTrigger.State>();
        expectTypeOf(props.ref).toEqualTypeOf<React.RefCallback<HTMLElement> | null | undefined>();
        return (
          <label
            {...props}
            htmlFor='file-choice'
            data-render-slot={state.slot}
          />
        );
      },
    };
    render(
      <>
        <AttachmentTrigger {...fixture} />
        <input
          id='file-choice'
          type='checkbox'
        />
      </>,
    );
    fireEvent.click(screen.getByText("Choose attachment"));
    expect(screen.getByRole("checkbox", {name: "Choose attachment"})).toBeChecked();
    expect(ref.current).toHaveAttribute("data-render-slot", "attachment-trigger");
    expect(ref.current).not.toHaveAttribute("type");
  });

  it("delegates action state, render, disabled behavior and refs to the reviewed Button", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    const states: Button.State[] = [];
    const calls: string[] = [];
    const {rerender} = render(
      <AttachmentAction
        ref={ref}
        aria-label='Remove file'
        disabled
        render={(props, state) => {
          expectTypeOf(state).toEqualTypeOf<AttachmentAction.State>();
          states.push(state);
          return <button {...props} />;
        }}
        onClick={() => calls.push("remove")}>
        <svg aria-hidden='true' />
      </AttachmentAction>,
    );
    const button = screen.getByRole("button", {name: "Remove file"});
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("data-slot", "attachment-action");
    expect(button).toHaveAttribute("data-size", "icon-xs");
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(states.at(-1)).toMatchObject({disabled: true, variant: "ghost", size: "icon-xs"});
    await user.click(button);
    expect(calls).toEqual([]);
    rerender(
      <AttachmentAction
        variant='destructive'
        size='icon-sm'
        onClick={() => calls.push("remove")}>
        Remove
      </AttachmentAction>,
    );
    await user.click(screen.getByRole("button", {name: "Remove"}));
    expect(calls).toEqual(["remove"]);
    expect(screen.getByRole("button", {name: "Remove"})).toHaveAttribute("data-size", "icon-sm");
    expect(screen.getByRole("button", {name: "Remove"})).toHaveAttribute("data-variant", "destructive");
  });

  it("retains navigation and cancellation through the action's real Button render path", () => {
    const calls: string[] = [];
    const childRef = React.createRef<HTMLAnchorElement>();
    const ref = React.createRef<HTMLElement>();
    render(
      <AttachmentAction
        nativeButton={false}
        ref={ref}
        onClick={(event) => calls.push(`action:${event.defaultPrevented}`)}
        render={
          <a
            href='#download'
            ref={childRef}
            onClick={(event) => {
              event.preventDefault();
              calls.push("link");
            }}>
            Download
          </a>
        }
      />,
    );
    const link = screen.getByText("Download");
    expect(fireEvent.click(link)).toBe(false);
    expect(calls).toEqual(["link", "action:true"]);
    expect(ref.current).toBe(link);
    expect(childRef.current).toBe(link);
    expect(link).toHaveAttribute("href", "#download");
  });

  it("binds truncation, scroll snapping, logical positioning and action-above-trigger CSS contracts", () => {
    render(
      <AttachmentGroup>
        <Attachment>
          <AttachmentTitle>VeryLongUnbrokenCallerFilename</AttachmentTitle>
          <AttachmentActions>
            <AttachmentAction aria-label='Remove'>×</AttachmentAction>
          </AttachmentActions>
          <AttachmentTrigger aria-label='Open' />
        </Attachment>
      </AttachmentGroup>,
    );
    expect(screen.getByText("VeryLongUnbrokenCallerFilename")).toHaveClass(cssClass("title"));
    expect(declarations(".title")).toMatchObject({
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "white-space": "nowrap",
      "max-inline-size": "100%",
    });
    expect(declarations(".group")).toMatchObject({"overflow-x": "auto", "scroll-snap-type": "x mandatory"});
    expect(declarations('.group > [data-slot="attachment"]')).toMatchObject({"scroll-snap-align": "start", flex: "none"});
    expect(declarations(".trigger")).toMatchObject({position: "absolute", inset: "0", "z-index": "10"});
    expect(declarations(".actions")).toMatchObject({position: "relative", "z-index": "20"});
    expect(declarations('.attachment[data-orientation="vertical"] > .actions')).toHaveProperty("inset-inline-end", "var(--ac-space-3)");
    expect(declarations(".action")).toMatchObject({"min-inline-size": "var(--ac-size-sm)", "min-block-size": "var(--ac-size-sm)"});
    expect(declarations(".media svg")).toHaveProperty("pointer-events", "none");
  });
});
