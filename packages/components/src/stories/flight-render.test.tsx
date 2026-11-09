import {render, screen, waitFor} from "@testing-library/react";
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {Readable} from "node:stream";
import * as React from "react";
import {describe, expect, it} from "vitest";

import {Drawer, DrawerContent} from "../components/ui/drawer";
import {NavigationMenu} from "../components/ui/navigation-menu";

interface FlightModel {
  readonly render: React.ReactElement;
}

interface FlightClient {
  createFromNodeStream(
    stream: Readable,
    manifest: Readonly<{moduleMap: object; serverModuleMap: null; moduleLoading: null}>,
  ): PromiseLike<FlightModel>;
}

async function transportRender(): Promise<React.ReactElement> {
  const repository = resolve(import.meta.dirname, "../../../..");
  const require = createRequire(resolve(repository, "package.json"));
  const client: FlightClient = require("next/dist/compiled/react-server-dom-webpack/client.node");
  const server = `
    const React = require("react");
    const Flight = require("next/dist/compiled/react-server-dom-webpack/server.node");
    async function Panel() {
      return React.createElement("section", {"data-flight-render": ""},
        React.createElement("p", null, "Flight-owned content"));
    }
    Flight.renderToPipeableStream({render: React.createElement(Panel)}, {}).pipe(process.stdout);
  `;
  const wire = execFileSync(process.execPath, ["--conditions=react-server", "--input-type=commonjs", "--eval", server], {
    cwd: repository,
  });
  const model = await client.createFromNodeStream(Readable.from([wire]), {
    moduleMap: {},
    serverModuleMap: null,
    moduleLoading: null,
  });
  expect(React.isValidElement(model.render)).toBe(false);
  return model.render;
}

describe("real React 19 Flight render-prop transport", () => {
  it("retains navigation's automatic positioned viewport alongside wire-owned children", async () => {
    const renderElement = await transportRender();
    render(
      <NavigationMenu
        defaultValue='open'
        render={renderElement}
      />,
    );

    await screen.findByText("Flight-owned content");
    await waitFor(() => {
      expect(document.querySelector('[data-slot="navigation-menu-positioner"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="navigation-menu-viewport"]')).toBeInTheDocument();
    });
  });

  it("retains Drawer Content's swipe-exclusion anatomy around wire-owned children", async () => {
    const renderElement = await transportRender();
    render(
      <Drawer defaultOpen>
        <DrawerContent
          aria-label='Flight drawer'
          render={renderElement}
        />
      </Drawer>,
    );

    await screen.findByText("Flight-owned content");
    expect(document.querySelector("[data-drawer-content]")).toContainElement(screen.getByText("Flight-owned content"));
  });
});
