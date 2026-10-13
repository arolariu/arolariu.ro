import * as React from "react";

import {mergeProps} from "@base-ui/react/merge-props";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import {Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage} from "./avatar";
import styles from "./avatar.module.css";
import {
  AvatarStack,
  BadgeSizes,
  DarkTheme,
  Group,
  GroupCount,
  GroupSizes,
  RenderState,
  RightToLeft,
  Sizes,
  WithDelay,
  WithStatus,
} from "./avatar.stories";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function requiredClass(name: string): string {
  const className = styles[name];
  if (typeof className !== "string" || className.trim().length === 0) {
    throw new Error(`Missing CSS Module class: ${name}`);
  }
  return className;
}

// Control only the browser's offscreen image loading; real Base UI owns all state.
function supplyImageLoader(): {latest: () => HTMLImageElement} {
  const images: HTMLImageElement[] = [];
  vi.spyOn(window, "Image").mockImplementation(function (): HTMLImageElement {
    const image = document.createElement("img");
    let source = "";
    Object.defineProperties(image, {
      complete: {value: false, configurable: true},
      src: {
        configurable: true,
        get: (): string => source,
        set: (value: string): void => {
          source = value;
        },
      },
    });
    images.push(image);
    return image;
  });

  return {
    latest(): HTMLImageElement {
      const image = images.at(-1);
      if (!image) throw new Error("Base UI has not requested an image");
      return image;
    },
  };
}

function cssDeclaration(selector: string, property: string): string {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(readFileSync(resolve(import.meta.dirname, "avatar.module.css"), "utf8"));
  for (const rule of Array.from(sheet.cssRules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText.replace(/\s+/g, " ") === selector) {
      return rule.style.getPropertyValue(property);
    }
  }
  return "";
}

// Apply the authored stylesheet using the same local class names exposed by Vite.
function mountAvatarStyles(): () => void {
  const stylesheet = document.createElement("style");
  stylesheet.textContent = readFileSync(resolve(import.meta.dirname, "avatar.module.css"), "utf8")
    .replace(/:global\(([^)]+)\)/g, "$1")
    .replace(/\.([a-zA-Z][\w-]*)/g, (selector: string, name: string): string => {
      const scopedName = styles[name];
      return scopedName ? `.${scopedName}` : selector;
    });
  document.head.append(stylesheet);
  return (): void => stylesheet.remove();
}

describe("Avatar", () => {
  it("exposes the Avatar size contract", () => {
    render(
      <Avatar
        size='sm'
        data-testid='avatar'>
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByTestId("avatar")).toHaveAttribute("data-size", "sm");
  });

  it("keeps no-image fallback content, classes, and refs on the actual primitives", () => {
    const rootRef = React.createRef<HTMLSpanElement>();
    const fallbackRef = React.createRef<HTMLSpanElement>();

    render(
      <Avatar
        ref={rootRef}
        className='consumer-root'
        data-testid='avatar'>
        <AvatarFallback
          ref={fallbackRef}
          className='consumer-fallback'>
          AO
        </AvatarFallback>
      </Avatar>,
    );

    const avatar = screen.getByTestId("avatar");
    const fallback = screen.getByText("AO");
    expect(rootRef.current).toBe(avatar);
    expect(fallbackRef.current).toBe(fallback);
    expect(avatar).toHaveClass(requiredClass("root"), "consumer-root");
    expect(fallback).toHaveClass(requiredClass("fallback"), "consumer-fallback");
  });

  it("forwards primitive-owned state to the root render callback", () => {
    render(
      <Avatar
        size='lg'
        render={(elementProps, state) => (
          <span
            {...elementProps}
            data-status={state.imageLoadingStatus}
            data-render-size={state.size}
            data-testid='avatar'
          />
        )}>
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByTestId("avatar")).toHaveAttribute("data-status", "idle");
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-render-size", "lg");
    expect(screen.getByTestId("avatar")).toHaveTextContent("AO");
  });

  it.each(["sm", "default", "lg"] as const)("applies the %s preset without discarding primitive class callbacks", (size) => {
    render(
      <Avatar
        size={size}
        className={(state) => `root-${state.imageLoadingStatus}-${state.size}`}
        data-testid='avatar'>
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByTestId("avatar")).toHaveClass(requiredClass("root"), requiredClass(size), `root-idle-${size}`);
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-slot", "avatar");
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-size", size);
  });

  it("uses the backward-compatible default size", () => {
    render(
      <Avatar data-testid='avatar'>
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-size", "default");
    expect(screen.getByTestId("avatar")).toHaveClass(requiredClass("default"));
  });

  it("preserves the existing root flex layout while adding badge overflow", () => {
    expect(cssDeclaration(".root", "display")).toBe("flex");
    expect(cssDeclaration(".root", "overflow")).toBe("visible");
  });

  it("preloads the real image and transitions all owning render/class callbacks from loading to loaded", async () => {
    const loader = supplyImageLoader();
    const rootRef = React.createRef<HTMLSpanElement>();
    const imageRef = React.createRef<HTMLImageElement>();
    const fallbackRef = React.createRef<HTMLSpanElement>();
    const statuses: string[] = [];

    render(
      <Avatar
        ref={rootRef}
        size='sm'
        className={(state) => `root-${state.imageLoadingStatus}`}
        render={(elementProps, state) => (
          <span
            {...elementProps}
            data-testid='avatar'
            data-status={state.imageLoadingStatus}
          />
        )}>
        <AvatarImage
          ref={imageRef}
          src='/portrait.png'
          srcSet='/portrait.png 1x, /portrait@2x.png 2x'
          sizes='24px'
          crossOrigin='anonymous'
          referrerPolicy='no-referrer'
          alt='Profile portrait'
          onLoadingStatusChange={(status) => statuses.push(status)}
          className={(state) => `image-${state.imageLoadingStatus}`}
          render={(elementProps, state) => (
            <img
              {...elementProps}
              data-status={state.imageLoadingStatus}
            />
          )}
        />
        <AvatarFallback
          ref={fallbackRef}
          className={(state) => `fallback-${state.imageLoadingStatus}`}
          render={(elementProps, state) => (
            <span
              {...elementProps}
              data-status={state.imageLoadingStatus}
            />
          )}>
          AO
        </AvatarFallback>
      </Avatar>,
    );

    const avatar = screen.getByTestId("avatar");
    const fallback = screen.getByText("AO");
    expect(avatar).toHaveAttribute("data-status", "loading");
    expect(avatar).toHaveClass("root-loading");
    expect(fallback).toHaveAttribute("data-status", "loading");
    expect(fallback).toHaveClass(requiredClass("fallback"), "fallback-loading");
    expect(fallback).toHaveAttribute("data-slot", "avatar-fallback");
    expect(fallbackRef.current).toBe(fallback);
    expect(imageRef.current).toBeNull();
    expect(screen.queryByRole("img", {name: "Profile portrait"})).not.toBeInTheDocument();
    expect(loader.latest().src).toBe("/portrait.png");
    expect(loader.latest()).toHaveAttribute("srcset", "/portrait.png 1x, /portrait@2x.png 2x");
    expect(loader.latest()).toHaveAttribute("sizes", "24px");
    expect(loader.latest().crossOrigin).toBe("anonymous");
    expect(loader.latest().referrerPolicy).toBe("no-referrer");

    act(() => fireEvent.load(loader.latest()));

    const image = await screen.findByRole("img", {name: "Profile portrait"});
    expect(image).toHaveAttribute("data-status", "loaded");
    expect(image).toHaveAttribute("data-slot", "avatar-image");
    expect(image).toHaveClass(requiredClass("image"), "image-loaded");
    expect(imageRef.current).toBe(image);
    expect(rootRef.current).toBe(avatar);
    expect(fallbackRef.current).toBeNull();
    expect(screen.queryByText("AO")).not.toBeInTheDocument();
    expect(avatar).toHaveAttribute("data-status", "loaded");
    expect(avatar).toHaveClass("root-loaded");
    expect(statuses).toEqual(["loading", "loaded"]);
  });

  it("keeps the actual fallback when preloading fails", () => {
    const loader = supplyImageLoader();
    const statuses: string[] = [];
    render(
      <Avatar data-testid='avatar'>
        <AvatarImage
          src='/missing.png'
          alt='Missing portrait'
          onLoadingStatusChange={(status) => statuses.push(status)}
        />
        <AvatarFallback
          className={(state) => `fallback-${state.imageLoadingStatus}`}
          render={(elementProps, state) => (
            <span
              {...elementProps}
              data-status={state.imageLoadingStatus}
            />
          )}>
          AO
        </AvatarFallback>
      </Avatar>,
    );

    act(() => fireEvent.error(loader.latest()));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AO")).toHaveAttribute("data-status", "error");
    expect(screen.getByText("AO")).toHaveClass(requiredClass("fallback"), "fallback-error");
    expect(statuses).toEqual(["loading", "error"]);
  });

  it("preserves the primitive fallback delay while an image is loading or has failed", () => {
    vi.useFakeTimers();
    const loader = supplyImageLoader();
    render(
      <Avatar>
        <AvatarImage
          src='/slow.png'
          alt='Slow portrait'
        />
        <AvatarFallback delay={200}>AO</AvatarFallback>
      </Avatar>,
    );

    act(() => fireEvent.error(loader.latest()));
    expect(screen.queryByText("AO")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(199));
    expect(screen.queryByText("AO")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("AO")).toBeInTheDocument();
  });

  it("does not show a delayed fallback after successful loading", () => {
    vi.useFakeTimers();
    const loader = supplyImageLoader();
    render(
      <Avatar>
        <AvatarImage
          src='/quick.png'
          alt='Quick portrait'
        />
        <AvatarFallback delay={200}>AO</AvatarFallback>
      </Avatar>,
    );

    act(() => fireEvent.load(loader.latest()));
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("img", {name: "Quick portrait"})).toBeInTheDocument();
    expect(screen.queryByText("AO")).not.toBeInTheDocument();
  });

  it("preserves keepMounted load/error events, alt, callbacks, refs, and fallback ownership", async () => {
    const imageRef = React.createRef<HTMLImageElement>();
    const childRef = React.createRef<HTMLImageElement>();
    const events: string[] = [];
    const statuses: string[] = [];
    render(
      <Avatar>
        <AvatarImage
          keepMounted
          ref={imageRef}
          src='/native.png'
          alt='Native portrait'
          className='wrapper-image'
          onLoad={() => events.push("wrapper-load")}
          onError={() => events.push("wrapper-error")}
          onLoadingStatusChange={(status) => statuses.push(status)}
          render={
            <img
              ref={childRef}
              className='child-image'
              onLoad={() => events.push("child-load")}
              onError={() => events.push("child-error")}
            />
          }
        />
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );

    const image = screen.getByAltText("Native portrait");
    expect(imageRef.current).toBe(image);
    expect(childRef.current).toBe(image);
    expect(image).toHaveClass(requiredClass("image"), "wrapper-image", "child-image");
    expect(image).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("AO")).toBeInTheDocument();

    fireEvent.load(image);
    await waitFor(() => expect(screen.queryByText("AO")).not.toBeInTheDocument());
    expect(screen.getByRole("img", {name: "Native portrait"})).toBe(image);
    expect(image).not.toHaveAttribute("aria-hidden");
    expect(events).toEqual(["child-load", "wrapper-load"]);
    expect(statuses.at(-1)).toBe("loaded");

    fireEvent.error(image);
    expect(screen.getByText("AO")).toBeInTheDocument();
    expect(image).toHaveAttribute("data-error");
    expect(image).toHaveAttribute("aria-hidden", "true");
    expect(events).toEqual(["child-load", "wrapper-load", "child-error", "wrapper-error"]);
    expect(statuses.at(-1)).toBe("error");
  });

  it("merges root render-element refs, classes, content, and cancelled handlers", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLSpanElement>();
    const childRef = React.createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <Avatar
        ref={rootRef}
        className='wrapper-root'
        onClick={(event) => calls.push(`wrapper-${event.defaultPrevented}`)}
        render={
          <a
            ref={childRef}
            href='#profile'
            className='child-root'
            onClick={(event) => {
              event.preventDefault();
              calls.push("child");
            }}
          />
        }>
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );
    const link = screen.getByRole("link", {name: "AO"});
    expect(link).toHaveClass(requiredClass("root"), "wrapper-root", "child-root");
    expect(rootRef.current).toBe(link);
    expect(childRef.current).toBe(link);
    await user.click(link);
    expect(calls).toEqual(["child", "wrapper-true"]);
    unmount();
    expect(rootRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("renders the public badge inside the avatar without clipping its corner placement", () => {
    expect(AvatarBadge).toBeDefined();
    const badgeRef = React.createRef<HTMLSpanElement>();
    render(
      <Avatar data-testid='avatar'>
        <AvatarFallback>AO</AvatarFallback>
        <AvatarBadge
          ref={badgeRef}
          role='img'
          aria-label='Online'
          className='consumer-badge'>
          <svg
            aria-hidden='true'
            data-testid='badge-icon'
          />
        </AvatarBadge>
      </Avatar>,
    );
    const badge = screen.getByRole("img", {name: "Online"});
    expect(badgeRef.current).toBe(badge);
    expect(badge).toHaveAttribute("data-slot", "avatar-badge");
    expect(badge).toHaveClass(requiredClass("badge"), "consumer-badge");
    expect(badge.parentElement).toBe(screen.getByTestId("avatar"));
    expect(screen.getByTestId("badge-icon").parentElement).toBe(badge);
    expect(cssDeclaration(".root", "overflow")).toBe("visible");
    expect(cssDeclaration(".badge", "position")).toBe("absolute");
    expect(cssDeclaration(".badge", "inset-inline-end")).toBe("0");
    expect(cssDeclaration(".badge", "inset-block-end")).toBe("0");
    expect(cssDeclaration(".image", "border-radius")).toBe("inherit");
    expect(cssDeclaration(".fallback", "border-radius")).toBe("inherit");
  });

  it("renders real grouped avatars and a trailing count with forwarded refs and names", () => {
    expect(AvatarGroup).toBeDefined();
    expect(AvatarGroupCount).toBeDefined();
    const groupRef = React.createRef<HTMLDivElement>();
    const countRef = React.createRef<HTMLDivElement>();
    render(
      <AvatarGroup
        ref={groupRef}
        role='group'
        aria-label='Contributors'
        className='consumer-group'>
        <Avatar>
          <AvatarFallback>AO</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <AvatarGroupCount
          ref={countRef}
          aria-label='3 more contributors'
          className='consumer-count'>
          +3
        </AvatarGroupCount>
      </AvatarGroup>,
    );

    const group = screen.getByRole("group", {name: "Contributors"});
    const count = screen.getByText("+3");
    expect(groupRef.current).toBe(group);
    expect(countRef.current).toBe(count);
    expect(group.tagName).toBe("DIV");
    expect(count.tagName).toBe("DIV");
    expect(group).toHaveAttribute("data-slot", "avatar-group");
    expect(count).toHaveAttribute("data-slot", "avatar-group-count");
    expect(group).toHaveClass(requiredClass("group"), "consumer-group");
    expect(count).toHaveClass(requiredClass("groupCount"), "consumer-count");
    expect(count).toHaveAttribute("aria-label", "3 more contributors");
    expect(group.children).toHaveLength(3);
    expect(group.lastElementChild).toBe(count);
    expect(screen.getByText("AO").parentElement?.parentElement).toBe(group);
    expect(screen.getByText("JD").parentElement?.parentElement).toBe(group);
  });

  it.each([
    [AvatarBadge, "avatar-badge", requiredClass("badge")],
    [AvatarGroup, "avatar-group", requiredClass("group")],
    [AvatarGroupCount, "avatar-group-count", requiredClass("groupCount")],
  ] as const)("lets %s own its render callback with slot state, children, and classes", (Part, slot, styleClass) => {
    expect(Part).toBeDefined();
    render(
      <Part
        className='consumer'
        render={(
          elementProps: Parameters<Exclude<AvatarBadge.Props["render"], React.ReactElement | undefined>>[0],
          state: AvatarBadge.State | AvatarGroup.State | AvatarGroupCount.State,
        ): React.ReactElement => (
          <span
            {...elementProps}
            data-render-slot={state.slot}
          />
        )}>
        Content
      </Part>,
    );
    const element = screen.getByText("Content");
    expect(element.tagName).toBe("SPAN");
    expect(element).toHaveAttribute("data-slot", slot);
    expect(element).toHaveAttribute("data-render-slot", slot);
    expect(element).toHaveClass(styleClass, "consumer");
  });

  it("accepts typed anchor/button callback consumers and forwards their actual DOM refs", () => {
    const badgeRef = React.createRef<HTMLAnchorElement>();
    const groupRef = React.createRef<HTMLAnchorElement>();
    const countRef = React.createRef<HTMLButtonElement>();
    const {unmount} = render(
      <>
        <AvatarBadge
          ref={badgeRef}
          render={(props, state) => (
            <a
              {...props}
              href='#profile'
              data-render-slot={state.slot}
            />
          )}>
          Availability
        </AvatarBadge>
        <AvatarGroup
          ref={groupRef}
          render={(props, state) => (
            <a
              {...props}
              href='#contributors'
              data-render-slot={state.slot}
            />
          )}>
          Contributors
        </AvatarGroup>
        <AvatarGroupCount
          ref={countRef}
          render={(props, state) => (
            <button
              {...props}
              type='button'
              data-render-slot={state.slot}
            />
          )}>
          More contributors
        </AvatarGroupCount>
      </>,
    );
    const badge = screen.getByRole("link", {name: "Availability"});
    const group = screen.getByRole("link", {name: "Contributors"});
    const count = screen.getByRole("button", {name: "More contributors"});
    expect(badgeRef.current).toBe(badge);
    expect(groupRef.current).toBe(group);
    expect(countRef.current).toBe(count);
    expect(badge).toHaveAttribute("data-render-slot", "avatar-badge");
    expect(group).toHaveAttribute("data-render-slot", "avatar-group");
    expect(count).toHaveAttribute("data-render-slot", "avatar-group-count");
    expect(badge).toHaveClass(requiredClass("badge"));
    expect(group).toHaveClass(requiredClass("group"));
    expect(count).toHaveClass(requiredClass("groupCount"));
    unmount();
    expect(badgeRef.current).toBeNull();
    expect(groupRef.current).toBeNull();
    expect(countRef.current).toBeNull();
  });

  it.each([
    [AvatarBadge, "avatar-badge"],
    [AvatarGroup, "avatar-group"],
    [AvatarGroupCount, "avatar-group-count"],
  ] as const)("merges %s render-element content, refs, classes, and cancellation", async (Part, slot) => {
    expect(Part).toBeDefined();
    const user = userEvent.setup();
    const wrapperRef = React.createRef<HTMLAnchorElement>();
    const childRef = React.createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <Part
        ref={wrapperRef}
        className='wrapper'
        onClick={(event) => calls.push(`wrapper-${event.defaultPrevented}`)}
        render={
          <a
            ref={childRef}
            href='#details'
            className='child'
            onClick={(event) => {
              event.preventDefault();
              calls.push("child");
            }}>
            Details
          </a>
        }>
        Ignored content
      </Part>,
    );
    const link = screen.getByRole("link", {name: "Details"});
    expect(link).toHaveAttribute("data-slot", slot);
    expect(link).toHaveClass("wrapper", "child");
    expect(wrapperRef.current).toBe(link);
    expect(childRef.current).toBe(link);
    expect(screen.queryByText("Ignored content")).not.toBeInTheDocument();
    await user.click(link);
    expect(calls).toEqual(["child", "wrapper-true"]);
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("merges correctly typed button refs for a count rendered as an element", () => {
    const wrapperRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const {unmount} = render(
      <AvatarGroupCount
        ref={wrapperRef}
        render={
          <button
            ref={childRef}
            type='button'
          />
        }>
        More contributors
      </AvatarGroupCount>,
    );
    const button = screen.getByRole("button", {name: "More contributors"});
    expect(wrapperRef.current).toBe(button);
    expect(childRef.current).toBe(button);
    expect(button).toHaveAttribute("data-slot", "avatar-group-count");
    expect(button).toHaveClass(requiredClass("groupCount"));
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("scales badges with the owning size and counts with the first direct grouped avatar", () => {
    expect(AvatarBadge).toBeDefined();
    expect(AvatarGroupCount).toBeDefined();
    render(
      <AvatarGroup>
        <Avatar
          size='sm'
          data-testid='avatar'>
          <AvatarFallback>AO</AvatarFallback>
          <AvatarBadge aria-label='Online' />
        </Avatar>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-size", "sm");
    expect(cssDeclaration(".sm", "--ac-avatar-badge-size")).toBe("var(--ac-space-2)");
    expect(cssDeclaration(".default", "--ac-avatar-badge-size")).toBe("0.625rem");
    expect(cssDeclaration(".lg", "--ac-avatar-badge-size")).toBe("var(--ac-space-3)");
    expect(cssDeclaration(".sm > .badge > svg", "display")).toBe("none");
    expect(cssDeclaration('.group:has(> :global([data-slot="avatar"][data-size="sm"]):first-child)', "--ac-avatar-count-size")).toBe(
      "var(--ac-size-sm)",
    );
    expect(cssDeclaration('.group:has(> :global([data-slot="avatar"][data-size="lg"]):first-child)', "--ac-avatar-count-size")).toBe(
      "3rem",
    );
    expect(cssDeclaration('.group > :global([data-slot="avatar"]), .group > .groupCount', "isolation")).toBe("isolate");
    expect(cssDeclaration('.group > :global([data-slot="avatar"]):has(> :global([data-slot="avatar-badge"]))', "z-index")).toBe("1");
  });

  it("documents the real public badge rather than a manual positioned span", () => {
    render(<WithStatus.render />);
    const badge = screen.getByLabelText("Online");
    expect(badge).toHaveAttribute("data-slot", "avatar-badge");
    expect(badge.parentElement).toHaveAttribute("data-slot", "avatar");
  });

  it("documents the real group and trailing count rather than manual story divs", () => {
    render(<Group.render />);
    expect(screen.getByRole("group", {name: "Contributors"})).toHaveAttribute("data-slot", "avatar-group");
    cleanup();
    render(<AvatarStack.render />);
    const group = screen.getByRole("group", {name: "Team members"});
    expect(group).toHaveAttribute("data-slot", "avatar-group");
    expect(group.lastElementChild).toHaveAttribute("data-slot", "avatar-group-count");
    expect(group.lastElementChild).toHaveTextContent("+5");
  });

  it("documents all three size presets without inline-style replacements", () => {
    render(<Sizes.render />);
    for (const [label, size] of [
      ["Small avatar", "sm"],
      ["Default avatar", "default"],
      ["Large avatar", "lg"],
    ] as const) {
      const avatar = screen.getByLabelText(label);
      expect(avatar).toHaveAttribute("data-size", size);
      expect(avatar).not.toHaveAttribute("style");
    }
  });

  it("renders the real badge-size, group-size, and standalone count stories", () => {
    render(<BadgeSizes.render />);
    for (const size of ["sm", "default", "lg"]) {
      const badge = screen.getByRole("img", {name: `${size} available`});
      expect(badge).toHaveAttribute("data-slot", "avatar-badge");
      expect(badge.parentElement).toHaveAttribute("data-size", size);
    }
    cleanup();
    render(<GroupSizes.render />);
    for (const size of ["sm", "default", "lg"]) {
      const group = screen.getByRole("group", {name: `${size} contributors`});
      expect(group).toHaveAttribute("data-slot", "avatar-group");
      expect(group.firstElementChild).toHaveAttribute("data-size", size);
      expect(group.lastElementChild).toHaveAttribute("data-slot", "avatar-group-count");
    }
    cleanup();
    render(<GroupCount.render />);
    expect(screen.getByText("+5")).toHaveAttribute("data-slot", "avatar-group-count");
  });

  it("renders the real delayed fallback story with its primitive timing", () => {
    vi.useFakeTimers();
    render(<WithDelay.render />);
    expect(screen.queryByText("AO")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(599));
    expect(screen.queryByText("AO")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("AO")).toHaveAttribute("data-slot", "avatar-fallback");
  });

  it("renders the real callback story with live image status and size", () => {
    const loader = supplyImageLoader();
    render(<RenderState.render />);
    const avatar = screen.getByRole("img", {name: "lg avatar: loading"});
    expect(avatar).toHaveAttribute("data-size", "lg");
    act(() => fireEvent.load(loader.latest()));
    expect(screen.getByRole("img", {name: "lg avatar: loaded"})).toBe(avatar);
    expect(screen.queryByText("AO")).not.toBeInTheDocument();
  });

  it("renders real themed and RTL groups with deliberate badge nesting", () => {
    render(
      <>
        <DarkTheme.render />
        <RightToLeft.render />
      </>,
    );
    const darkGroup = screen.getByRole("group", {name: "Dark theme contributors"});
    expect(darkGroup.parentElement).toHaveAttribute("data-theme", "dark");
    const rtlGroup = screen.getByRole("group", {name: "Right-to-left contributors"});
    expect(rtlGroup).toHaveAttribute("dir", "rtl");
    for (const group of [darkGroup, rtlGroup]) {
      expect(group).toHaveAttribute("data-slot", "avatar-group");
      expect(group.firstElementChild?.lastElementChild).toHaveAttribute("data-slot", "avatar-badge");
      expect(group.lastElementChild).toHaveAttribute("data-slot", "avatar-group-count");
    }
  });

  it("ignores superseded preloader events while the current source owns image and fallback state", () => {
    const loader = supplyImageLoader();
    const {rerender} = render(
      <Avatar>
        <AvatarImage
          src='/first.png'
          alt='Current portrait'
        />
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );
    const obsoleteImage = loader.latest();
    rerender(
      <Avatar>
        <AvatarImage
          src='/second.png'
          alt='Current portrait'
        />
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );
    const currentImage = loader.latest();
    expect(currentImage).not.toBe(obsoleteImage);
    act(() => fireEvent.load(obsoleteImage));
    expect(screen.queryByRole("img", {name: "Current portrait"})).not.toBeInTheDocument();
    expect(screen.getByText("AO")).toBeInTheDocument();
    act(() => fireEvent.load(currentImage));
    expect(screen.getByRole("img", {name: "Current portrait"})).toHaveAttribute("src", "/second.png");
    expect(screen.queryByText("AO")).not.toBeInTheDocument();
  });

  it("removes a superseded loaded image from flex flow while its real exit and fallback coexist", () => {
    const removeStyles = mountAvatarStyles();
    const loader = supplyImageLoader();
    const exitSnapshots: Array<
      Readonly<{
        image: HTMLImageElement;
        fallback: HTMLSpanElement;
        imagePosition: string;
        imageWidth: string;
        fallbackWidth: string;
        ending: boolean;
        loading: boolean;
        error: boolean;
        rootDisplay: string;
        rootWidth: string;
        rootHeight: string;
        rootOverflow: string;
      }>
    > = [];
    const captureFallback = (fallback: HTMLSpanElement | null): void => {
      const root = fallback?.parentElement;
      const image = root?.querySelector<HTMLImageElement>('[data-slot="avatar-image"]');
      if (!root || !image || !fallback) return;
      const imageStyle = window.getComputedStyle(image);
      const rootStyle = window.getComputedStyle(root);
      exitSnapshots.push({
        image,
        fallback,
        imagePosition: imageStyle.position,
        imageWidth: imageStyle.width,
        fallbackWidth: window.getComputedStyle(fallback).width,
        ending: image.hasAttribute("data-ending-style"),
        loading: image.hasAttribute("data-loading"),
        error: image.hasAttribute("data-error"),
        rootDisplay: rootStyle.display,
        rootWidth: rootStyle.width,
        rootHeight: rootStyle.height,
        rootOverflow: rootStyle.overflow,
      });
    };
    const avatar = (src: string): React.ReactElement => (
      <Avatar data-testid='switch-avatar'>
        <AvatarImage
          src={src}
          alt='Current portrait'
        />
        <AvatarFallback ref={captureFallback}>AO</AvatarFallback>
        <AvatarBadge aria-label='Available' />
      </Avatar>
    );
    try {
      const {rerender} = render(avatar("/first.png"));
      act(() => fireEvent.load(loader.latest()));
      const loadedImage = screen.getByRole("img", {name: "Current portrait"});
      expect(loadedImage).toHaveAttribute("src", "/first.png");
      expect(screen.queryByText("AO")).not.toBeInTheDocument();

      rerender(avatar("/second.png"));
      const exit = exitSnapshots.at(-1);
      if (!exit) throw new Error("The actual fallback never coexisted with the exiting loaded image");
      expect(exit.image).toBe(loadedImage);
      expect(exit.ending).toBe(true);
      expect(exit.loading).toBe(false);
      expect(exit.error).toBe(false);
      expect(exit.rootDisplay).toBe("flex");
      expect(exit.imagePosition).toBe("absolute");
      expect(exit.imageWidth).toBe("100%");
      expect(exit.fallbackWidth).toBe("100%");
      expect(exit.rootWidth).toBe("40px");
      expect(exit.rootHeight).toBe("40px");
      expect(exit.rootOverflow).toBe("visible");
      expect(screen.getByText("AO")).toBe(exit.fallback);
      expect(screen.getByLabelText("Available").parentElement).toBe(screen.getByTestId("switch-avatar"));
      expect(cssDeclaration(".image", "border-radius")).toBe("inherit");
      expect(cssDeclaration(".fallback", "border-radius")).toBe("inherit");
      expect(cssDeclaration(".badge", "box-shadow")).toBe("0 0 0 2px var(--ac-background)");

      act(() => fireEvent.load(loader.latest()));
      expect(screen.getByRole("img", {name: "Current portrait"})).toHaveAttribute("src", "/second.png");
      expect(screen.queryByText("AO")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Available").parentElement).toBe(screen.getByTestId("switch-avatar"));
    } finally {
      cleanup();
      removeStyles();
    }
  });

  it("retains fallback render-element content, refs, classes, and merged handlers", async () => {
    const user = userEvent.setup();
    const fallbackRef = React.createRef<HTMLSpanElement>();
    const childRef = React.createRef<HTMLSpanElement>();
    const calls: string[] = [];
    render(
      <Avatar>
        <AvatarFallback
          ref={fallbackRef}
          className='wrapper'
          onClick={() => calls.push("wrapper")}
          render={
            <span
              ref={childRef}
              className='child'
              onClick={() => calls.push("child")}>
              AO
            </span>
          }>
          Ignored
        </AvatarFallback>
      </Avatar>,
    );
    const fallback = screen.getByText("AO");
    expect(fallbackRef.current).toBe(fallback);
    expect(childRef.current).toBe(fallback);
    expect(fallback).toHaveClass(requiredClass("fallback"), "wrapper", "child");
    expect(screen.queryByText("Ignored")).not.toBeInTheDocument();
    await user.click(fallback);
    expect(calls).toEqual(["child", "wrapper"]);
  });

  it.each([
    {name: "Avatar", Part: Avatar},
    {name: "AvatarFallback", Part: AvatarFallback},
    {name: "AvatarBadge", Part: AvatarBadge},
    {name: "AvatarGroup", Part: AvatarGroup},
    {name: "AvatarGroupCount", Part: AvatarGroupCount},
  ])("lets a rendered child cancel $name's wrapper handler through Base UI", async ({Part}) => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const content = (
      <Part
        onClick={() => calls.push("wrapper")}
        render={
          <a
            href='#details'
            {...mergeProps<"a">(
              {},
              {
                onClick: (event) => {
                  event.preventDefault();
                  event.preventBaseUIHandler();
                  calls.push("child");
                },
              },
            )}
          />
        }>
        Details
      </Part>
    );
    render(Part === AvatarFallback ? <Avatar>{content}</Avatar> : content);
    await user.click(screen.getByRole("link", {name: "Details"}));
    expect(calls).toEqual(["child"]);
  });
});
