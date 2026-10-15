import {mergeProps} from "@base-ui/react/merge-props";
import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef} from "react";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {Button, buttonVariants} from "./button";
import styles from "./button.module.css";
import * as buttonStories from "./button.stories";

const {FocusableDisabled, IconExtraSmall, Navigation, NonNative} = buttonStories;

function requiredClass(name: string): string {
  const className = styles[name];
  if (typeof className !== "string" || className.trim().length === 0) {
    throw new Error(`Missing CSS Module class: ${name}`);
  }
  return className;
}

const NativeTarget = ({ref, ...props}: Readonly<React.ComponentPropsWithRef<"button">>): React.JSX.Element => (
  <button
    {...props}
    ref={ref}
  />
);

const variants = [
  ["default", requiredClass("default")],
  ["destructive", requiredClass("destructive")],
  ["outline", requiredClass("outline")],
  ["secondary", requiredClass("secondary")],
  ["ghost", requiredClass("ghost")],
  ["link", requiredClass("link")],
] as const;

const sizes = [
  ["default", requiredClass("sizeDefault")],
  ["xs", requiredClass("sizeXs")],
  ["sm", requiredClass("sizeSm")],
  ["lg", requiredClass("sizeLg")],
  ["icon", requiredClass("sizeIcon")],
  ["icon-xs", requiredClass("sizeIconXs")],
  ["icon-sm", requiredClass("sizeIconSm")],
  ["icon-lg", requiredClass("sizeIconLg")],
] as const;

describe("Button", () => {
  it.each(["light", "dark"] as const)("preserves the %s Destructive story's action name and variant classes", (theme) => {
    const {Destructive} = composeStories(buttonStories);
    render(
      <div data-theme={theme}>
        <Destructive />
      </div>,
    );
    const button = screen.getByRole("button", {name: "Delete"});
    expect(button).toHaveClass(requiredClass("button"), requiredClass("destructive"), requiredClass("sizeDefault"));
    expect(button).toHaveAttribute("data-variant", "destructive");
    expect(button).toHaveAttribute("type", "button");
    expect(button.parentElement).toHaveAttribute("data-theme", theme);
  });

  it("requires caller-owned icon names and removes the child-slot API", () => {
    expectTypeOf<Button.Props>().not.toHaveProperty("asChild");
    // @ts-expect-error Icon presets need a caller-localized accessible name.
    const unnamed = <Button size='icon' />;
    expect(unnamed).toBeDefined();
    render(
      <Button
        size='icon'
        aria-label='Ajouter'>
        ＋
      </Button>,
    );
    expect(screen.getByRole("button", {name: "Ajouter"})).toBeInTheDocument();
  });
  it("activates a non-native rendered button with the keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button
        nativeButton={false}
        render={<div />}
        onClick={onClick}>
        Run
      </Button>,
    );

    await user.tab();
    expect(screen.getByRole("button", {name: "Run"})).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not submit a form by default", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>): void => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Save</Button>
      </form>,
    );

    const button = screen.getByRole("button", {name: "Save"});
    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("preserves an explicit submit type and form behavior", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>): void => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type='submit'>Submit</Button>
      </form>,
    );

    await user.click(screen.getByRole("button", {name: "Submit"}));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each(variants)("applies the %s variant to every size", (variant, variantClass) => {
    sizes.forEach(([size, sizeClass]) => {
      const {unmount} = render(
        <Button
          variant={variant}
          aria-label='Action'
          size={size}>
          Action
        </Button>,
      );
      const button = screen.getByRole("button", {name: "Action"});
      expect(button).toHaveClass(requiredClass("button"), variantClass, sizeClass);
      expect(button).toHaveAttribute("data-slot", "button");
      expect(button).toHaveAttribute("data-variant", variant);
      expect(button).toHaveAttribute("data-size", size);
      unmount();
    });
  });

  it("generates default and customized classes without rendering", () => {
    expect(buttonVariants()).toContain(requiredClass("button"));
    expect(buttonVariants()).toContain(requiredClass("default"));
    expect(buttonVariants()).toContain(requiredClass("sizeDefault"));
    expect(buttonVariants({variant: "ghost", size: "icon-xs", className: "consumer"})).toContain(requiredClass("ghost"));
    expect(buttonVariants({variant: "ghost", size: "icon-xs", className: "consumer"})).toContain(requiredClass("sizeIconXs"));
    expect(buttonVariants({className: "consumer"})).toContain("consumer");
  });

  it("forwards the native ref and accessibility attributes", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button
        ref={ref}
        aria-label='Save record'
        aria-describedby='description'
        className='consumer'>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", {name: "Save record"});
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("aria-describedby", "description");
    expect(button).toHaveClass("consumer", requiredClass("button"));
  });

  it("merges element-render child and wrapper refs, handlers, classes, and child content", async () => {
    const user = userEvent.setup();
    const wrapperRef = createRef<HTMLElement>();
    const childRef = createRef<HTMLButtonElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <Button
        ref={wrapperRef}
        className='wrapper'
        onClick={() => calls.push("wrapper")}
        render={
          <button
            ref={childRef}
            className='child'
            onClick={() => calls.push("child")}>
            Child action
          </button>
        }>
        Fallback
      </Button>,
    );
    const button = screen.getByRole("button", {name: "Child action"});
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("child", "wrapper", requiredClass("button"));
    expect(screen.queryByText("Fallback")).not.toBeInTheDocument();
    expect(wrapperRef.current).toBe(button);
    expect(childRef.current).toBe(button);
    await user.click(button);
    expect(calls).toEqual(["child", "wrapper"]);
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("preserves wrapper content when the render element has no children", () => {
    render(<Button render={<button />}>Visible content</Button>);
    expect(screen.getByRole("button", {name: "Visible content"})).toBeInTheDocument();
  });

  it("augments actual primitive callback state and updates it on rerender", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    const renderButton: Exclude<Button.Props["render"], React.ReactElement | undefined> = (props, state) => (
      <button
        {...props}
        aria-label={`${state.variant}-${state.size}-${String(state.disabled)}`}
      />
    );
    const {rerender} = render(
      <Button
        ref={ref}
        variant='outline'
        size='lg'
        disabled
        onClick={onClick}
        render={renderButton}>
        Callback contents
      </Button>,
    );
    const disabled = screen.getByRole("button", {name: "outline-lg-true"});
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAttribute("type", "button");
    expect(disabled).toHaveAttribute("data-disabled");
    expect(disabled).toHaveTextContent("Callback contents");
    expect(ref.current).toBe(disabled);
    await user.click(disabled);
    expect(onClick).not.toHaveBeenCalled();

    rerender(
      <Button
        ref={ref}
        variant='secondary'
        size='xs'
        onClick={onClick}
        render={renderButton}>
        Updated contents
      </Button>,
    );
    const enabled = screen.getByRole("button", {name: "secondary-xs-false"});
    expect(enabled).not.toBeDisabled();
    expect(enabled).not.toHaveAttribute("data-disabled");
    expect(enabled).toHaveTextContent("Updated contents");
    expect(ref.current).toBe(enabled);
    await user.click(enabled);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("honors focusableWhenDisabled on a native=%s callback target", async (nativeButton) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button
        disabled
        nativeButton={nativeButton}
        focusableWhenDisabled
        onClick={onClick}
        render={(props) => (nativeButton ? <button {...props} /> : <div {...props} />)}>
        Unavailable
      </Button>,
    );
    const button = screen.getByRole("button", {name: "Unavailable"});
    await user.tab();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toHaveAttribute("disabled");
    await user.keyboard("{Enter} ");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    await user.tab();
    expect(button).not.toHaveFocus();
  });

  it.each([true, false])("removes disabled native=%s callback targets from tab order", async (nativeButton) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Button
          disabled
          nativeButton={nativeButton}
          onClick={onClick}
          render={(props) => (nativeButton ? <button {...props} /> : <div {...props} />)}>
          Disabled
        </Button>
        <button type='button'>Next</button>
      </>,
    );
    const button = screen.getByRole("button", {name: "Disabled"});
    expect(button).toHaveAttribute("data-disabled");
    if (nativeButton) {
      expect(button).toBeDisabled();
    } else {
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveAttribute("tabindex", "-1");
      expect(button).not.toHaveAttribute("disabled");
    }
    await user.tab();
    expect(screen.getByRole("button", {name: "Next"})).toHaveFocus();
    fireEvent.click(button);
    fireEvent.keyDown(button, {key: "Enter"});
    fireEvent.keyUp(button, {key: " "});
    expect(onClick).not.toHaveBeenCalled();
  });

  it("activates a generic non-native button on Space release and click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button
        nativeButton={false}
        render={<div />}
        onClick={onClick}>
        Run
      </Button>,
    );
    await user.tab();
    await user.keyboard("[Space>]");
    expect(onClick).not.toHaveBeenCalled();
    await user.keyboard("[/Space]");
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", {name: "Run"}));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("preserves anchor href and native Enter while adding Space activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event: React.MouseEvent<HTMLButtonElement>): void => event.preventDefault());
    render(
      <Button
        nativeButton={false}
        render={<a href='#destination' />}
        onClick={onClick}>
        Navigate
      </Button>,
    );
    const anchor = screen.getByRole("button", {name: "Navigate"});
    expect(anchor).toHaveAttribute("href", "#destination");
    expect(anchor).not.toHaveAttribute("type");
    await user.tab();
    await user.keyboard("{Enter} ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("honors cancelled link keyboard activation without replacing href semantics", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button
        nativeButton={false}
        render={<a href='#cancelled' />}
        onClick={onClick}
        onKeyDown={(event) => event.preventDefault()}
        onKeyUp={(event) => event.preventDefault()}>
        Cancelled navigation
      </Button>,
    );
    await user.tab();
    await user.keyboard("{Enter} ");
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", {name: "Cancelled navigation"})).toHaveAttribute("href", "#cancelled");
  });

  it("lets child handlers cancel wrapper click and non-native keyboard activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <Button
        nativeButton={false}
        onClick={onClick}
        onKeyDown={onKeyDown}
        render={
          <div
            {...mergeProps<"div">(
              {},
              {
                onClick: (event) => event.preventBaseUIHandler(),
                onKeyDown: (event) => event.preventBaseUIHandler(),
              },
            )}>
            Cancelled
          </div>
        }
      />,
    );
    await user.click(screen.getByRole("button", {name: "Cancelled"}));
    await user.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it.each(["Enter", " "])("honors preventDefault on the %s activation event", (key) => {
    const onClick = vi.fn();
    render(
      <Button
        nativeButton={false}
        render={<div />}
        onClick={onClick}
        onKeyDown={(event) => event.preventDefault()}
        onKeyUp={(event) => event.preventDefault()}>
        Cancelled
      </Button>,
    );
    const button = screen.getByRole("button", {name: "Cancelled"});
    fireEvent.keyDown(button, {key});
    fireEvent.keyUp(button, {key});
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not activate the wrapper for keyboard events from nested controls", () => {
    const onClick = vi.fn();
    render(
      <Button
        nativeButton={false}
        render={<div />}
        onClick={onClick}>
        <input aria-label='Nested input' />
      </Button>,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), {key: "Enter"});
    fireEvent.keyUp(screen.getByRole("textbox"), {key: " "});
    expect(onClick).not.toHaveBeenCalled();
  });

  it("composes render links with both refs and handlers", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLElement>();
    const childRef = createRef<HTMLAnchorElement>();
    const calls: string[] = [];
    render(
      <Button
        nativeButton={false}
        ref={ref}
        className='wrapper'
        onClick={() => calls.push("wrapper")}
        render={
          <a
            ref={childRef}
            href='#destination'
            className='child'
            onClick={(event) => {
              event.preventDefault();
              calls.push("child");
            }}>
            Navigation
          </a>
        }
      />,
    );
    const anchor = screen.getByRole("button", {name: "Navigation"});
    expect(anchor).not.toHaveAttribute("type");
    expect(anchor).toHaveAttribute("href", "#destination");
    expect(anchor).toHaveClass("child", "wrapper");
    expect(ref.current).toBe(anchor);
    expect(childRef.current).toBe(anchor);
    await user.click(anchor);
    expect(calls).toEqual(["child", "wrapper"]);
  });

  it("keeps native semantics for render button elements", () => {
    render(
      <Button
        disabled
        render={<button>Native</button>}
      />,
    );
    const button = screen.getByRole("button", {name: "Native"});
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("type", "button");
    expect(button).not.toHaveAttribute("role");
  });

  it("keeps plain text as native button content", () => {
    render(<Button>Plain text</Button>);
    expect(screen.getByRole("button", {name: "Plain text"})).toHaveAttribute("type", "button");
  });

  it("keeps fragment children inside a native button", () => {
    render(
      <Button>
        <>
          <span>Fragment</span> content
        </>
      </Button>,
    );
    expect(screen.getByRole("button", {name: "Fragment content"})).toHaveAttribute("type", "button");
  });

  it("honors nativeButton for React 19 custom render components", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button
        nativeButton
        disabled
        ref={ref}
        render={<NativeTarget>Custom native</NativeTarget>}
      />,
    );
    const button = screen.getByRole("button", {name: "Custom native"});
    expect(ref.current).toBe(button);
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("role");
  });

  it("exercises the real non-native keyboard story", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button
        {...NonNative.args}
        onClick={onClick}
      />,
    );
    await user.tab();
    expect(screen.getByRole("button", {name: "Keyboard action"})).toHaveFocus();
    await user.keyboard("{Enter} ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("renders real navigation, named icon, and disabled callback stories", () => {
    render(
      <>
        <Button {...Navigation.args} />
        <Button {...IconExtraSmall.args} />
        <Button {...FocusableDisabled.args} />
      </>,
    );
    expect(screen.getByRole("button", {name: "Read documentation"})).toHaveAttribute("href", "#documentation");
    expect(screen.getByRole("button", {name: "Add"})).toHaveClass(requiredClass("sizeIconXs"));
    expect(screen.getByRole("button", {name: "default action unavailable"})).toHaveAttribute("aria-disabled", "true");
  });
});
