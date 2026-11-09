import * as React from "react";

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "postcss";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it} from "vitest";

import {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "./table";
import styles from "./table.module.css";
import * as tableStories from "./table.stories";

type Theme = "light" | "dark";
type LinearRgb = readonly [number, number, number];
const tableCss = parse(readFileSync(join(import.meta.dirname, "table.module.css"), "utf8"));
const themeTokens: Record<Theme, Map<string, string>> = {light: new Map(), dark: new Map()};
parse(readFileSync(join(import.meta.dirname, "../../index.css"), "utf8")).walkRules((rule) => {
  if (rule.selector !== ":root" && !rule.selector.includes('[data-theme="dark"]')) return;
  const tokens = rule.selector === ":root" ? themeTokens.light : themeTokens.dark;
  rule.walkDecls((declaration) => {
    tokens.set(declaration.prop, declaration.value);
  });
});

function tokenRgb(theme: Theme, token: string): LinearRgb {
  const value = themeTokens[theme].get(token);
  const match = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/u.exec(value ?? "");
  if (!match) throw new Error(`Missing opaque ${theme} token ${token}: ${value}`);
  const lightness = Number(match[1]);
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (channel: number): number => Math.max(0, Math.min(1, channel));
  return [
    clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function luminance(rgb: LinearRgb): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

// color-mix with transparent preserves the other color and scales its alpha.
// Test both encoded-sRGB source-over and linear-light source-over models; browser
// gamut mapping and actual painted adjacent pixels remain a manual obligation.
function compositeTint(theme: Theme, expression: string, backdrop: LinearRgb, space: "srgb" | "linear"): LinearRgb {
  const match = /^color-mix\(in oklch, var\((--ac-[\w-]+)\), transparent ([\d.]+)%\)$/u.exec(expression);
  if (!match?.[1] || match[2] === undefined) throw new Error(`Unsupported authored tint: ${expression}`);
  const foreground = tokenRgb(theme, match[1]);
  const alpha = 1 - Number(match[2]) / 100;
  const encode = (channel: number): number => (channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055);
  const decode = (channel: number): number => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const blend = (front: number, back: number): number =>
    space === "linear" ? front * alpha + back * (1 - alpha) : decode(encode(front) * alpha + encode(back) * (1 - alpha));
  return [blend(foreground[0], backdrop[0]), blend(foreground[1], backdrop[1]), blend(foreground[2], backdrop[2])];
}

describe("Table", () => {
  it("preserves native keyboard-scroll focus and caller overrides without inventing a region or label", async () => {
    const user = userEvent.setup();
    const viewportRef = React.createRef<HTMLDivElement>();
    const {rerender} = render(
      <>
        <Table>
          <TableCaption>Native results</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Alice</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <button type='button'>Next control</button>
        <p id='scroll-help'>Scroll horizontally for more results.</p>
      </>,
    );
    const viewport = screen.getByRole("table", {name: "Native results"}).parentElement;
    expect(viewport?.tagName).toBe("DIV");
    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(viewport).not.toHaveAttribute("role");
    expect(viewport).not.toHaveAttribute("aria-label");
    expect(viewport).not.toHaveAttribute("aria-labelledby");
    await user.tab();
    expect(viewport).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", {name: "Next control"})).toHaveFocus();

    rerender(
      <>
        <Table
          containerProps={{
            ref: viewportRef,
            tabIndex: -1,
            id: "caller-viewport",
            className: "caller-scroll",
            "aria-describedby": "scroll-help",
          }}>
          <TableCaption>Native results</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Alice</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <button type='button'>Next control</button>
        <p id='scroll-help'>Scroll horizontally for more results.</p>
      </>,
    );
    expect(viewportRef.current).toBe(viewport);
    expect(viewport).toHaveAttribute("tabindex", "-1");
    expect(viewport).toHaveAttribute("id", "caller-viewport");
    expect(viewport).toHaveAttribute("aria-describedby", "scroll-help");
    expect(viewport).toHaveAccessibleDescription("Scroll horizontally for more results.");
    expect(viewport).toHaveClass("caller-scroll");
    expect(viewport).not.toHaveAttribute("role");
    expect(viewport).not.toHaveAttribute("aria-label");
  });

  it("review correction: the documented story names the default focusable viewport from its caption", async () => {
    const user = userEvent.setup();
    const {NamedScrollViewport} = composeStories(tableStories);
    render(<NamedScrollViewport />);
    const viewport = screen.getByRole("region", {name: "Stock by warehouse"});
    expect(viewport).toHaveAttribute("data-slot", "table-container");
    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(viewport).toContainElement(screen.getByRole("table", {name: "Stock by warehouse"}));
    await user.tab();
    expect(viewport).toHaveFocus();
  });

  describe.each(["light", "dark"] as const)("%s review correction", (theme) => {
    it.each([
      ["selected", "body"],
      ["row-expanded", "body"],
      ["descendant-expanded", "body"],
      ["selected", "footer"],
      ["row-expanded", "footer"],
      ["descendant-expanded", "footer"],
    ] as const)("contrasts the actual %s row outline against its composited %s tint", (kind, surface) => {
      const content = (
        <TableRow
          data-testid='contrast-row'
          data-state={kind === "selected" ? "selected" : undefined}
          aria-expanded={kind === "row-expanded" ? true : undefined}>
          <TableCell>
            <button
              type='button'
              aria-expanded={kind === "descendant-expanded" ? true : undefined}>
              Details
            </button>
          </TableCell>
        </TableRow>
      );
      render(<Table>{surface === "footer" ? <TableFooter>{content}</TableFooter> : <TableBody>{content}</TableBody>}</Table>);
      const row = screen.getByTestId("contrast-row");
      const declarations: Record<string, string> = {};
      let footerTint = "";
      tableCss.walkRules((rule) => {
        if (rule.parent?.type !== "root") return;
        if (rule.selector === ".footer")
          rule.walkDecls("background-color", (decl) => {
            footerTint = decl.value;
          });
        const selector = rule.selector.replaceAll(".row", `.${styles.row}`);
        if (rule.selector.includes('.row[data-state="selected"]') && row.matches(selector)) {
          rule.walkDecls((decl) => {
            declarations[decl.prop] = decl.value;
          });
        }
      });
      const outline = /^1px solid var\((--ac-[\w-]+)\)$/u.exec(declarations["outline"] ?? "");
      if (!outline?.[1]) throw new Error(`Missing matching token-backed row outline: ${declarations["outline"]}`);
      expect(declarations["outline-offset"]).toBe("-1px");
      const outlineLuminance = luminance(tokenRgb(theme, outline[1]));
      for (const space of ["srgb", "linear"] as const) {
        const page = tokenRgb(theme, "--ac-background");
        const backdrop = surface === "footer" ? compositeTint(theme, footerTint, page, space) : page;
        const background = declarations["background-color"];
        if (!background) throw new Error("Matching highlighted row has no authored background");
        for (const adjacent of [backdrop, compositeTint(theme, background, backdrop, space)]) {
          const adjacentLuminance = luminance(adjacent);
          const ratio = (Math.max(outlineLuminance, adjacentLuminance) + 0.05) / (Math.min(outlineLuminance, adjacentLuminance) + 0.05);
          expect(ratio, `${theme}/${kind}/${surface}/${space} outline contrast`).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });

  it("React 19 refresh: makes the scroll container keyboard reachable without moving the table ref", () => {
    const tableRef = React.createRef<HTMLTableElement>();
    const viewportRef = React.createRef<HTMLDivElement>();
    render(
      <Table
        ref={tableRef}
        containerProps={{ref: viewportRef, "aria-labelledby": "caption", role: "region"}}>
        <TableCaption id='caption'>Results</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope='col'>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableHead scope='row'>Alice</TableHead>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const viewport = screen.getByRole("region", {name: "Results"});
    expect(viewport).toHaveAttribute("tabindex", "0");
    viewport.focus();
    expect(viewport).toHaveFocus();
    expect(viewportRef.current).toBe(viewport);
    expect(tableRef.current).toBe(screen.getByRole("table"));
    expect(screen.getByRole("columnheader", {name: "Name"})).toHaveAttribute("scope", "col");
    expect(screen.getByRole("rowheader", {name: "Alice"})).toHaveAttribute("scope", "row");
  });

  it.each(["selected", "row-expanded", "descendant-expanded"] as const)(
    "matches only the authored %s highlight selector and drops it on false/removal",
    (kind) => {
      const selectors: string[] = [];
      parse(readFileSync(join(import.meta.dirname, "table.module.css"), "utf8")).walkRules((rule) => {
        if (rule.parent?.type === "root" && rule.selector.includes('.row[data-state="selected"]')) selectors.push(...rule.selectors);
      });
      expect(selectors).toEqual(['.row[data-state="selected"]', '.row[aria-expanded="true"]', '.row:has([aria-expanded="true"])']);
      const expected = selectors[["selected", "row-expanded", "descendant-expanded"].indexOf(kind)];
      const fixture = (active: boolean | undefined): React.JSX.Element => (
        <Table>
          <TableBody>
            <TableRow
              data-testid='highlight-row'
              data-state={kind === "selected" && active !== undefined ? (active ? "selected" : "idle") : undefined}
              aria-expanded={kind === "row-expanded" ? active : undefined}>
              <TableCell>
                <button
                  type='button'
                  aria-expanded={kind === "descendant-expanded" ? active : undefined}>
                  Details
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const {rerender} = render(fixture(true));
      const row = screen.getByTestId("highlight-row");
      const matching = (): string[] => {
        // Happy DOM caches :has matches across descendant attribute updates.
        // A fresh native clone queries the current DOM attributes, not that cache.
        const current = row.cloneNode(true);
        if (!(current instanceof HTMLElement)) throw new TypeError("Expected a cloned native row.");
        return selectors.filter((selector) => current.matches(selector.replaceAll(".row", `.${styles["row"]}`)));
      };
      expect(matching()).toEqual([expected]);
      rerender(fixture(false));
      if (kind === "descendant-expanded") expect(row.querySelector("button")).toHaveAttribute("aria-expanded", "false");
      expect(matching()).toEqual([]);
      rerender(fixture(undefined));
      if (kind === "descendant-expanded") expect(row.querySelector("button")).not.toHaveAttribute("aria-expanded");
      expect(matching()).toEqual([]);
    },
  );

  it("keeps native table attributes and refs on their actual nodes, including expandable row controls", () => {
    const table = React.createRef<HTMLTableElement>();
    const header = React.createRef<HTMLTableSectionElement>();
    const body = React.createRef<HTMLTableSectionElement>();
    const footer = React.createRef<HTMLTableSectionElement>();
    const row = React.createRef<HTMLTableRowElement>();
    const head = React.createRef<HTMLTableCellElement>();
    const cell = React.createRef<HTMLTableCellElement>();
    const caption = React.createRef<HTMLTableCaptionElement>();
    render(
      <Table
        ref={table}
        cellPadding={4}
        cellSpacing={0}
        aria-describedby='table-description'>
        <TableCaption
          ref={caption}
          id='table-description'>
          Library items
        </TableCaption>
        <TableHeader ref={header}>
          <TableRow>
            <TableHead
              ref={head}
              id='name'
              scope='col'
              abbr='Item'>
              Item name
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={body}>
          <TableRow
            ref={row}
            aria-expanded='true'
            data-state='selected'>
            <TableCell
              ref={cell}
              headers='name'
              colSpan={2}
              rowSpan={1}>
              <button
                type='button'
                aria-expanded='true'>
                Show details
              </button>
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFooter ref={footer}>
          <TableRow>
            <TableCell>Total: 1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(table.current).toHaveAttribute("cellpadding", "4");
    expect(table.current).toHaveAttribute("cellspacing", "0");
    expect(table.current?.parentElement).toHaveAttribute("data-slot", "table-container");
    expect(row.current).toHaveAttribute("data-slot", "table-row");
    expect(row.current).toHaveAttribute("aria-expanded", "true");
    expect(cell.current).toHaveAttribute("headers", "name");
    expect(cell.current).toHaveAttribute("colspan", "2");
    expect(head.current).toHaveAttribute("scope", "col");
    expect(head.current).toHaveAttribute("abbr", "Item");
    expect([
      table.current?.tagName,
      header.current?.tagName,
      body.current?.tagName,
      footer.current?.tagName,
      row.current?.tagName,
      head.current?.tagName,
      cell.current?.tagName,
      caption.current?.tagName,
    ]).toEqual(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "CAPTION"]);
  });
  function renderTable(className?: string): void {
    render(
      <Table className={className}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Invoice #1</TableCell>
            <TableCell>Paid</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderTable();

    // Assert
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders headers, rows, and cells correctly", () => {
    // Arrange
    renderTable();

    // Assert
    expect(screen.getByRole("columnheader", {name: "Name"})).toBeInTheDocument();
    expect(screen.getByRole("columnheader", {name: "Status"})).toBeInTheDocument();
    expect(screen.getByRole("cell", {name: "Invoice #1"})).toBeInTheDocument();
    expect(screen.getByRole("cell", {name: "Paid"})).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("merges the table className", () => {
    // Arrange
    renderTable("custom-table");

    // Assert
    expect(screen.getByRole("table")).toHaveClass("custom-table");
  });

  it("renders child cell content", () => {
    // Arrange
    renderTable();

    // Assert
    expect(screen.getByText("Invoice #1")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("renders TableFooter with content", () => {
    // Arrange
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Invoice #1</TableCell>
            <TableCell>$100</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter data-testid='table-footer'>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>$100</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    // Assert
    expect(screen.getByTestId("table-footer")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("renders TableCaption with content", () => {
    // Arrange
    render(
      <Table>
        <TableCaption data-testid='table-caption'>Recent invoices from the last 30 days</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Invoice #1</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    // Assert
    expect(screen.getByTestId("table-caption")).toBeInTheDocument();
    expect(screen.getByText("Recent invoices from the last 30 days")).toBeInTheDocument();
  });

  it("forwards ref to TableFooter", () => {
    // Arrange
    const ref = React.createRef<HTMLTableSectionElement>();

    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Content</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter ref={ref}>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    expect(ref.current?.tagName).toBe("TFOOT");
  });

  it("forwards ref to TableCaption", () => {
    // Arrange
    const ref = React.createRef<HTMLTableCaptionElement>();

    render(
      <Table>
        <TableCaption ref={ref}>Caption text</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLTableCaptionElement);
    expect(ref.current?.tagName).toBe("CAPTION");
  });
});
