import {render} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {BackgroundBeams} from "./background-beams";
import {Badge} from "./badge";
import {DialogFooter, DialogHeader} from "./dialog";
import {DotBackground} from "./dot-background";
import {TypewriterText, TypewriterTextSmooth} from "./typewriter";

const typewriterWords = [{text: "Hello"}] as const;

describe("DOM wrapper ref forwarding", () => {
  it("forwards refs for div and svg wrappers", () => {
    // Arrange
    const badgeRef = {current: null as HTMLDivElement | null};
    const backgroundBeamsRef = {current: null as HTMLDivElement | null};
    const dialogHeaderRef = {current: null as HTMLDivElement | null};
    const dialogFooterRef = {current: null as HTMLDivElement | null};
    const dotBackgroundRef = {current: null as SVGSVGElement | null};

    // Act
    render(
      <>
        <Badge ref={badgeRef}>New</Badge>
        <BackgroundBeams ref={backgroundBeamsRef} />
        <DialogHeader ref={dialogHeaderRef}>Header</DialogHeader>
        <DialogFooter ref={dialogFooterRef}>Footer</DialogFooter>
        <DotBackground ref={dotBackgroundRef} />
      </>,
    );

    // Assert
    expect(badgeRef.current).toBeInstanceOf(HTMLDivElement);
    expect(backgroundBeamsRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dialogHeaderRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dialogFooterRef.current).toBeInstanceOf(HTMLDivElement);
    expect(dotBackgroundRef.current).toBeInstanceOf(SVGSVGElement);
  });

  it("forwards refs for typewriter variants", () => {
    // Arrange
    const typewriterRef = {current: null as HTMLDivElement | null};
    const smoothTypewriterRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <>
        <TypewriterText
          ref={typewriterRef}
          words={typewriterWords}
        />
        <TypewriterTextSmooth
          ref={smoothTypewriterRef}
          words={typewriterWords}
        />
      </>,
    );

    // Assert
    expect(typewriterRef.current).toBeInstanceOf(HTMLDivElement);
    expect(smoothTypewriterRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
