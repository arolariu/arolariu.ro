import {expect, userEvent, within} from "storybook/test";

/**
 * Storybook `play` function that opens an `OpenDialogButton` dialog by clicking
 * its trigger, then asserts the dialog is present. Preserves a11y coverage of
 * the open dialog while the story's default visual state stays closed.
 *
 * @param context - Storybook story context (uses `canvasElement`).
 */
export async function playOpenDialog({canvasElement}: {readonly canvasElement: HTMLElement}): Promise<void> {
  const canvas = within(canvasElement);
  const body = within(document.body);

  await userEvent.click(canvas.getByRole("button", {name: /open dialog/i}));
  await expect(await body.findByRole("dialog")).toBeInTheDocument();
}
