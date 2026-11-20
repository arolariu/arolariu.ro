// @vitest-environment-options {"settings":{"device":{"prefersReducedMotion":"reduce"}}}

import {fireEvent, render, screen} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";

import Contact from "./Contact.svelte";
import styles from "./Contact.module.scss";

describe("Contact", () => {
  it("identifies each required field and highlights only its focused label", async () => {
    render(Contact);
    expect(screen.getByRole("heading", {name: /get\s+in\s+touch/iu, level: 2})).toBeVisible();
    for (const name of ["Location", "Email", "Website"]) {
      expect(screen.getByRole("heading", {name, level: 4})).toBeVisible();
    }

    for (const name of ["Name", "Email", "Message"]) {
      const field = screen.getByRole("textbox", {name});
      const label = screen.getByText(name, {selector: "label"});
      expect(field).toBeRequired();
      expect(label).not.toHaveClass(styles.labelFocused);

      await fireEvent.focus(field);
      expect(label).toHaveClass(styles.labelFocused);

      await fireEvent.blur(field);
      expect(label).not.toHaveClass(styles.labelFocused);
    }
  });

  it("opens the visitor's email client with the entered contact details and encodes reserved characters", async () => {
    const navigate = vi.spyOn(window.location, "href", "set").mockImplementation(() => {});
    render(Contact);
    await fireEvent.input(screen.getByRole("textbox", {name: "Name"}), {target: {value: "Sam & Co"}});
    await fireEvent.input(screen.getByRole("textbox", {name: "Email"}), {target: {value: "sam+cv@example.test"}});
    await fireEvent.input(screen.getByRole("textbox", {name: "Message"}), {target: {value: "Hello?\nA project & a question."}});
    expect(navigate).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole("button", {name: "Send Message"}));

    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      "mailto:admin@arolariu.ro?subject=%5Bcv.arolariu.ro%5D%20-%20Sam%20%26%20Co"
        + "&body=Hello%2C%0A%0AHello%3F%0AA%20project%20%26%20a%20question.%0A%0A%E2%80%94%20Sam%20%26%20Co%0Asam%2Bcv%40example.test",
    );
  });
});
