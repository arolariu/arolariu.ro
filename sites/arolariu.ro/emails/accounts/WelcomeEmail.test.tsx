import {render} from "react-email";
import {describe, expect, it} from "vitest";

import WelcomeEmail from "./WelcomeEmail";

describe("WelcomeEmail", () => {
  it.each(["en", "ro", "fr"] as const)("renders for %s locale (snapshot)", async (locale) => {
    const html = await render(await WelcomeEmail({username: "Test User", locale}));
    expect(html).toMatchSnapshot();
  });

  it("uses lang attribute matching the locale", async () => {
    const html = await render(await WelcomeEmail({username: "Test User", locale: "ro"}));
    expect(html).toMatch(/lang="ro"/);
  });
});
