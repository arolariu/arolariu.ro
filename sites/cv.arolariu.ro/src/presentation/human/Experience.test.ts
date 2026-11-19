import {fireEvent, render, screen} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";
import {experiencesAsArray} from "@/data/experiences";

import Experience from "./Experience.svelte";

describe("Experience", () => {
  it("lists professional roles as collapsed cards", () => {
    render(Experience);

    expect(screen.getByRole("heading", {name: /professional experience/i})).toBeInTheDocument();
    expect(screen.getAllByRole("button", {expanded: false})).toHaveLength(experiencesAsArray.length);
    expect(screen.getByRole("button", {name: /M365 AI Fullstack/i})).toHaveAttribute("aria-expanded", "false");
  });

  it("omits blank detail sections and closes the previous role when another card opens", async () => {
    render(Experience);
    const current = screen.getByRole("button", {name: /M365 AI Fullstack/i});
    const previous = screen.getByRole("button", {name: /Sovereign Clouds Software Engineer/i});

    await fireEvent.click(current);

    expect(current).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("GraphQL", {exact: true})).toBeInTheDocument();
    expect(screen.queryByRole("heading", {name: "Key Responsibilities"})).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", {name: "Key Achievements"})).not.toBeInTheDocument();

    await fireEvent.click(previous);

    expect(current).toHaveAttribute("aria-expanded", "false");
    expect(previous).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText("GraphQL", {exact: true})).not.toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Key Responsibilities"})).toBeInTheDocument();
    expect(screen.getByText(/Deliver one E\+C Data Platform/)).toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Key Achievements"})).toBeInTheDocument();
    expect(screen.getByText("Microservices", {exact: true})).toBeInTheDocument();

    await fireEvent.click(previous);

    expect(previous).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("heading", {name: "Technologies & Skills"})).not.toBeInTheDocument();
  });
});
