/**
 * @fileoverview Unit tests for FilterCardFrame.
 * @module app/domains/invoices/view-invoices/_components/filters/FilterCardFrame.test
 */

import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {FilterCardFrame} from "./FilterCardFrame";

describe("FilterCardFrame", () => {
  it("renders the dynamic hint icon with its label when dynamicHintLabel is provided", () => {
    render(
      <FilterCardFrame
        title='Title'
        active={false}
        activeValue={null}
        inactiveLabel='All'
        dynamicHintLabel='hint'>
        <span>body</span>
      </FilterCardFrame>,
    );

    expect(screen.getByLabelText("hint")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("omits the hint icon when dynamicHintLabel is absent", () => {
    render(
      <FilterCardFrame
        title='Title'
        active={false}
        activeValue={null}
        inactiveLabel='All'>
        <span>body</span>
      </FilterCardFrame>,
    );

    expect(screen.queryByLabelText("hint")).not.toBeInTheDocument();
  });

  it("shows the inactive label when there is no active value and the pill when there is", () => {
    const {rerender} = render(
      <FilterCardFrame
        title='Title'
        active={false}
        activeValue={null}
        inactiveLabel='All'>
        <span>body</span>
      </FilterCardFrame>,
    );
    expect(screen.getByText("All")).toBeInTheDocument();

    rerender(
      <FilterCardFrame
        title='Title'
        active
        activeValue='Selected'
        inactiveLabel='All'>
        <span>body</span>
      </FilterCardFrame>,
    );

    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.queryByText("All")).not.toBeInTheDocument();
  });
});
