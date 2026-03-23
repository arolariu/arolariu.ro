import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Timeline, TimelineContent, TimelineDot, TimelineItem} from "./timeline";

describe("Timeline", () => {
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
