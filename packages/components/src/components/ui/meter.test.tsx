import {render, screen} from "@testing-library/react";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it, vi} from "vitest";

import {Meter, MeterIndicator, MeterLabel, MeterTrack} from "./meter";
import * as stories from "./meter.stories";

const {WithLabel} = composeStories(stories);

describe("Meter", () => {
  it.each(["root", "track", "indicator", "label"])("supplies owning props and the real empty Meter state to %s", (part) => {
    render(
      <Meter
        value={70}
        className={(state) => `root-state-${Object.keys(state).length}`}
        render={(props, state) => (
          <div
            {...props}
            data-testid='root'
            data-render-role={props.role}
            data-state-keys={Object.keys(state).length}
          />
        )}>
        <MeterLabel
          className={(state) => `label-state-${Object.keys(state).length}`}
          render={(props, state) => (
            <span
              {...props}
              data-testid='label'
              data-render-role={props.role}
              data-state-keys={Object.keys(state).length}
            />
          )}>
          Storage usage
        </MeterLabel>
        <MeterTrack
          className={(state) => `track-state-${Object.keys(state).length}`}
          render={(props, state) => (
            <div
              {...props}
              data-testid='track'
              data-has-children={String(Boolean(props.children))}
              data-state-keys={Object.keys(state).length}
            />
          )}>
          <MeterIndicator
            className={(state) => `indicator-state-${Object.keys(state).length}`}
            render={(props, state) => (
              <div
                {...props}
                data-testid='indicator'
                data-render-width={props.style?.width}
                data-state-keys={Object.keys(state).length}
              />
            )}
          />
        </MeterTrack>
      </Meter>,
    );

    const element = screen.getByTestId(part);
    if (part === "root") expect(element).toHaveAttribute("data-render-role", "meter");
    if (part === "label") expect(element).toHaveAttribute("data-render-role", "presentation");
    if (part === "track") expect(element).toHaveAttribute("data-has-children", "true");
    if (part === "indicator") expect(element).toHaveAttribute("data-render-width", "70%");
    expect(element).toHaveAttribute("data-state-keys", "0");
    expect(element).toHaveClass(`${part}-state-0`);
  });

  it.each(["element", "callback"] as const)("preserves every %s-rendered part's children, classes, DOM refs and ref cleanup", (mode) => {
    const attached: HTMLElement[] = [];
    const cleaned = vi.fn<(node: HTMLElement) => void>();
    const renderCleaned = vi.fn<(node: HTMLElement) => void>();
    const ref = (node: HTMLElement | null): (() => void) | undefined => {
      if (!node) return undefined;
      attached.push(node);
      return () => cleaned(node);
    };
    const renderRef = (node: HTMLElement | null): (() => void) | undefined => (node ? () => renderCleaned(node) : undefined);
    const {unmount} = render(
      <Meter
        ref={ref}
        value={40}
        className='root-custom'
        render={
          mode === "element" ? (
            <div
              ref={renderRef}
              className='root-render'
            />
          ) : (
            (props) => <div {...props} />
          )
        }>
        <MeterLabel
          ref={ref}
          className='label-custom'
          render={
            mode === "element" ? (
              <span
                ref={renderRef}
                className='label-render'>
                Rendered label
              </span>
            ) : (
              (props) => <span {...props} />
            )
          }>
          Wrapper label
        </MeterLabel>
        <MeterTrack
          ref={ref}
          data-testid='track'
          className='track-custom'
          render={
            mode === "element" ? (
              <div
                ref={renderRef}
                className='track-render'
              />
            ) : (
              (props) => <div {...props} />
            )
          }>
          <MeterIndicator
            ref={ref}
            data-testid='indicator'
            className='indicator-custom'
            render={
              mode === "element" ? (
                <div
                  ref={renderRef}
                  className='indicator-render'
                />
              ) : (
                (props) => <div {...props} />
              )
            }>
            Indicator content
          </MeterIndicator>
        </MeterTrack>
      </Meter>,
    );
    const label = screen.getByText(mode === "element" ? "Rendered label" : "Wrapper label");
    const root = screen.getByRole("meter", {name: label.textContent ?? ""});
    const parts = {root, label, track: screen.getByTestId("track"), indicator: screen.getByTestId("indicator")};
    for (const [part, node] of Object.entries(parts)) {
      expect(attached).toContain(node);
      expect(node).toHaveClass(`${part}-custom`);
      if (mode === "element") expect(node).toHaveClass(`${part}-render`);
    }
    expect(parts.track).toContainElement(parts.indicator);
    expect(parts.indicator).toHaveTextContent("Indicator content");
    expect(parts.indicator).toHaveStyle({width: "40%"});

    unmount();
    for (const node of Object.values(parts)) {
      expect(cleaned).toHaveBeenCalledWith(node);
      if (mode === "element") expect(renderCleaned).toHaveBeenCalledWith(node);
    }
    expect(cleaned).toHaveBeenCalledTimes(4);
    expect(renderCleaned).toHaveBeenCalledTimes(mode === "element" ? 4 : 0);
  });

  it("updates controlled value, bounds, label association and localized accessible text", () => {
    const getValueText = (formatted: string, value: number): string => `${formatted} (${value})`;
    const fixture = (value: number): React.ReactElement => (
      <Meter
        value={value}
        min={10}
        max={110}
        locale='de-DE'
        format={{maximumFractionDigits: 1}}
        getAriaValueText={getValueText}>
        <MeterLabel>Capacity</MeterLabel>
        <MeterTrack>
          <MeterIndicator data-testid='indicator' />
        </MeterTrack>
      </Meter>
    );
    const {rerender} = render(fixture(35.5));
    const root = screen.getByRole("meter", {name: "Capacity"});
    expect(root).toHaveAttribute("aria-valuemin", "10");
    expect(root).toHaveAttribute("aria-valuemax", "110");
    expect(root).toHaveAttribute("aria-valuenow", "35.5");
    expect(root).toHaveAttribute("aria-valuetext", "35,5 (35.5)");
    expect(root).toHaveAttribute("aria-labelledby", screen.getByText("Capacity").id);
    expect(screen.getByTestId("indicator")).toHaveStyle({width: "25.5%"});

    rerender(fixture(90));
    expect(root).toHaveAttribute("aria-valuenow", "90");
    expect(root).toHaveAttribute("aria-valuetext", "90 (90)");
    expect(screen.getByTestId("indicator")).toHaveStyle({width: "80%"});
  });

  it("renders the WithLabel story with its label inside the owning root", () => {
    const {container} = render(<WithLabel />);
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-meter-storyContainer");
    expect(screen.getByRole("meter", {name: "CPU Usage"})).toHaveAttribute("aria-valuenow", "65");
  });

  function renderMeter(className?: string): void {
    render(
      <Meter
        aria-label='Storage usage'
        className={className}
        max={100}
        min={0}
        value={70}>
        <MeterLabel>Storage usage</MeterLabel>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toBeInTheDocument();
  });

  it("exposes the current value", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toHaveAttribute("aria-valuenow", "70");
  });

  it("merges the root className", () => {
    // Arrange
    renderMeter("custom-meter");

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toHaveClass("custom-meter");
  });

  it("renders label children", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByText("Storage usage")).toBeInTheDocument();
  });
});
