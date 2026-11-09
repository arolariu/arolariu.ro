import {cleanup, render, screen} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {composeStories, type Meta, type StoryObj} from "storybook-react-rsbuild";
import {afterEach, beforeEach, describe, expect, it} from "vitest";

import preview from "../../.storybook/preview";
import {Popover, PopoverContent, PopoverTitle, PopoverTrigger} from "../components/ui/popover";

const meta = {
  title: "Tests/Preview theme",
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger>Open themed portal</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Themed portal</PopoverTitle>
      </PopoverContent>
    </Popover>
  ),
} satisfies Meta;
type Story = StoryObj<typeof meta>;
const Dark: Story = {globals: {theme: "dark"}};
const Light: Story = {globals: {theme: "light"}};
const stories = composeStories({default: meta, Dark, Light}, preview);

describe("Storybook document theme ownership", () => {
  let originalTheme: string | null;
  let bodyBackground: string;
  let bodyColor: string;
  let htmlBackground: string;
  beforeEach(() => {
    originalTheme = document.documentElement.getAttribute("data-theme");
    bodyBackground = document.body.style.backgroundColor;
    bodyColor = document.body.style.color;
    htmlBackground = document.documentElement.style.backgroundColor;
  });
  afterEach(() => {
    cleanup();
    if (originalTheme === null) document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", originalTheme);
    document.body.style.backgroundColor = bodyBackground;
    document.body.style.color = bodyColor;
    document.documentElement.style.backgroundColor = htmlBackground;
  });

  it("themes the default body portal and restores the document after switching themes", () => {
    document.documentElement.setAttribute("data-theme", "consumer");
    document.body.style.backgroundColor = "rgb(1, 2, 3)";
    const {rerender, unmount} = render(<stories.Dark />);
    const popup = screen.getByRole("dialog", {name: "Themed portal"});
    expect(popup.closest('[data-theme="dark"]')).toBe(document.documentElement);

    rerender(<stories.Light />);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(screen.getByRole("dialog", {name: "Themed portal"}).closest('[data-theme="light"]')).toBe(document.documentElement);
    unmount();
    expect(document.documentElement).toHaveAttribute("data-theme", "consumer");
    expect(document.body.style.backgroundColor).toBe("rgb(1, 2, 3)");
  });

  it("retains the document theme while another decorated story remains mounted", () => {
    document.documentElement.setAttribute("data-theme", "consumer");
    const first = render(<stories.Dark />);
    const second = render(<stories.Dark />);
    first.unmount();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    second.unmount();
    expect(document.documentElement).toHaveAttribute("data-theme", "consumer");
  });

  it("does not mutate the document during server rendering", () => {
    document.documentElement.setAttribute("data-theme", "consumer");
    document.body.style.backgroundColor = "rgb(1, 2, 3)";
    renderToString(<stories.Dark />);
    expect(document.documentElement).toHaveAttribute("data-theme", "consumer");
    expect(document.body.style.backgroundColor).toBe("rgb(1, 2, 3)");
  });
});
