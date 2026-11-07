import {expect, test} from "@playwright/test";

test("site-only preview serves authored pages and excludes local generated references", async ({page}) => {
  await page.goto("/");
  await expect(page.getByText("site-only preview: authored documentation")).toBeVisible();
  await expect(page.locator("main a[data-active]")).toHaveCount(7);
  await expect(page.locator('a[href^="/internals/"], a[href^="/reference/typescript"]')).toHaveCount(0);
  await page.goto("/intro");
  await expect(page.getByRole("heading", {name: "# Introduction", level: 1, exact: true})).toBeVisible();
});

test("keyboard navigation uses the visible rows and ignores editable targets", async ({page}) => {
  await page.goto("/");
  const active = page.locator('main a[data-active="true"]');
  await page.locator("main").click({position: {x: 5, y: 5}});
  await page.keyboard.press("ArrowDown");
  await expect(active).toHaveCount(1);
  await page.keyboard.press("k");
  await expect(active).toHaveAttribute("href", "/monorepo/rfc/domain-driven-design-architecture/");
  for (let index = 0; index < 15; index++) await page.keyboard.press("j");
  await expect(active).toHaveAttribute("href", "/monorepo/frontend/");

  await page.evaluate(() => {
    const input = document.createElement("input");
    input.setAttribute("aria-label", "Keyboard boundary");
    document.querySelector("main")?.append(input);
  });
  await page.getByRole("textbox", {name: "Keyboard boundary"}).fill("j");
  await page.getByRole("textbox", {name: "Keyboard boundary"}).press("k");
  await expect(active).toHaveAttribute("href", "/monorepo/frontend/");
  await page.getByRole("textbox", {name: "Keyboard boundary"}).blur();
  await page.keyboard.press("Escape");
  await expect(active).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  for (let index = 0; index < 15; index++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/monorepo\/frontend\/$/);
});
