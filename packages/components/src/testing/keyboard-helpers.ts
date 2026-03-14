import userEvent from "@testing-library/user-event";

/**
 * Simulates pressing the `Tab` key.
 */
export async function pressTab(): Promise<void> {
  await userEvent.setup().tab();
}

/**
 * Simulates pressing the `Enter` key.
 */
export async function pressEnter(): Promise<void> {
  await userEvent.setup().keyboard("{Enter}");
}

/**
 * Simulates pressing the `Escape` key.
 */
export async function pressEscape(): Promise<void> {
  await userEvent.setup().keyboard("{Escape}");
}

/**
 * Simulates pressing the `ArrowDown` key.
 */
export async function pressArrowDown(): Promise<void> {
  await userEvent.setup().keyboard("{ArrowDown}");
}

/**
 * Simulates pressing the `ArrowUp` key.
 */
export async function pressArrowUp(): Promise<void> {
  await userEvent.setup().keyboard("{ArrowUp}");
}

/**
 * Simulates pressing the `ArrowLeft` key.
 */
export async function pressArrowLeft(): Promise<void> {
  await userEvent.setup().keyboard("{ArrowLeft}");
}

/**
 * Simulates pressing the `ArrowRight` key.
 */
export async function pressArrowRight(): Promise<void> {
  await userEvent.setup().keyboard("{ArrowRight}");
}

/**
 * Simulates pressing the `Space` key.
 */
export async function pressSpace(): Promise<void> {
  await userEvent.setup().keyboard(" ");
}
