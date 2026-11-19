// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {afterEach, expect, it} from "vitest";
import DocFeedback from "./index";

const pagePath = "/docs/example";
const otherPath = "/docs/other";

afterEach(() => {
  localStorage.removeItem(`docfb-${pagePath}`);
  localStorage.removeItem(`docfb-${otherPath}`);
});

it("persists one feedback answer for that page only", () => {
  const firstView = render(<DocFeedback pagePath={pagePath} />);
  const answer = screen.getByRole("button", {name: "[no]"});

  fireEvent.click(answer);

  expect(localStorage.getItem("docfb-/docs/example")).toBe("no");
  expect(screen.getByText("// marked (no)")).toBeVisible();
  firstView.unmount();

  const revisit = render(<DocFeedback pagePath={pagePath} />);

  expect(screen.getByText("// marked (no)")).toBeVisible();
  expect(screen.queryByRole("button", {name: "[no]"})).not.toBeInTheDocument();
  revisit.unmount();

  render(<DocFeedback pagePath={otherPath} />);

  expect(screen.getByRole("button", {name: "[no]"})).toBeVisible();
  expect(localStorage.getItem("docfb-/docs/other")).toBeNull();
});
