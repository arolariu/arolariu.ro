import {Progress as BaseProgress} from "@base-ui/react/progress";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Window} from "happy-dom";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import * as React from "react";
import {describe, expect, expectTypeOf, it} from "vitest";

import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
  type ProgressIndicatorProps,
  type ProgressIndicatorState,
  type ProgressLabelProps,
  type ProgressLabelState,
  type ProgressProps,
  type ProgressState,
  type ProgressTrackProps,
  type ProgressTrackState,
  type ProgressValueProps,
  type ProgressValueState,
} from "./progress";
import styles from "./progress.module.css";

describe("Progress", () => {
  it("preserves caller content in Progress", () => {
    render(
      <Progress value={50}>
        <span>Uploading invoice</span>
      </Progress>,
    );

    expect(screen.getByText("Uploading invoice")).toBeInTheDocument();
  });

  it("keeps an omitted value indeterminate", () => {
    render(<Progress aria-label='Pending upload' />);

    const progressbar = screen.getByRole("progressbar", {name: "Pending upload"});
    expect(progressbar).not.toHaveAttribute("aria-valuenow");
    expect(progressbar).toHaveAttribute("data-indeterminate");
  });

  it("preserves plain text children alongside the default track", () => {
    render(
      <Progress
        aria-label='Text content'
        value={25}>
        Uploading data
      </Progress>,
    );

    const root = screen.getByRole("progressbar", {name: "Text content"});
    expect(root).toHaveTextContent("Uploading data");
    expect(root.querySelectorAll('[data-slot="progress-track"]')).toHaveLength(1);
  });

  it("keeps root classes on the same element as its ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Progress
        ref={ref}
        aria-label='Root styling'
        className='custom-progress-root'
        value={50}
      />,
    );

    expect(ref.current).toHaveClass("custom-progress-root");
  });

  it("passes primitive status to a function render", () => {
    render(
      <Progress
        aria-label='Complete upload'
        value={100}
        render={(props, state) => (
          <div
            {...props}
            data-render-status={state?.status}
          />
        )}
      />,
    );

    expect(screen.getByRole("progressbar", {name: "Complete upload"})).toHaveAttribute("data-render-status", "complete");
  });

  it("renders without crashing", () => {
    // Arrange
    render(
      <Progress
        aria-label='Profile completion'
        value={25}
      />,
    );

    // Assert
    expect(screen.getByRole("progressbar", {name: "Profile completion"})).toBeInTheDocument();
  });

  it("forwards its ref to the progress root DOM element", () => {
    // Arrange
    const ref = React.createRef<HTMLDivElement>();

    render(
      <Progress
        ref={ref}
        aria-label='Forwarded progress'
        value={35}
      />,
    );

    // Assert
    expect(ref.current).toBe(screen.getByRole("progressbar", {name: "Forwarded progress"}));
  });

  it("does not apply root classes to the default track", () => {
    // Arrange
    const {container} = render(
      <Progress
        aria-label='Styled progress'
        value={45}
        className='custom-progress-root'
      />,
    );

    // Assert
    const progressbar = screen.getByRole("progressbar", {name: "Styled progress"});
    const track = container.querySelector('[data-slot="progress-track"]');
    expect(progressbar.classList).toContain(styles.root);
    expect(progressbar).toHaveClass("custom-progress-root");
    expect(track?.classList).toContain(styles.track);
    expect(track).not.toHaveClass("custom-progress-root");
  });

  it("updates its value when rerendered", () => {
    // Arrange
    const {rerender} = render(
      <Progress
        aria-label='Upload progress'
        value={10}
      />,
    );

    const progressbar = screen.getByRole("progressbar", {name: "Upload progress"});

    // Assert
    expect(progressbar).toHaveAttribute("aria-valuenow", "10");

    // Act
    rerender(
      <Progress
        aria-label='Upload progress'
        value={65}
      />,
    );

    // Assert
    expect(progressbar).toHaveAttribute("aria-valuenow", "65");
  });

  it("exposes accessible progressbar semantics", () => {
    // Arrange
    render(
      <Progress
        aria-label='Accessible progress'
        value={80}
      />,
    );

    // Assert
    const progressbar = screen.getByRole("progressbar", {name: "Accessible progress"});
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuenow", "80");
  });

  it.each([
    {value: 0, status: "progressing", width: "0%"},
    {value: 25, status: "progressing", width: "25%"},
    {value: 100, status: "complete", width: "100%"},
  ])("preserves $status status and indicator width for value $value", ({value, status, width}) => {
    const {container} = render(
      <Progress
        aria-label='Task completion'
        value={value}
      />,
    );

    const root = screen.getByRole("progressbar", {name: "Task completion"});
    const track = container.querySelector('[data-slot="progress-track"]');
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(root).toHaveAttribute("aria-valuenow", String(value));
    expect(root).toHaveAttribute(`data-${status}`);
    expect(track).toHaveAttribute(`data-${status}`);
    expect(indicator).toHaveAttribute(`data-${status}`);
    expect(indicator).toHaveStyle({width});
  });

  it.each([null, undefined])("renders indeterminate semantics and all part statuses for value %s", (value) => {
    const {container} = render(
      <Progress
        value={value}
        locale='en-US'>
        <ProgressLabel>Preparing upload</ProgressLabel>
        <ProgressValue data-testid='pending-value' />
      </Progress>,
    );

    const root = screen.getByRole("progressbar", {name: "Preparing upload"});
    expect(root).not.toHaveAttribute("aria-valuenow");
    expect(root).toHaveAttribute("aria-valuetext", "indeterminate progress");
    for (const part of container.querySelectorAll("[data-slot]")) {
      expect(part).toHaveAttribute("data-indeterminate");
    }
    expect(container.querySelector('[data-slot="progress-indicator"]')).not.toHaveAttribute("style");
    expect(screen.getByTestId("pending-value")).toBeEmptyDOMElement();
    expect(screen.getByTestId("pending-value")).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    {preference: "no-preference", value: null},
    {preference: "no-preference", value: undefined},
    {preference: "no-preference", value: 50},
    {preference: "reduce", value: null},
    {preference: "reduce", value: undefined},
    {preference: "reduce", value: 50},
  ])("honors the authored motion cascade for preference $preference and value $value", async ({preference, value}) => {
    const {container} = render(
      <Progress
        aria-label='Motion preference'
        value={value}
      />,
    );
    const renderedIndicator = container.querySelector('[data-slot="progress-indicator"]');
    if (!renderedIndicator) {
      throw new Error("Progress must render an indicator.");
    }

    const browser = new Window({settings: {device: {prefersReducedMotion: preference}}});
    try {
      const stylesheet = browser.document.createElement("style");
      stylesheet.textContent = readFileSync(join(import.meta.dirname, "progress.module.css"), "utf8");
      browser.document.head.append(stylesheet);
      browser.document.body.innerHTML = renderedIndicator.outerHTML;
      const indicator = browser.document.querySelector('[data-slot="progress-indicator"]');
      if (!indicator) {
        throw new Error("The cascade document must retain the rendered indicator.");
      }

      // Authored and CSS Module class names have identical specificity.
      indicator.classList.add("indicator");
      const computed = browser.getComputedStyle(indicator);
      expect(browser.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(preference === "reduce");
      if (preference === "reduce") {
        expect(computed.animation).toBe("none");
        expect(computed.transition).toBe("none");
      } else {
        expect(computed.transition).toBe("width 200ms ease");
        if (value !== 50) {
          expect(computed.animation).toBe("indeterminate 1.5s ease-in-out infinite");
        } else {
          expect(computed.animation).not.toContain("infinite");
        }
      }
      expect(computed.width).toBe("50%");
    } finally {
      await browser.happyDOM.close();
    }
  });

  it("normalizes a custom min/max range using primitive formatting and fill", () => {
    const {container} = render(
      <Progress
        min={25}
        max={125}
        value={75}
        locale='en-US'>
        <ProgressLabel>Transfer</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );

    const root = screen.getByRole("progressbar", {name: "Transfer"});
    expect(root).toHaveAttribute("aria-valuemin", "25");
    expect(root).toHaveAttribute("aria-valuemax", "125");
    expect(root).toHaveAttribute("aria-valuenow", "75");
    expect(root).toHaveAttribute("aria-valuetext", "50%");
    expect(screen.getByText("50%")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveStyle({width: "50%"});
  });

  it("updates controlled status and value without remounting the parts", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {rerender} = render(
      <Progress
        ref={ref}
        aria-label='Controlled progress'
        value={null}
      />,
    );
    const root = screen.getByRole("progressbar", {name: "Controlled progress"});

    for (const value of [50, 100, undefined]) {
      rerender(
        <Progress
          ref={ref}
          aria-label='Controlled progress'
          value={value}
        />,
      );
      expect(ref.current).toBe(root);
      expect(root).toHaveAttribute(value === undefined ? "data-indeterminate" : value === 100 ? "data-complete" : "data-progressing");
      if (value === undefined) {
        expect(root).not.toHaveAttribute("aria-valuenow");
      } else {
        expect(root).toHaveAttribute("aria-valuenow", String(value));
      }
    }
  });

  it("places ordinary caller children before the turnkey track", () => {
    const {container} = render(
      <Progress value={50}>
        <span>Uploading data</span>
        <ProgressLabel>File transfer</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );

    const root = screen.getByRole("progressbar", {name: "File transfer"});
    expect(root.children[0]).toBe(screen.getByText("Uploading data"));
    expect(root.children[1]).toBe(screen.getByText("File transfer"));
    expect(root.children[2]).toBe(container.querySelector('[data-slot="progress-value"]'));
    expect(root.children[3]).toBe(container.querySelector('[data-slot="progress-track"]'));
    expect(root.querySelectorAll('[data-slot="progress-track"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-slot="progress-indicator"]')).toHaveLength(1);
  });

  it("uses a caller-supplied track instead of adding a duplicate turnkey track", () => {
    render(
      <Progress value={40}>
        <ProgressLabel>Custom transfer</ProgressLabel>
        <ProgressTrack
          className='custom-track'
          data-testid='custom-track'>
          <ProgressIndicator
            className='custom-indicator'
            data-testid='custom-indicator'
          />
        </ProgressTrack>
      </Progress>,
    );

    const root = screen.getByRole("progressbar", {name: "Custom transfer"});
    expect(root.querySelectorAll('[data-slot="progress-track"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-slot="progress-indicator"]')).toHaveLength(1);
    expect(screen.getByTestId("custom-track").classList).toContain(styles.track);
    expect(screen.getByTestId("custom-track")).toHaveClass("custom-track");
    expect(screen.getByTestId("custom-indicator").classList).toContain(styles.indicator);
    expect(screen.getByTestId("custom-indicator")).toHaveClass("custom-indicator");
    expect(screen.getByTestId("custom-indicator")).toHaveStyle({width: "40%"});
  });

  it("recognizes composed tracks in nested fragments and arrays", () => {
    const children = [
      null,
      false,
      <React.Fragment key='parts'>
        <ProgressLabel>Fragment transfer</ProgressLabel>
        <>
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </>
      </React.Fragment>,
    ];
    render(<Progress value={30}>{children}</Progress>);

    const root = screen.getByRole("progressbar", {name: "Fragment transfer"});
    expect(root.querySelectorAll('[data-slot="progress-track"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-slot="progress-indicator"]')).toHaveLength(1);
  });

  it("recognizes a directly composed Base UI track", () => {
    render(
      <Progress
        aria-label='Primitive transfer'
        value={30}>
        <BaseProgress.Track data-testid='primitive-track'>
          <ProgressIndicator />
        </BaseProgress.Track>
      </Progress>,
    );

    const root = screen.getByRole("progressbar", {name: "Primitive transfer"});
    expect(screen.getByTestId("primitive-track")).toBeInTheDocument();
    expect(root.querySelector('[data-slot="progress-track"]')).not.toBeInTheDocument();
    expect(root.querySelectorAll('[data-slot="progress-indicator"]')).toHaveLength(1);
  });

  it("retains the default track for fragments containing only ordinary content", () => {
    render(
      <Progress value={15}>
        <>
          <ProgressLabel>Starting transfer</ProgressLabel>
          <span>Connecting</span>
        </>
      </Progress>,
    );

    expect(screen.getByRole("progressbar", {name: "Starting transfer"}).querySelectorAll('[data-slot="progress-track"]')).toHaveLength(1);
    expect(screen.getByText("Connecting")).toBeInTheDocument();
  });

  it("associates Label and formats Value without duplicating the accessible value", () => {
    render(
      <Progress
        value={0.625}
        max={1}
        locale='en-US'
        format={{style: "percent", maximumFractionDigits: 1}}
        getAriaValueText={(formattedValue, value) => `${formattedValue} transferred (${value})`}>
        <ProgressLabel id='transfer-label'>Transfer progress</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );

    const root = screen.getByRole("progressbar", {name: "Transfer progress"});
    expect(root).toHaveAttribute("aria-labelledby", "transfer-label");
    expect(root).toHaveAttribute("aria-valuetext", "62.5% transferred (0.625)");
    expect(screen.getByText("62.5%")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Transfer progress").classList).toContain(styles.label);
    expect(screen.getByText("62.5%").classList).toContain(styles.value);
  });

  it("passes formatted and raw values to Value children callbacks", () => {
    const {rerender} = render(
      <Progress
        value={45}
        locale='en-US'>
        <ProgressLabel>Transfer value</ProgressLabel>
        <ProgressValue>{(formattedValue, value) => `${formattedValue} (${value} units)`}</ProgressValue>
      </Progress>,
    );
    expect(screen.getByText("45% (45 units)")).toHaveAttribute("aria-hidden", "true");

    rerender(
      <Progress value={null}>
        <ProgressLabel>Transfer value</ProgressLabel>
        <ProgressValue>{(_formattedValue, value) => (value === null ? "Waiting for a total" : value)}</ProgressValue>
      </Progress>,
    );
    expect(screen.getByText("Waiting for a total")).toHaveAttribute("data-indeterminate");
  });

  it("forwards every part's ref to its own default DOM node", () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const trackRef = React.createRef<HTMLDivElement>();
    const indicatorRef = React.createRef<HTMLDivElement>();
    const labelRef = React.createRef<HTMLSpanElement>();
    const valueRef = React.createRef<HTMLSpanElement>();
    render(
      <Progress
        ref={rootRef}
        value={25}
        locale='en-US'>
        <ProgressLabel ref={labelRef}>Ref destinations</ProgressLabel>
        <ProgressValue ref={valueRef} />
        <ProgressTrack
          ref={trackRef}
          data-testid='ref-track'>
          <ProgressIndicator
            ref={indicatorRef}
            data-testid='ref-indicator'
          />
        </ProgressTrack>
      </Progress>,
    );

    expect(rootRef.current).toBe(screen.getByRole("progressbar", {name: "Ref destinations"}));
    expect(trackRef.current).toBe(screen.getByTestId("ref-track"));
    expect(indicatorRef.current).toBe(screen.getByTestId("ref-indicator"));
    expect(labelRef.current).toBe(screen.getByText("Ref destinations"));
    expect(valueRef.current).toBe(screen.getByText("25%"));
    expect(rootRef.current?.tagName).toBe("DIV");
    expect(trackRef.current?.tagName).toBe("DIV");
    expect(indicatorRef.current?.tagName).toBe("DIV");
    expect(labelRef.current?.tagName).toBe("SPAN");
    expect(valueRef.current?.tagName).toBe("SPAN");
  });

  it.each([null, 20, 100])("passes primitive status to every className and render callback for %s", (value) => {
    const status = value === null ? "indeterminate" : value === 100 ? "complete" : "progressing";
    render(
      <Progress
        value={value}
        className={(state) => `root-${state.status}`}
        render={(props, state) => (
          <div
            {...props}
            data-render-status={state.status}
          />
        )}>
        <ProgressLabel
          className={(state) => `label-${state.status}`}
          render={(props, state) => (
            <span
              {...props}
              data-render-status={state.status}
            />
          )}>
          Callback transfer
        </ProgressLabel>
        <ProgressValue
          data-testid='callback-value'
          className={(state) => `value-${state.status}`}
          render={(props, state) => (
            <span
              {...props}
              data-render-status={state.status}
            />
          )}
        />
        <ProgressTrack
          data-testid='callback-track'
          className={(state) => `track-${state.status}`}
          render={(props, state) => (
            <div
              {...props}
              data-render-status={state.status}
            />
          )}>
          <ProgressIndicator
            data-testid='callback-indicator'
            className={(state) => `indicator-${state.status}`}
            render={(props, state) => (
              <div
                {...props}
                data-render-status={state.status}
              />
            )}
          />
        </ProgressTrack>
      </Progress>,
    );

    const parts = [
      {element: screen.getByRole("progressbar", {name: "Callback transfer"}), part: "root"},
      {element: screen.getByText("Callback transfer"), part: "label"},
      {element: screen.getByTestId("callback-value"), part: "value"},
      {element: screen.getByTestId("callback-track"), part: "track"},
      {element: screen.getByTestId("callback-indicator"), part: "indicator"},
    ];
    for (const {element, part} of parts) {
      expect(element).toHaveClass(`${part}-${status}`);
      expect(element).toHaveAttribute("data-render-status", status);
      expect(element).toHaveAttribute(`data-${status}`);
    }
  });

  it("sets and clears callback refs for every part", () => {
    const nodes: {
      root: HTMLDivElement | null;
      track: HTMLDivElement | null;
      indicator: HTMLDivElement | null;
      label: HTMLSpanElement | null;
      value: HTMLSpanElement | null;
    } = {root: null, track: null, indicator: null, label: null, value: null};
    const {unmount} = render(
      <Progress
        value={50}
        locale='en-US'
        ref={(node) => {
          nodes.root = node;
        }}>
        <ProgressLabel
          ref={(node) => {
            nodes.label = node;
          }}>
          Callback refs
        </ProgressLabel>
        <ProgressValue
          ref={(node) => {
            nodes.value = node;
          }}
        />
        <ProgressTrack
          data-testid='callback-ref-track'
          ref={(node) => {
            nodes.track = node;
          }}>
          <ProgressIndicator
            data-testid='callback-ref-indicator'
            ref={(node) => {
              nodes.indicator = node;
            }}
          />
        </ProgressTrack>
      </Progress>,
    );

    expect(nodes.root).toBe(screen.getByRole("progressbar", {name: "Callback refs"}));
    expect(nodes.track).toBe(screen.getByTestId("callback-ref-track"));
    expect(nodes.indicator).toBe(screen.getByTestId("callback-ref-indicator"));
    expect(nodes.label).toBe(screen.getByText("Callback refs"));
    expect(nodes.value).toBe(screen.getByText("50%"));
    unmount();
    expect(nodes).toEqual({root: null, track: null, indicator: null, label: null, value: null});
  });

  it("preserves module classes when a class callback returns undefined", () => {
    render(
      <Progress
        aria-label='Optional classes'
        value={50}
        className={() => undefined}>
        <ProgressTrack
          data-testid='optional-track'
          className={() => undefined}>
          <ProgressIndicator
            data-testid='optional-indicator'
            className={() => undefined}
          />
        </ProgressTrack>
      </Progress>,
    );

    expect(screen.getByRole("progressbar", {name: "Optional classes"}).classList).toContain(styles.root);
    expect(screen.getByTestId("optional-track").classList).toContain(styles.track);
    expect(screen.getByTestId("optional-indicator").classList).toContain(styles.indicator);
  });

  it("merges composed element refs, classes, content, and cancelled handlers through Base UI", async () => {
    const user = userEvent.setup();
    const forwardedRef = React.createRef<HTMLDivElement>();
    const renderRef = React.createRef<HTMLDivElement>();
    const calls: string[] = [];
    render(
      <Progress
        ref={forwardedRef}
        value={50}
        className='wrapper-class'
        onClick={(event) => {
          calls.push(`wrapper:${event.defaultPrevented}`);
        }}
        render={
          <div
            ref={renderRef}
            className='render-class'
            onClick={(event) => {
              event.preventDefault();
              calls.push("render");
            }}
          />
        }>
        <ProgressLabel>Composed root</ProgressLabel>
        <span>Retained content</span>
      </Progress>,
    );

    const root = screen.getByRole("progressbar", {name: "Composed root"});
    expect(forwardedRef.current).toBe(root);
    expect(renderRef.current).toBe(root);
    expect(root.classList).toContain(styles.root);
    expect(root).toHaveClass("wrapper-class", "render-class");
    expect(screen.getByText("Retained content")).toBeInTheDocument();
    await user.click(root);
    expect(calls).toEqual(["render", "wrapper:true"]);
  });

  it("composes Track, Indicator, Label, and Value elements without losing children or refs", () => {
    const trackRef = React.createRef<HTMLDivElement>();
    const renderedTrackRef = React.createRef<HTMLDivElement>();
    const indicatorRef = React.createRef<HTMLDivElement>();
    const renderedIndicatorRef = React.createRef<HTMLDivElement>();
    const labelRef = React.createRef<HTMLSpanElement>();
    const renderedLabelRef = React.createRef<HTMLSpanElement>();
    const valueRef = React.createRef<HTMLSpanElement>();
    const renderedValueRef = React.createRef<HTMLSpanElement>();
    render(
      <Progress
        value={60}
        locale='en-US'>
        <ProgressLabel
          ref={labelRef}
          className='label-class'
          render={
            <span
              ref={renderedLabelRef}
              className='render-label'
            />
          }>
          Composed parts
        </ProgressLabel>
        <ProgressValue
          ref={valueRef}
          className='value-class'
          render={
            <span
              ref={renderedValueRef}
              className='render-value'
            />
          }
        />
        <ProgressTrack
          ref={trackRef}
          className='track-class'
          data-testid='composed-track'
          render={
            <div
              ref={renderedTrackRef}
              className='render-track'
            />
          }>
          <ProgressIndicator
            ref={indicatorRef}
            className='indicator-class'
            data-testid='composed-indicator'
            render={
              <div
                ref={renderedIndicatorRef}
                className='render-indicator'
              />
            }>
            Indicator content
          </ProgressIndicator>
        </ProgressTrack>
      </Progress>,
    );

    const parts = [
      {element: screen.getByTestId("composed-track"), ref: trackRef, renderRef: renderedTrackRef, part: "track"},
      {element: screen.getByTestId("composed-indicator"), ref: indicatorRef, renderRef: renderedIndicatorRef, part: "indicator"},
      {element: screen.getByText("Composed parts"), ref: labelRef, renderRef: renderedLabelRef, part: "label"},
      {element: screen.getByText("60%"), ref: valueRef, renderRef: renderedValueRef, part: "value"},
    ];
    for (const {element, ref, renderRef, part} of parts) {
      expect(ref.current).toBe(element);
      expect(renderRef.current).toBe(element);
      expect(element).toHaveClass(`${part}-class`, `render-${part}`);
    }
    expect(screen.getByText("Indicator content")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", {name: "Composed parts"}).querySelectorAll('[data-slot="progress-track"]')).toHaveLength(1);
  });

  it("exports primitive-derived Props and State with nullable optional root value", () => {
    expectTypeOf<ProgressProps["value"]>().toEqualTypeOf<number | null | undefined>();
    expectTypeOf<Progress.Props>().toEqualTypeOf<ProgressProps>();
    expectTypeOf<Progress.State>().toEqualTypeOf<ProgressState>();
    expectTypeOf<ProgressState>().toEqualTypeOf<BaseProgress.Root.State>();
    expectTypeOf<ProgressTrack.Props>().toEqualTypeOf<ProgressTrackProps>();
    expectTypeOf<ProgressTrackProps>().toEqualTypeOf<BaseProgress.Track.Props>();
    expectTypeOf<ProgressTrack.State>().toEqualTypeOf<ProgressTrackState>();
    expectTypeOf<ProgressTrackState>().toEqualTypeOf<BaseProgress.Track.State>();
    expectTypeOf<ProgressIndicator.Props>().toEqualTypeOf<ProgressIndicatorProps>();
    expectTypeOf<ProgressIndicatorProps>().toEqualTypeOf<BaseProgress.Indicator.Props>();
    expectTypeOf<ProgressIndicator.State>().toEqualTypeOf<ProgressIndicatorState>();
    expectTypeOf<ProgressIndicatorState>().toEqualTypeOf<BaseProgress.Indicator.State>();
    expectTypeOf<ProgressLabel.Props>().toEqualTypeOf<ProgressLabelProps>();
    expectTypeOf<ProgressLabelProps>().toEqualTypeOf<BaseProgress.Label.Props>();
    expectTypeOf<ProgressLabel.State>().toEqualTypeOf<ProgressLabelState>();
    expectTypeOf<ProgressLabelState>().toEqualTypeOf<BaseProgress.Label.State>();
    expectTypeOf<ProgressValue.Props>().toEqualTypeOf<ProgressValueProps>();
    expectTypeOf<ProgressValueProps>().toEqualTypeOf<BaseProgress.Value.Props>();
    expectTypeOf<ProgressValue.State>().toEqualTypeOf<ProgressValueState>();
    expectTypeOf<ProgressValueState>().toEqualTypeOf<BaseProgress.Value.State>();
  });
});
