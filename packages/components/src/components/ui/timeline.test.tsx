import * as React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {Timeline, TimelineContent, TimelineDot, TimelineItem} from "./timeline";

describe("Timeline", () => {
  it("preserves native list/listitem decoration, caller handlers and all actual refs", () => {
    const root = React.createRef<HTMLDivElement>();
    const item = React.createRef<HTMLDivElement>();
    const dot = React.createRef<HTMLDivElement>();
    const content = React.createRef<HTMLDivElement>();
    const onClick = vi.fn();
    render(
      <Timeline
        ref={root}
        aria-label='History'
        className='caller'>
        <TimelineItem
          ref={item}
          onClick={onClick}>
          <TimelineDot ref={dot} />
          <TimelineContent ref={content}>
            <button type='button'>Inspect event</button>
          </TimelineContent>
        </TimelineItem>
      </Timeline>,
    );
    expect(root.current).toBe(screen.getByRole("list", {name: "History"}));
    expect(root.current).toHaveClass("caller");
    expect(item.current).toBe(screen.getByRole("listitem"));
    expect(dot.current).toHaveAttribute("aria-hidden", "true");
    expect(content.current?.tagName).toBe("DIV");
    fireEvent.click(screen.getByRole("button", {name: "Inspect event"}));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it("renders timeline items", () => {
    render(
      <Timeline>
        <TimelineItem>
          <TimelineDot />
          <TimelineContent>Event 1</TimelineContent>
        </TimelineItem>
      </Timeline>,
    );

    expect(screen.getByText("Event 1")).toBeInTheDocument();
  });

  it("forwards ref on Timeline", () => {
    const ref = {current: null as HTMLDivElement | null};

    render(
      <Timeline ref={ref}>
        <TimelineItem>
          <TimelineContent>X</TimelineContent>
        </TimelineItem>
      </Timeline>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
