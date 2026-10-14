import {AlertDialog as BaseAlertDialog} from "@base-ui/react/alert-dialog";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it} from "vitest";

import {AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle} from "./alert-dialog";
import {Button} from "./button";
import {LegacyAlertDialogAction, type LegacyAlertDialogActionProps} from "./legacy-alert-dialog-action";

describe("LegacyAlertDialogAction", () => {
  it("retains the exact legacy Props/State namespace and SDK composition/ref types", () => {
    expectTypeOf<LegacyAlertDialogAction.Props>().toEqualTypeOf<LegacyAlertDialogActionProps>();
    expectTypeOf<Readonly<React.ComponentPropsWithRef<typeof LegacyAlertDialogAction>>>().toEqualTypeOf<LegacyAlertDialogActionProps>();
    expectTypeOf<LegacyAlertDialogAction.State>().toEqualTypeOf<BaseAlertDialog.Close.State>();
    expectTypeOf<Pick<LegacyAlertDialogAction.Props, "ref" | "render" | "nativeButton" | "onClick">>().toEqualTypeOf<
      Readonly<Pick<React.ComponentPropsWithRef<typeof BaseAlertDialog.Close>, "ref" | "render" | "nativeButton" | "onClick">>
    >();
  });

  it("preserves callback-ref cleanup and native attributes through the actual Close primitive", () => {
    const events: Array<HTMLButtonElement | null | string> = [];
    const ref: React.RefCallback<HTMLButtonElement> = (node) => {
      events.push(node);
      return () => {
        events.push("cleanup");
      };
    };
    const {unmount} = render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Legacy ref contract</AlertDialogTitle>
          <LegacyAlertDialogAction
            ref={ref}
            name='acknowledge'
            form='confirmation'
            render={(props, state) => (
              <button
                {...props}
                data-disabled={String(state.disabled)}
              />
            )}>
            Acknowledge
          </LegacyAlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const button = screen.getByRole("button", {name: "Acknowledge"});
    expect(events).toEqual([button]);
    expect(button).toHaveAttribute("name", "acknowledge");
    expect(button).toHaveAttribute("form", "confirmation");
    expect(button).toHaveAttribute("data-disabled", "false");
    unmount();
    expect(events).toEqual([button, "cleanup"]);
  });

  it("explicitly retains the old immediate-close contract", async () => {
    const user = userEvent.setup();
    const effects: string[] = [];
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Immediate acknowledgement</AlertDialogTitle>
          <AlertDialogDescription>Legacy behavior is opt-in</AlertDialogDescription>
          <LegacyAlertDialogAction onClick={() => effects.push("acknowledged")}>Acknowledge</LegacyAlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", {name: "Acknowledge"}));
    expect(effects).toEqual(["acknowledged"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("forwards real disabled render state, refs and shared Button size presets", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Disabled legacy action</AlertDialogTitle>
          <LegacyAlertDialogAction
            ref={ref}
            disabled
            size='xs'
            variant='secondary'
            className='custom'
            render={(props, state) => (
              <button
                {...props}
                data-disabled={String(state.disabled)}
              />
            )}>
            Acknowledge
          </LegacyAlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const button = screen.getByRole("button", {name: "Acknowledge"});
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("data-disabled", "true");
    expect(button).toHaveAttribute("data-size", "xs");
    expect(button).toHaveAttribute("data-variant", "secondary");
    expect(button).toHaveClass("custom");
    await user.click(button);
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it("merges composed Button handlers and honors primitive cancellation", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Cancelled legacy close</AlertDialogTitle>
          <LegacyAlertDialogAction render={<Button onClick={(event) => event.preventBaseUIHandler()} />}>Stay</LegacyAlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const button = screen.getByRole("button", {name: "Stay"});
    expect(button.querySelector("button")).toBeNull();
    await user.click(button);
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });
});
