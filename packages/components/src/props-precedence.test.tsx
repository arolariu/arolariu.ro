import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import {createRef} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
import {describe, expect, it, vi} from "vitest";

import {Attachment} from "./components/ui/attachment";
import {Avatar, AvatarFallback} from "./components/ui/avatar";
import avatarStyles from "./components/ui/avatar.module.css";
import {Command, CommandInput, CommandItem, CommandList} from "./components/ui/command";
import {FocusScope} from "./components/ui/focus-scope";
import {Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList} from "./components/ui/combobox";
import comboboxStyles from "./components/ui/combobox.module.css";
import {FireworksBackground} from "./components/ui/fireworks-background";
import fireworksStyles from "./components/ui/fireworks-background.module.css";
import {Table} from "./components/ui/table";
import tableStyles from "./components/ui/table.module.css";

describe("caller prop escape hatch", () => {
  it("places production JSX spreads after every preset attribute", () => {
    const directory = import.meta.dirname;
    const files = ts.sys.readDirectory(directory, [".tsx"], [], ["**/*"]).filter((file) => !/\.(?:test|spec|stories)\./u.test(file));
    const violations: string[] = [];
    const program = ts.createProgram(files, {noResolve: true, noLib: true, types: [], noEmit: true, jsx: ts.JsxEmit.ReactJSX});
    const checker = program.getTypeChecker();
    const isCallerBinding = (expression: ts.Expression, restOnly: boolean): boolean => {
      if (!ts.isIdentifier(expression)) return false;
      return Boolean(
        checker
          .getSymbolAtLocation(expression)
          ?.declarations?.some((declaration) => ts.isBindingElement(declaration) && (!restOnly || declaration.dotDotDotToken)),
      );
    };
    for (const file of files) {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Production module was not loaded: ${file}`);
      const visit = (node: ts.Node): void => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          let spread = false;
          for (const [index, attribute] of node.attributes.properties.entries()) {
            if (ts.isJsxSpreadAttribute(attribute)) spread = true;
            else if (spread) {
              const {line} = source.getLineAndCharacterOfPosition(attribute.getStart(source));
              violations.push(
                `${path.relative(directory, file)}:${line + 1} ${node.tagName.getText(source)}.${attribute.name.getText(source)}`,
              );
            }
            if (
              ts.isJsxSpreadAttribute(attribute)
              && isCallerBinding(attribute.expression, true)
              && node.attributes.properties
                .slice(index + 1)
                .some((later) => !ts.isJsxSpreadAttribute(later) || !isCallerBinding(later.expression, false))
            ) {
              const {line} = source.getLineAndCharacterOfPosition(attribute.getStart(source));
              violations.push(`${path.relative(directory, file)}:${line + 1} generated attributes must precede caller rest`);
            }
          }
        }
        if (ts.isPropertyAssignment(node) && node.name.getText(source) === "props" && ts.isObjectLiteralExpression(node.initializer)) {
          const properties = node.initializer.properties;
          for (const [index, property] of properties.entries()) {
            if (!ts.isSpreadAssignment(property) || !ts.isIdentifier(property.expression)) continue;
            if (isCallerBinding(property.expression, true) && index !== properties.length - 1) {
              const {line} = source.getLineAndCharacterOfPosition(property.getStart(source));
              violations.push(
                `${path.relative(directory, file)}:${line + 1} caller rest ${property.expression.text} must finish the render bag`,
              );
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(violations).toEqual([]);
  });

  it("lets native attachment metadata override presets", () => {
    render(
      <Attachment
        aria-label='Caller attachment'
        role='status'
        data-slot='caller-attachment'
        data-state='caller-state'
        tabIndex={2}
      />,
    );
    const element = screen.getByRole("status", {name: "Caller attachment"});
    expect(element).toHaveAttribute("data-slot", "caller-attachment");
    expect(element).toHaveAttribute("data-state", "caller-state");
    expect(element).toHaveAttribute("tabindex", "2");
  });

  it("keeps merged Avatar classes and refs while allowing slot overrides", () => {
    const ref = createRef<HTMLElement>();
    const {unmount} = render(
      <Avatar
        ref={ref}
        role='img'
        aria-label='Caller avatar'
        className='caller-avatar'
        data-slot='caller-avatar'>
        <AvatarFallback>AO</AvatarFallback>
      </Avatar>,
    );
    const element = screen.getByRole("img", {name: "Caller avatar"});
    expect(element).toHaveAttribute("data-slot", "caller-avatar");
    const rootClass = avatarStyles.root;
    if (!rootClass) throw new Error("Avatar root class is missing");
    expect(element).toHaveClass(rootClass, "caller-avatar");
    expect(ref.current).toBe(element);
    unmount();
    expect(ref.current).toBeNull();
  });

  it("honors native search role overrides without losing composed change behavior", async () => {
    const change = vi.fn();
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput
          role='searchbox'
          aria-label='Caller search'
          onChange={change}
        />
        <CommandList>
          <CommandItem value='alpha'>Alpha result</CommandItem>
          <CommandItem value='beta'>Beta result</CommandItem>
        </CommandList>
      </Command>,
    );
    const input = screen.getByRole("searchbox", {name: "Caller search"});
    expect(input).toHaveAttribute("type", "text");
    await user.type(input, "bet");
    expect(change).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("option", {name: "Alpha result"})).not.toBeInTheDocument();
    expect(screen.getByRole("option", {name: "Beta result"})).toBeVisible();
  });

  it("allows explicit undefined native scope attributes to clear presets", () => {
    render(
      <FocusScope
        contain={false}
        restoreFocus={false}
        role={undefined}
        tabIndex={undefined}
        data-testid='caller-scope'>
        Context
      </FocusScope>,
    );
    const scope = screen.getByTestId("caller-scope");
    expect(scope).not.toHaveAttribute("role");
    expect(scope).not.toHaveAttribute("tabindex");
  });

  it("keeps composed table viewport classes while honoring its native escape hatch", () => {
    render(
      <Table containerProps={{className: "caller-viewport", role: "region", "aria-label": "Caller viewport", tabIndex: -1}}>
        <tbody>
          <tr>
            <td>Value</td>
          </tr>
        </tbody>
      </Table>,
    );
    const viewport = screen.getByRole("region", {name: "Caller viewport"});
    const containerClass = tableStyles.container;
    if (!containerClass) throw new Error("Table container class is missing");
    expect(viewport).toHaveClass(containerClass, "caller-viewport");
    expect(viewport).toHaveAttribute("tabindex", "-1");
  });

  it("retains the default positioning class with a caller Combobox part class", async () => {
    render(
      <Combobox
        defaultOpen
        items={["One"]}>
        <ComboboxInput aria-label='Caller options' />
        <ComboboxContent positionerProps={{className: "caller-positioner", "data-testid": "caller-positioner"}}>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem
                key={item}
                value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    const positioner = await screen.findByTestId("caller-positioner");
    const positionerClass = comboboxStyles.positioner;
    if (!positionerClass) throw new Error("Combobox positioner class is missing");
    expect(positioner).toHaveClass(positionerClass, "caller-positioner");
  });

  it("preserves composed canvas classes in genuine server-rendered component output", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <FireworksBackground
        motionPaused
        canvasProps={{className: "caller-canvas", id: "caller-canvas"}}
      />,
    );
    const canvasClass = fireworksStyles.canvas;
    if (!canvasClass) throw new Error("Fireworks canvas class is missing");
    expect(container.querySelector("#caller-canvas")).toHaveClass(canvasClass, "caller-canvas");
  });

  it("retains observer callbacks and caller cancellation on owned Command activation", async () => {
    const observe = vi.fn();
    const select = vi.fn();
    const user = userEvent.setup();
    render(
      <Command>
        <CommandList>
          <CommandItem
            value='activate'
            onClick={observe}
            onSelect={select}>
            Activate
          </CommandItem>
          <CommandItem
            value='cancel'
            onClick={(event) => event.preventDefault()}
            onSelect={select}>
            Cancel
          </CommandItem>
        </CommandList>
      </Command>,
    );
    await user.click(screen.getByRole("option", {name: "Activate"}));
    expect(observe).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledExactlyOnceWith("activate");
    await user.click(screen.getByRole("option", {name: "Cancel"}));
    expect(select).toHaveBeenCalledTimes(1);
  });
});
