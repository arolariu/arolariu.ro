/**
 * @fileoverview Render-smoke tests for the Competencies section.
 *
 * Verifies the section heading + the 6 competency cards render. Uses
 * `getAllByText` for competency phrases because they appear in both
 * card titles and card descriptions.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import Competencies from "./Competencies.svelte";

describe("Competencies", () => {
  it("renders the Core Competencies level-2 heading", () => {
    const {getByRole} = render(Competencies);
    const heading = getByRole("heading", {name: /core\s+competencies/i, level: 2});
    expect(heading).toBeTruthy();
  });

  it("renders one h3 card per competency (6 total)", () => {
    const {getAllByRole} = render(Competencies);
    const cards = getAllByRole("heading", {level: 3});
    expect(cards).toHaveLength(6);
  });

  it("includes the load-bearing competency titles (somewhere on the page)", () => {
    const {getAllByText} = render(Competencies);
    expect(getAllByText(/engineering\s+excellence/i).length).toBeGreaterThan(0);
    expect(getAllByText(/test-driven\s+development/i).length).toBeGreaterThan(0);
    expect(getAllByText(/domain-driven\s+design/i).length).toBeGreaterThan(0);
  });
});
