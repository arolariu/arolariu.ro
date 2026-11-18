/**
 * @fileoverview Render-smoke tests for the Contact section.
 *
 * Verifies the section heading + the three contact-info card titles
 * (Location / Email / Website) + the contact form is present.
 */

import {fireEvent, render, screen} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";

import Contact from "./Contact.svelte";

describe("Contact", () => {
  it("renders the 'Get In Touch' level-2 heading", () => {
    const {getByRole} = render(Contact);
    const heading = getByRole("heading", {name: /get\s+in\s+touch/i, level: 2});
    expect(heading).toBeTruthy();
  });

  it("renders the three contact-info card titles", () => {
    const {getAllByText} = render(Contact);
    expect(getAllByText(/^Location$/i).length).toBeGreaterThan(0);
    expect(getAllByText(/^Email$/i).length).toBeGreaterThan(0);
    expect(getAllByText(/^Website$/i).length).toBeGreaterThan(0);
  });

  it("renders the message form (name + email + message inputs)", () => {
    const {container} = render(Contact);
    const inputs = container.querySelectorAll("input, textarea");
    expect(inputs.length).toBeGreaterThanOrEqual(3);
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
