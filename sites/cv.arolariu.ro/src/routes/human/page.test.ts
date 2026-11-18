import {render, screen, within} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import Page from "./+page.svelte";

describe("/human route", () => {
  it("links to real, unique sections of the rendered CV", () => {
    const {container} = render(Page);
    const navigation = within(screen.getByRole("navigation"));

    for (const [label, target] of [
      ["About", "#about"],
      ["Experience", "#experience"],
      ["Skills", "#skills"],
      ["Contact", "#contact"],
    ]) {
      expect(navigation.getByRole("link", {name: label})).toHaveAttribute("href", target);
      expect(container.querySelectorAll(target)).toHaveLength(1);
      expect(container.querySelector(target)).toHaveTextContent(/\S/u);
    }
  });
});
