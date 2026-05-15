import {render} from "react-email";
import {describe, expect, it} from "vitest";

import InvoiceHasBeenSharedWithEmail from "./InvoiceHasBeenSharedWithEmail";

describe("InvoiceHasBeenSharedWithEmail", () => {
  it.each(["en", "ro", "fr"] as const)("renders for %s locale (snapshot)", async (locale) => {
    const html = await render(
      await InvoiceHasBeenSharedWithEmail({
        fromUsername: "Alex",
        toUsername: "Jane",
        identifier: "abc-123",
        locale,
      }),
    );
    expect(html).toMatchSnapshot();
  });
});
