import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {Presence} from "./Presence";

describe("Presence", () => {
  it("mounts and unmounts content as visibility changes", () => {
    const child = <span key='invoice'>Invoice detail</span>;
    const {rerender} = render(<Presence present={false}>{child}</Presence>);
    expect(screen.queryByText("Invoice detail")).not.toBeInTheDocument();

    rerender(<Presence present>{child}</Presence>);
    expect(screen.getByText("Invoice detail")).toBeInTheDocument();

    rerender(<Presence present={false}>{child}</Presence>);
    expect(screen.queryByText("Invoice detail")).not.toBeInTheDocument();
  });
});
