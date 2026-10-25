import {fireEvent, render, screen} from "@testing-library/react";
import {createRef} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {TableSkeleton as RootTableSkeleton} from "../../index";
import {TableSkeleton} from "./table-skeleton";
import styles from "./table-skeleton.module.css";
import {VisuallyHidden} from "./visually-hidden";

describe("TableSkeleton", () => {
  it("has the same identity at the actual package root", () => {
    expect(RootTableSkeleton).toBe(TableSkeleton);
  });

  it("renders the default number of rows and columns", () => {
    const {container} = render(<TableSkeleton />);

    expect(container.querySelectorAll(`.${styles.row}`)).toHaveLength(5);
    expect(container.querySelectorAll(`.${styles.headerCell}`)).toHaveLength(4);
    expect(container.querySelectorAll(`.${styles.cell}`)).toHaveLength(20);
  });

  it("renders custom row and column counts", () => {
    const {container} = render(
      <TableSkeleton
        rows={2}
        columns={3}
      />,
    );

    expect(container.querySelectorAll(`.${styles.row}`)).toHaveLength(2);
    expect(container.querySelectorAll(`.${styles.headerCell}`)).toHaveLength(3);
    expect(container.querySelectorAll(`.${styles.cell}`)).toHaveLength(6);
  });

  it("omits the optional header without changing body cells", () => {
    const {container} = render(
      <TableSkeleton
        rows={2}
        columns={3}
        showHeader={false}
      />,
    );

    expect(container.querySelectorAll(`.${styles.header}`)).toHaveLength(0);
    expect(container.querySelectorAll(`.${styles.headerCell}`)).toHaveLength(0);
    expect(container.querySelectorAll(`.${styles.cell}`)).toHaveLength(6);
  });

  it.each([
    {rows: 0, columns: 3, showHeader: true, headers: 3, cells: 0},
    {rows: 3, columns: 0, showHeader: true, headers: 0, cells: 0},
    {rows: 0, columns: 0, showHeader: true, headers: 0, cells: 0},
    {rows: 0, columns: 3, showHeader: false, headers: 0, cells: 0},
    {rows: 3, columns: 0, showHeader: false, headers: 0, cells: 0},
    {rows: 0, columns: 0, showHeader: false, headers: 0, cells: 0},
  ])("preserves valid zero axes: $rows rows, $columns columns, header=$showHeader", ({rows, columns, showHeader, headers, cells}) => {
    const {container} = render(
      <TableSkeleton
        rows={rows}
        columns={columns}
        showHeader={showHeader}
      />,
    );

    expect(container.querySelectorAll(`.${styles.row}`)).toHaveLength(rows);
    expect(container.querySelectorAll(`.${styles.headerCell}`)).toHaveLength(headers);
    expect(container.querySelectorAll(`.${styles.cell}`)).toHaveLength(cells);
    expect(container.querySelectorAll(`.${styles.header}`)).toHaveLength(showHeader ? 1 : 0);
  });

  it.each([-1, -0.5, 0.5, NaN, Infinity, -Infinity, 10_001])("rejects invalid rows %s even with zero columns", (rows) => {
    expect(() =>
      renderToStaticMarkup(
        <TableSkeleton
          rows={rows}
          columns={0}
        />,
      ),
    ).toThrow(RangeError);
    expect(() =>
      renderToStaticMarkup(
        <TableSkeleton
          rows={rows}
          columns={0}
        />,
      ),
    ).toThrow(/TableSkeleton.*rows.*10,000/);
  });

  it.each([-1, -0.5, 0.5, NaN, Infinity, -Infinity, 10_001])("rejects invalid columns %s even with zero rows", (columns) => {
    expect(() =>
      renderToStaticMarkup(
        <TableSkeleton
          rows={0}
          columns={columns}
        />,
      ),
    ).toThrow(RangeError);
    expect(() =>
      renderToStaticMarkup(
        <TableSkeleton
          rows={0}
          columns={columns}
        />,
      ),
    ).toThrow(/TableSkeleton.*columns.*10,000/);
  });

  it("rejects a body product above 10,000 before allocating cells", () => {
    expect(() =>
      renderToStaticMarkup(
        <TableSkeleton
          rows={101}
          columns={100}
          showHeader={false}
        />,
      ),
    ).toThrow(RangeError);
    expect(() =>
      renderToStaticMarkup(
        <TableSkeleton
          rows={101}
          columns={100}
          showHeader={false}
        />,
      ),
    ).toThrow(/TableSkeleton.*cells.*10,000/);
  });

  it("includes the visible header in the 10,000-cell limit", () => {
    expect(() =>
      renderToStaticMarkup(
        <TableSkeleton
          rows={100}
          columns={100}
        />,
      ),
    ).toThrow(RangeError);
    expect(() =>
      renderToStaticMarkup(
        <TableSkeleton
          rows={100}
          columns={100}
        />,
      ),
    ).toThrow(/TableSkeleton.*cells.*10,000/);
  });

  it.each([
    {rows: 99, columns: 100, showHeader: true},
    {rows: 100, columns: 100, showHeader: false},
    {rows: 10_000, columns: 0, showHeader: true},
    {rows: 0, columns: 10_000, showHeader: true},
    {rows: 0, columns: 10_000, showHeader: false},
  ])("accepts exact limits without a large test DOM: $rows rows, $columns columns, header=$showHeader", (props) => {
    expect(() => renderToStaticMarkup(<TableSkeleton {...props} />)).not.toThrow();
  });

  it("forwards its actual root ref, caller class and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    let clicks = 0;
    const {container} = render(
      <TableSkeleton
        ref={ref}
        id='table-loading'
        className='caller-table'
        title='Table placeholder'
        onClick={() => {
          clicks += 1;
        }}
      />,
    );

    expect(ref.current).toBe(container.firstElementChild);
    expect(container.querySelector(`.${styles.container}`)).toBe(ref.current);
    expect(ref.current).toHaveClass("caller-table");
    expect(ref.current).toHaveAttribute("id", "table-loading");
    expect(ref.current).toHaveAttribute("title", "Table placeholder");
    if (!ref.current) throw new Error("TableSkeleton root ref is missing");
    fireEvent.click(ref.current);
    expect(clicks).toBe(1);
  });

  it("keeps all cells decorative while a persistent caller-owned region announces loading, not a fake table", () => {
    const view = (loading: boolean): React.JSX.Element => (
      <>
        <VisuallyHidden role='status'>{loading ? "Loading records" : null}</VisuallyHidden>
        {loading ? (
          <TableSkeleton
            data-testid='skeleton'
            animated={false}
          />
        ) : (
          <p>Records ready</p>
        )}
      </>
    );
    const {container, rerender} = render(view(false));
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    rerender(view(true));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Loading records");
    expect(status).not.toHaveAttribute("aria-busy");
    expect(screen.getByTestId("skeleton")).not.toHaveAttribute("role");
    expect(screen.getByTestId("skeleton")).not.toContainElement(status);
    for (const role of ["table", "row", "cell", "columnheader"]) {
      expect(screen.queryByRole(role)).not.toBeInTheDocument();
    }
    const placeholders = container.querySelectorAll('[data-slot="skeleton"]');
    expect(placeholders).toHaveLength(24);
    for (const placeholder of placeholders) {
      expect(placeholder).toHaveAttribute("aria-hidden", "true");
      expect(placeholder).toHaveAttribute("data-animated", "false");
      expect(placeholder).not.toHaveAttribute("role");
    }
  });

  it("does not invent a loading announcement and keeps default Skeleton motion", () => {
    const {container} = render(<TableSkeleton />);

    expect(container.firstElementChild).not.toHaveAttribute("role");
    expect(container.firstElementChild).not.toHaveAttribute("aria-live");
    for (const placeholder of container.querySelectorAll('[data-slot="skeleton"]')) {
      expect(placeholder).toHaveAttribute("data-animated", "true");
    }
  });
});
