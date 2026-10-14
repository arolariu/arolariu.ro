import fs from "node:fs";
import {execFileSync} from "node:child_process";
import path from "node:path";
import {parse} from "postcss";
import selectorParser from "postcss-selector-parser";
import * as Recharts from "recharts";
import * as ReactHookForm from "react-hook-form";
import ts from "typescript";
import {describe, expect, expectTypeOf, it} from "vitest";
import {AsyncBoundary, type AsyncBoundaryProps as LocalAsyncBoundaryProps} from "./components/ui/async-boundary";
import {CardSkeleton, type CardSkeletonProps as LocalCardSkeletonProps} from "./components/ui/card-skeleton";
import {ErrorBoundary, type ErrorBoundaryProps as LocalErrorBoundaryProps} from "./components/ui/error-boundary";
import {FocusScope, type FocusScopeProps as LocalFocusScopeProps} from "./components/ui/focus-scope";
import {FormSkeleton, type FormSkeletonProps as LocalFormSkeletonProps} from "./components/ui/form-skeleton";
import {ListSkeleton, type ListSkeletonProps as LocalListSkeletonProps} from "./components/ui/list-skeleton";
import {LoadingOverlay, type LoadingOverlayProps as LocalLoadingOverlayProps} from "./components/ui/loading-overlay";
import {TableSkeleton, type TableSkeletonProps as LocalTableSkeletonProps} from "./components/ui/table-skeleton";
import * as exports from "./index";
import type {
  AsyncBoundaryProps,
  CardSkeletonProps,
  ErrorBoundaryProps,
  FocusScopeProps,
  FormSkeletonProps,
  ListSkeletonProps,
  LoadingOverlayProps,
  TableSkeletonProps,
} from "./index";

const supportedComponentModules = [
  "accordion",
  "alert-dialog",
  "alert",
  "aspect-ratio",
  "async-boundary",
  "attachment",
  "avatar",
  "background-beams",
  "badge",
  "breadcrumb",
  "bubble-background",
  "bubble",
  "button-group",
  "button",
  "calendar",
  "card-skeleton",
  "card",
  "carousel",
  "chart",
  "checkbox-group",
  "checkbox",
  "collapsible",
  "combobox",
  "command",
  "context-menu",
  "copy-button",
  "counting-number",
  "dialog",
  "direction",
  "dot-background",
  "drawer",
  "dropdown-menu",
  "dropdrawer",
  "empty",
  "error-boundary",
  "field",
  "fireworks-background",
  "flip-button",
  "focus-scope",
  "form-skeleton",
  "form",
  "gradient-background",
  "gradient-text",
  "highlight-text",
  "hole-background",
  "hover-card",
  "input-group",
  "input-otp",
  "input",
  "item",
  "kbd",
  "label",
  "list-skeleton",
  "loading-overlay",
  "marker",
  "menubar",
  "message",
  "meter",
  "native-select",
  "navigation-menu",
  "number-field",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "ripple-button",
  "scratcher",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "spinner",
  "stepper",
  "switch",
  "table-skeleton",
  "table",
  "tabs",
  "textarea",
  "timeline",
  "toast",
  "toggle-group",
  "toggle",
  "toolbar",
  "tooltip",
  "typewriter",
  "visually-hidden",
] as const;

const supportedHookModules = [
  "useAnnounce",
  "useBreakpoint",
  "useClipboard",
  "useColorScheme",
  "useControllableState",
  "useDebounce",
  "useEventCallback",
  "useFocusManager",
  "useFocusVisible",
  "useId",
  "useIntersectionObserver",
  "useInterval",
  "useIsMobile",
  "useLocalStorage",
  "useMediaQuery",
  "useMergedRefs",
  "useOnClickOutside",
  "usePrefersContrast",
  "usePrevious",
  "useReducedMotion",
  "useThrottle",
  "useTimeout",
  "useWindowSize",
] as const;

const rootRuntime: Readonly<Record<string, unknown>> = exports;
const retainedChartAliases = [
  "AreaChart",
  "BarChart",
  "ComposedChart",
  "FunnelChart",
  "LineChart",
  "PieChart",
  "RadarChart",
  "RadialBarChart",
  "ScatterChart",
  "Sankey",
  "SunburstChart",
  "Treemap",
  "Area",
  "Bar",
  "BarStack",
  "Funnel",
  "Line",
  "Pie",
  "Radar",
  "RadialBar",
  "Scatter",
  "CartesianGrid",
  "PolarAngleAxis",
  "PolarGrid",
  "PolarRadiusAxis",
  "XAxis",
  "YAxis",
  "ZAxis",
  "Brush",
  "ErrorBar",
  "RechartsLabel",
  "LabelList",
  "ReferenceArea",
  "ReferenceDot",
  "ReferenceLine",
  "ResponsiveContainer",
  "Customized",
  "Cross",
  "Curve",
  "Dot",
  "Polygon",
  "Rectangle",
  "Sector",
  "Symbols",
  "Trapezoid",
  "ZIndexLayer",
  "DefaultZIndexes",
  "useChartWidth",
  "useChartHeight",
  "useOffset",
  "usePlotArea",
  "useMargin",
  "useIsTooltipActive",
  "useActiveTooltipCoordinate",
  "useActiveTooltipDataPoints",
  "useActiveTooltipLabel",
  "useXAxisDomain",
  "useYAxisDomain",
] as const;
const retainedFormTypes = [
  "Control",
  "ControllerFieldState",
  "ControllerProps",
  "ControllerRenderProps",
  "DefaultValues",
  "RHFFieldError",
  "FieldErrors",
  "FieldPath",
  "FieldValues",
  "Path",
  "RegisterOptions",
  "Resolver",
  "SubmitHandler",
  "UseControllerReturn",
  "UseFieldArrayReturn",
  "UseFormReturn",
] as const;

function assertCanonicalDeclarations(checker: ts.TypeChecker, symbols: ReadonlyMap<string, ts.Symbol>): void {
  const getType = (name: string): ts.Type => {
    const symbol = symbols.get(name);
    if (!symbol) throw new Error(`Missing canonical declaration: ${name}`);
    return checker.getDeclaredTypeOfSymbol(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
  };
  for (const [name, removed] of [
    ["ButtonProps", ["asChild"]],
    ["BreadcrumbProps", ["separator"]],
    ["BreadcrumbLinkProps", ["asChild"]],
    ["ItemProps", ["asChild"]],
    ["AccordionProps", ["type", "orientation", "loopFocus"]],
    ["TooltipProps", ["delayDuration"]],
    ["TooltipProviderProps", ["delayDuration"]],
    ["TooltipTriggerProps", ["asChild"]],
    ["ContextMenuContentProps", ["positionMethod"]],
    ["DropdownMenuTriggerProps", ["asChild"]],
    ["DropDrawerProps", ["handle"]],
    ["DropDrawerTriggerProps", ["handle"]],
    ["DialogTriggerProps", ["asChild"]],
    ["AlertDialogTriggerProps", ["asChild"]],
    ["DrawerHeaderProps", ["asChild"]],
    ["SheetHeaderProps", ["asChild"]],
    ["PopoverTriggerProps", ["asChild"]],
    ["SidebarMenuButtonProps", ["asChild"]],
    ["SeparatorProps", ["decorative"]],
    ["ChartLegendContentProps", ["align", "onMouseOver"]],
  ] as const) {
    for (const member of removed) expect(checker.getPropertyOfType(getType(name), member), `${name}.${member}`).toBeUndefined();
  }
  const direction = getType("FlipDirection");
  expect(direction.isUnion()).toBe(true);
  if (direction.isUnion()) {
    expect(direction.types.some((type) => type.isStringLiteral() && type.value === "righ")).toBe(false);
  }
  for (const removed of [
    "AccordionSingleProps",
    "AccordionMultipleProps",
    "AccordionArrayProps",
    "DeprecatedFlipDirection",
    "LegacyToastApi",
    "LegacyToasterProps",
    "LegacyCommandDialogProps",
    "LegacyAlertDialogActionProps",
    "NavigationMenuViewportProps",
    "NavigationMenuIndicatorProps",
    "PopoverAnchorProps",
  ]) {
    expect(symbols.has(removed), removed).toBe(false);
  }
}

describe("complete supported public surface", () => {
  it("does not expose removed compatibility components or deprecated utilities", () => {
    for (const name of [
      "LegacyAlertDialogAction",
      "LegacyCommandDialog",
      "LegacyToaster",
      "legacyToast",
      "Cell",
      "NavigationMenuViewport",
      "NavigationMenuIndicator",
      "PopoverAnchor",
      "hexToHsl",
      "hslToHex",
      "isValidHexColor",
      "getComplementaryColor",
      "adjustLightness",
      "parseHslString",
    ]) {
      expect(rootRuntime, name).not.toHaveProperty(name);
    }
  });

  it("reconciles the 3.0 workspace while preserving the website's separate published 2.4 artifact", () => {
    const repositoryDirectory = path.resolve(import.meta.dirname, "../../..");
    const readManifest = (relativePath: string) => JSON.parse(fs.readFileSync(path.join(repositoryDirectory, relativePath), "utf8"));
    const root = readManifest("package.json");
    const lock = readManifest("package-lock.json");
    const component = readManifest("packages/components/package.json");
    const website = readManifest("sites/arolariu.ro/package.json");
    const workspaceEntry = lock.packages["packages/components"];
    const publishedEntry = lock.packages["sites/arolariu.ro/node_modules/@arolariu/components"];
    const tarball = "https://registry.npmjs.org/@arolariu/components/-/components-2.4.0.tgz";

    expect(root.devDependencies["@arolariu/components"]).toBe("3.0.0");
    expect(root.devDependencies["@base-ui/react"]).toBe("1.9.0");
    expect(lock.packages[""].devDependencies).toEqual(root.devDependencies);
    expect(workspaceEntry.version).toBe(component.version);
    expect(workspaceEntry.dependencies).toEqual(component.dependencies);
    expect(workspaceEntry.devDependencies).toEqual(component.devDependencies);
    expect(workspaceEntry.peerDependencies).toEqual(component.peerDependencies);
    expect(lock.packages["node_modules/@arolariu/components"]).toEqual({resolved: "packages/components", link: true});
    expect(website.dependencies["@arolariu/components"]).toBe(tarball);
    expect(lock.packages["sites/arolariu.ro"].dependencies["@arolariu/components"]).toBe(tarball);
    expect(publishedEntry.version).toBe("2.4.0");
    expect(publishedEntry.resolved).toBe(tarball);
    expect(publishedEntry.integrity).toBe(
      "sha512-oAe3DaCDjQ/ETjgOFsfNXIU7tsYmKlVPxKh0BDKmHqVaiA8ldNER31lM9CH0JJKVCXGvLQtXK35OnilYyCPRdg==",
    );
    expect(publishedEntry.link).toBeUndefined();
    const workspaceDirectory = fs.realpathSync(path.join(repositoryDirectory, "node_modules", "@arolariu", "components"));
    const publishedDirectory = fs.realpathSync(
      path.join(repositoryDirectory, "sites", "arolariu.ro", "node_modules", "@arolariu", "components"),
    );
    expect(workspaceDirectory).toBe(fs.realpathSync(path.join(repositoryDirectory, "packages", "components")));
    expect(publishedDirectory).not.toBe(workspaceDirectory);
    expect(JSON.parse(fs.readFileSync(path.join(publishedDirectory, "package.json"), "utf8")).version).toBe("2.4.0");
  });

  it.each(supportedComponentModules)("preserves every runtime export from the real %s module", async (name) => {
    const module: Record<string, unknown> = await import(`./components/ui/${name}.tsx`);
    for (const [exportName, value] of Object.entries(module)) {
      expect(rootRuntime[exportName], `${name}.${exportName}`).toBe(value);
    }
  });

  it.each(supportedHookModules)("preserves every runtime export from the real %s hook", async (name) => {
    const module: Record<string, unknown> = await import(`./hooks/${name}.tsx`);
    for (const [exportName, value] of Object.entries(module)) {
      expect(rootRuntime[exportName], `${name}.${exportName}`).toBe(value);
    }
  });

  it("preserves every named public type and merged namespace without wildcard ambiguity", () => {
    const packageDirectory = path.resolve(import.meta.dirname, "..");
    const configPath = path.join(packageDirectory, "tsconfig.json");
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    expect(config.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, packageDirectory);
    const files = [
      ...supportedComponentModules.map((name) => path.join(import.meta.dirname, "components", "ui", `${name}.tsx`)),
      ...supportedHookModules.map((name) => path.join(import.meta.dirname, "hooks", `${name}.tsx`)),
      path.join(import.meta.dirname, "lib", "utilities.ts"),
      path.join(import.meta.dirname, "lib", "color-conversion-utilities.ts"),
      path.join(import.meta.dirname, "index.ts"),
    ];
    const program = ts.createProgram(files, {...parsed.options, noEmit: true, strict: true, strictNullChecks: true});
    const checker = program.getTypeChecker();
    const rootFile = program.getSourceFile(path.join(import.meta.dirname, "index.ts"));
    if (!rootFile) throw new Error("The real package root was not loaded.");
    const rootSymbol = checker.getSymbolAtLocation(rootFile);
    if (!rootSymbol) throw new Error("The real package root has no module symbol.");
    const rootExports = new Map(checker.getExportsOfModule(rootSymbol).map((symbol) => [symbol.name, symbol]));
    assertCanonicalDeclarations(checker, rootExports);
    for (const name of retainedFormTypes) expect(rootExports.has(name), name).toBe(true);
    const missing: string[] = [];
    for (const file of files.slice(0, -1)) {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Public source was not loaded: ${file}`);
      const symbol = checker.getSymbolAtLocation(source);
      if (!symbol) throw new Error(`Public source has no module symbol: ${file}`);
      for (const sourceExport of checker.getExportsOfModule(symbol)) {
        const rootName = path.basename(file) === "form.tsx" && sourceExport.name === "FieldError" ? "RHFFieldError" : sourceExport.name;
        const rootExport = rootExports.get(rootName);
        if (!rootExport) {
          missing.push(`${path.basename(file)}:${rootName}`);
          continue;
        }
        const sourceTarget = sourceExport.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sourceExport) : sourceExport;
        const rootTarget = rootExport.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(rootExport) : rootExport;
        expect(rootTarget, `${path.basename(file)}:${rootName} must retain its original type/namespace`).toBe(sourceTarget);
      }
    }
    expect(missing).toEqual([]);
  }, 30000);

  it("retains non-deprecated Recharts identities without colliding with the native Label", () => {
    const dependency: Readonly<Record<string, unknown>> = Recharts;
    for (const name of retainedChartAliases) {
      expect(rootRuntime[name], name).toBe(dependency[name === "RechartsLabel" ? "Label" : name]);
    }
    expect(exports.ChartLegend).toBe(Recharts.Legend);
    expect(exports.ChartTooltip).toBe(Recharts.Tooltip);
    expect(exports.Label).not.toBe(Recharts.Label);
  });

  it("retains RHF identity rather than wrapping its provider, controller or hooks", () => {
    expect(exports.Form).toBe(ReactHookForm.FormProvider);
    expect(exports.Controller).toBe(ReactHookForm.Controller);
    for (const name of ["useController", "useFieldArray", "useForm", "useFormContext", "useFormState", "useWatch"] as const) {
      expect(exports[name]).toBe(ReactHookForm[name]);
    }
  });

  it("does not expose private helpers or unselected optional engines at the root", () => {
    for (const name of ["useVisualEffects", "useVisualEffectPolicy", "_visualEffects", "SonnerToaster", "Headless", "Cmdk"]) {
      expect(exports).not.toHaveProperty(name);
    }
    expect(Object.keys(exports).some((name) => name.startsWith("_"))).toBe(false);
  });

  it("ships the migration guide and preserves the approved runtime peer contract", () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"));
    expect(manifest.version).toBe("3.0.0");
    expect(manifest.peerDependencies.react).toBe("^19");
    expect(manifest.peerDependencies["react-dom"]).toBe("^19");
    for (const name of ["legacy-alert-dialog-action", "legacy-command-dialog", "legacy-toast"]) {
      expect(manifest.exports).not.toHaveProperty(`./${name}`);
    }
    expect(manifest.files).toContain("MIGRATION.md");
    expect(manifest.peerDependencies).toEqual({
      "@base-ui/react": "^1.9",
      motion: "^13 || ^14",
      react: "^19",
      "react-dom": "^19",
      "react-hook-form": "^7",
      recharts: "^3.8",
    });
    expect(manifest.dependencies).toEqual({
      clsx: "*",
      "embla-carousel-react": "*",
      "input-otp": "*",
      "lucide-react": "*",
      "react-day-picker": "*",
      "react-resizable-panels": "*",
    });
    expect(manifest.sideEffects).toEqual(["**/*.css"]);
    expect(manifest.source).toBe("src/index.ts");
    expect(manifest.main).toBe("dist/index.js");
    expect(manifest.types).toBe("dist/index.d.ts");
    expect(manifest.style).toBe("dist/index.css");
    for (const excluded of ["!src/**/*.test.*", "!src/**/*.spec.*", "!src/**/*.stories.*"]) {
      expect(manifest.files).toContain(excluded);
    }
  });
});

// Opt in only after the parent builds and installs the actual npm-packed artifact.
const packedRoot = process.env["AROLARIU_COMPONENTS_PACKED_ROOT"];
describe.skipIf(!packedRoot)("actual packed artifact contract (Phase Two)", () => {
  function getPackedRoot(): string {
    if (!packedRoot) throw new Error("AROLARIU_COMPONENTS_PACKED_ROOT must identify the unpacked/installed npm artifact.");
    const directory = fs.realpathSync(packedRoot);
    if (directory === fs.realpathSync(path.resolve(import.meta.dirname, ".."))) {
      throw new Error("The workspace is not a packed artifact.");
    }
    return directory;
  }

  it("contains the real public ESM/declaration/style modules and migration guide, not tests or stories", () => {
    const directory = getPackedRoot();
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
    expect(manifest.name).toBe("@arolariu/components");
    expect(manifest.version).toBe("3.0.0");
    expect(manifest.peerDependencies.react).toBe("^19");
    expect(manifest.peerDependencies["react-dom"]).toBe("^19");
    for (const name of ["legacy-alert-dialog-action", "legacy-command-dialog", "legacy-toast"]) {
      expect(manifest.exports).not.toHaveProperty(`./${name}`);
      expect(fs.existsSync(path.join(directory, "src", "components", "ui", `${name}.tsx`))).toBe(false);
      expect(fs.existsSync(path.join(directory, "dist", "components", "ui", `${name}.js`))).toBe(false);
    }
    for (const required of ["MIGRATION.md", "src/index.ts", "dist/index.js", "dist/index.d.ts", "dist/index.css", "dist/styles.d.ts"]) {
      expect(fs.existsSync(path.join(directory, required)), required).toBe(true);
    }
    for (const [sourceDirectory, names] of [
      ["components/ui", supportedComponentModules],
      ["hooks", supportedHookModules],
      ["lib", ["utilities", "color-conversion-utilities"]],
    ] as const) {
      for (const name of names) {
        const entry = manifest.exports[`./${name}`];
        expect(entry).toEqual({
          types: `./dist/${sourceDirectory}/${name}.d.ts`,
          import: `./dist/${sourceDirectory}/${name}.js`,
          default: `./dist/${sourceDirectory}/${name}.js`,
        });
        for (const target of [entry.types, entry.import]) expect(fs.existsSync(path.join(directory, target)), target).toBe(true);
        if (sourceDirectory === "components/ui") {
          const sourceText = fs.readFileSync(path.join(directory, "src", sourceDirectory, `${name}.tsx`), "utf8");
          const outputText = fs.readFileSync(path.join(directory, entry.import), "utf8");
          const hasClientDirective = (text: string, kind: ts.ScriptKind): boolean => {
            const file = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, kind);
            const first = file.statements[0];
            return (
              first !== undefined
              && ts.isExpressionStatement(first)
              && ts.isStringLiteral(first.expression)
              && first.expression.text === "use client"
            );
          };
          expect(hasClientDirective(outputText, ts.ScriptKind.JS), `${name} client/server boundary`).toBe(
            hasClientDirective(sourceText, ts.ScriptKind.TSX),
          );
        }
      }
    }
    const packedFiles = ts.sys.readDirectory(directory, undefined, ["node_modules"]);
    expect(packedFiles.filter((file) => /\.(test|spec|stories)\./u.test(file))).toEqual([]);
    expect(Object.keys(manifest.exports).some((key) => key.includes("_") && manifest.exports[key] !== null)).toBe(false);
  });

  it("preserves named public declarations and namespace members through every packed subpath", () => {
    const directory = getPackedRoot();
    const files = supportedComponentModules.map((name) => path.join(directory, "dist", "components", "ui", `${name}.d.ts`));
    files.push(...supportedHookModules.map((name) => path.join(directory, "dist", "hooks", `${name}.d.ts`)));
    files.push(
      path.join(directory, "dist", "lib", "utilities.d.ts"),
      path.join(directory, "dist", "lib", "color-conversion-utilities.d.ts"),
    );
    const indexFile = path.join(directory, "dist", "index.d.ts");
    const program = ts.createProgram([...files, indexFile], {
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      types: ["node", "react", "react-dom"],
    });
    expect(ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))).toEqual(
      [],
    );
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(indexFile);
    if (!source) throw new Error("Packed root declarations were not loaded.");
    const rootSymbol = checker.getSymbolAtLocation(source);
    if (!rootSymbol) throw new Error("Packed root declarations have no module symbol.");
    const rootTypes = new Map(checker.getExportsOfModule(rootSymbol).map((symbol) => [symbol.name, symbol]));
    assertCanonicalDeclarations(checker, rootTypes);
    for (const name of retainedFormTypes) expect(rootTypes.has(name), name).toBe(true);
    for (const file of files) {
      const moduleFile = program.getSourceFile(file);
      if (!moduleFile) throw new Error(`Packed declarations absent: ${file}`);
      const moduleSymbol = checker.getSymbolAtLocation(moduleFile);
      if (!moduleSymbol) throw new Error(`Packed declaration module absent: ${file}`);
      for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
        const rootName = path.basename(file) === "form.d.ts" && symbol.name === "FieldError" ? "RHFFieldError" : symbol.name;
        const rootType = rootTypes.get(rootName);
        if (!rootType) throw new Error(`Packed root declaration omits ${rootName}.`);
        const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
        const rootTarget = rootType.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(rootType) : rootType;
        expect(rootTarget, rootName).toBe(target);
      }
    }
  }, 30000);

  it("keeps mounted Storybook styles out of shipped source and executable assets", () => {
    const directory = getPackedRoot();
    const assets = ts.sys.readDirectory(directory, [".css", ".js", ".tsx"], ["node_modules"]);
    const demoSelectors: string[] = [];
    for (const file of assets) {
      const content = fs.readFileSync(file, "utf8");
      expect(content, path.relative(directory, file)).not.toContain("ac-story-");
      if (!file.endsWith(".css")) continue;
      parse(content, {from: file}).walkRules((rule) => {
        selectorParser((selectors) => {
          selectors.walkClasses((className) => {
            if (/^_?(?:story|demo|example)(?:[A-Z_-]|$)/u.test(className.value)) {
              demoSelectors.push(`${path.relative(directory, file)}: ${className.value}`);
            }
          });
        }).processSync(rule.selector);
      });
    }
    expect(demoSelectors).toEqual([]);
  });

  it("loads every packed ESM entrypoint with real peers and rejects private helper imports", () => {
    const script = `
      import {registerHooks} from "node:module";
      import {readFileSync} from "node:fs";
      import assert from "node:assert/strict";
      registerHooks({load(url, context, nextLoad) {
        if (url.endsWith(".css")) {
          readFileSync(new URL(url), "utf8");
          return {format: "module", source: "export default {};", shortCircuit: true};
        }
        return nextLoad(url, context);
      }});
      const root = await import("@arolariu/components");
      for (const name of ${JSON.stringify([...supportedComponentModules, ...supportedHookModules, "utilities", "color-conversion-utilities"])}) {
        const module = await import("@arolariu/components/" + name);
        for (const [key, value] of Object.entries(module)) assert.equal(root[key], value, name + "." + key);
      }
      for (const name of ${JSON.stringify(retainedChartAliases)}) assert.ok(root[name] !== undefined, name);
      for (const specifier of ["@arolariu/components/_visual-effects", "@arolariu/components/components/ui/_visual-effects"]) {
        await assert.rejects(import(specifier), {code: "ERR_PACKAGE_PATH_NOT_EXPORTED"});
      }
      console.log("Packed ESM root/subpath identities and private-path rejection passed.");
    `;
    // CSS is the sole Node platform boundary; actual CSS files must exist and are read.
    const output = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {cwd: getPackedRoot(), encoding: "utf8"});
    expect(output).toContain("Packed ESM root/subpath identities and private-path rejection passed.");
  }, 30000);
});

describe("index.ts exports", () => {
  it("exposes supported local loading primitives at the root", () => {
    for (const name of [
      "AsyncBoundary",
      "CardSkeleton",
      "ErrorBoundary",
      "FocusScope",
      "FormSkeleton",
      "ListSkeleton",
      "LoadingOverlay",
      "TableSkeleton",
    ]) {
      expect(exports).toHaveProperty(name);
    }
  });

  it.each([
    ["AsyncBoundary", AsyncBoundary],
    ["CardSkeleton", CardSkeleton],
    ["ErrorBoundary", ErrorBoundary],
    ["FocusScope", FocusScope],
    ["FormSkeleton", FormSkeleton],
    ["ListSkeleton", ListSkeleton],
    ["LoadingOverlay", LoadingOverlay],
    ["TableSkeleton", TableSkeleton],
  ] as const)("re-exports %s from its public module", (name, component) => {
    expect(exports[name]).toBe(component);
  });

  it("preserves the named public prop types at the root", () => {
    expectTypeOf<AsyncBoundaryProps>().toEqualTypeOf<LocalAsyncBoundaryProps>();
    expectTypeOf<CardSkeletonProps>().toEqualTypeOf<LocalCardSkeletonProps>();
    expectTypeOf<ErrorBoundaryProps>().toEqualTypeOf<LocalErrorBoundaryProps>();
    expectTypeOf<FocusScopeProps>().toEqualTypeOf<LocalFocusScopeProps>();
    expectTypeOf<FormSkeletonProps>().toEqualTypeOf<LocalFormSkeletonProps>();
    expectTypeOf<ListSkeletonProps>().toEqualTypeOf<LocalListSkeletonProps>();
    expectTypeOf<LoadingOverlayProps>().toEqualTypeOf<LocalLoadingOverlayProps>();
    expectTypeOf<TableSkeletonProps>().toEqualTypeOf<LocalTableSkeletonProps>();
  });

  it("should export components and utilities", () => {
    expect(exports).toBeDefined();
    const exportKeys = Object.keys(exports);
    expect(exportKeys.length).toBeGreaterThan(0);
  });

  describe("Accordion", () => {
    it("should export Accordion", () => expect(exports).toHaveProperty("Accordion"));
    it("should export AccordionContent", () => expect(exports).toHaveProperty("AccordionContent"));
    it("should export AccordionItem", () => expect(exports).toHaveProperty("AccordionItem"));
    it("should export AccordionTrigger", () => expect(exports).toHaveProperty("AccordionTrigger"));
  });

  describe("Alert", () => {
    it("should export Alert", () => expect(exports).toHaveProperty("Alert"));
    it("should export AlertDescription", () => expect(exports).toHaveProperty("AlertDescription"));
    it("should export AlertTitle", () => expect(exports).toHaveProperty("AlertTitle"));
  });

  describe("AlertDialog", () => {
    it("should export AlertDialog", () => expect(exports).toHaveProperty("AlertDialog"));
    it("should export AlertDialogAction", () => expect(exports).toHaveProperty("AlertDialogAction"));
    it("should export AlertDialogCancel", () => expect(exports).toHaveProperty("AlertDialogCancel"));
    it("should export AlertDialogContent", () => expect(exports).toHaveProperty("AlertDialogContent"));
    it("should export AlertDialogDescription", () => expect(exports).toHaveProperty("AlertDialogDescription"));
    it("should export AlertDialogFooter", () => expect(exports).toHaveProperty("AlertDialogFooter"));
    it("should export AlertDialogHeader", () => expect(exports).toHaveProperty("AlertDialogHeader"));
    it("should export AlertDialogOverlay", () => expect(exports).toHaveProperty("AlertDialogOverlay"));
    it("should export AlertDialogPortal", () => expect(exports).toHaveProperty("AlertDialogPortal"));
    it("should export AlertDialogTitle", () => expect(exports).toHaveProperty("AlertDialogTitle"));
    it("should export AlertDialogTrigger", () => expect(exports).toHaveProperty("AlertDialogTrigger"));
  });

  describe("AspectRatio", () => {
    it("should export AspectRatio", () => expect(exports).toHaveProperty("AspectRatio"));
  });

  describe("Avatar", () => {
    it("should export Avatar", () => expect(exports).toHaveProperty("Avatar"));
    it("should export AvatarFallback", () => expect(exports).toHaveProperty("AvatarFallback"));
    it("should export AvatarImage", () => expect(exports).toHaveProperty("AvatarImage"));
  });

  describe("BackgroundBeams", () => {
    it("should export BackgroundBeams", () => expect(exports).toHaveProperty("BackgroundBeams"));
  });

  describe("Badge", () => {
    it("should export Badge", () => expect(exports).toHaveProperty("Badge"));
    it("should export badgeVariants", () => expect(exports).toHaveProperty("badgeVariants"));
  });

  describe("Breadcrumb", () => {
    it("should export Breadcrumb", () => expect(exports).toHaveProperty("Breadcrumb"));
    it("should export BreadcrumbEllipsis", () => expect(exports).toHaveProperty("BreadcrumbEllipsis"));
    it("should export BreadcrumbItem", () => expect(exports).toHaveProperty("BreadcrumbItem"));
    it("should export BreadcrumbLink", () => expect(exports).toHaveProperty("BreadcrumbLink"));
    it("should export BreadcrumbList", () => expect(exports).toHaveProperty("BreadcrumbList"));
    it("should export BreadcrumbPage", () => expect(exports).toHaveProperty("BreadcrumbPage"));
    it("should export BreadcrumbSeparator", () => expect(exports).toHaveProperty("BreadcrumbSeparator"));
  });

  describe("BubbleBackground", () => {
    it("should export BubbleBackground", () => expect(exports).toHaveProperty("BubbleBackground"));
  });

  describe("Button", () => {
    it("should export Button", () => expect(exports).toHaveProperty("Button"));
    it("should export buttonVariants", () => expect(exports).toHaveProperty("buttonVariants"));
  });

  describe("ButtonGroup", () => {
    it("should export ButtonGroup", () => expect(exports).toHaveProperty("ButtonGroup"));
    it("should export ButtonGroupSeparator", () => expect(exports).toHaveProperty("ButtonGroupSeparator"));
    it("should export ButtonGroupText", () => expect(exports).toHaveProperty("ButtonGroupText"));
    it("should export buttonGroupVariants", () => expect(exports).toHaveProperty("buttonGroupVariants"));
  });

  describe("Calendar", () => {
    it("should export Calendar", () => expect(exports).toHaveProperty("Calendar"));
  });

  describe("Card", () => {
    it("should export Card", () => expect(exports).toHaveProperty("Card"));
    it("should export CardAction", () => expect(exports).toHaveProperty("CardAction"));
    it("should export CardContent", () => expect(exports).toHaveProperty("CardContent"));
    it("should export CardDescription", () => expect(exports).toHaveProperty("CardDescription"));
    it("should export CardFooter", () => expect(exports).toHaveProperty("CardFooter"));
    it("should export CardHeader", () => expect(exports).toHaveProperty("CardHeader"));
    it("should export CardTitle", () => expect(exports).toHaveProperty("CardTitle"));
  });

  describe("Carousel", () => {
    it("should export Carousel", () => expect(exports).toHaveProperty("Carousel"));
    it("should export CarouselContent", () => expect(exports).toHaveProperty("CarouselContent"));
    it("should export CarouselItem", () => expect(exports).toHaveProperty("CarouselItem"));
    it("should export CarouselNext", () => expect(exports).toHaveProperty("CarouselNext"));
    it("should export CarouselPrevious", () => expect(exports).toHaveProperty("CarouselPrevious"));
  });

  describe("Chart", () => {
    it("should export ChartContainer", () => expect(exports).toHaveProperty("ChartContainer"));
    it("should export ChartLegend", () => expect(exports).toHaveProperty("ChartLegend"));
    it("should export ChartLegendContent", () => expect(exports).toHaveProperty("ChartLegendContent"));
    it("should export ChartStyle", () => expect(exports).toHaveProperty("ChartStyle"));
    it("should export ChartTooltip", () => expect(exports).toHaveProperty("ChartTooltip"));
    it("should export ChartTooltipContent", () => expect(exports).toHaveProperty("ChartTooltipContent"));
  });

  describe("Checkbox", () => {
    it("should export Checkbox", () => expect(exports).toHaveProperty("Checkbox"));
  });

  describe("CheckboxGroup", () => {
    it("should export CheckboxGroup", () => expect(exports).toHaveProperty("CheckboxGroup"));
  });

  describe("Utilities", () => {
    it("should export cn", () => expect(exports).toHaveProperty("cn"));
  });

  describe("Collapsible", () => {
    it("should export Collapsible", () => expect(exports).toHaveProperty("Collapsible"));
    it("should export CollapsibleContent", () => expect(exports).toHaveProperty("CollapsibleContent"));
    it("should export CollapsibleTrigger", () => expect(exports).toHaveProperty("CollapsibleTrigger"));
  });

  describe("Command", () => {
    it("should export Command", () => expect(exports).toHaveProperty("Command"));
    it("should export CommandDialog", () => expect(exports).toHaveProperty("CommandDialog"));
    it("should export CommandEmpty", () => expect(exports).toHaveProperty("CommandEmpty"));
    it("should export CommandGroup", () => expect(exports).toHaveProperty("CommandGroup"));
    it("should export CommandInput", () => expect(exports).toHaveProperty("CommandInput"));
    it("should export CommandItem", () => expect(exports).toHaveProperty("CommandItem"));
    it("should export CommandList", () => expect(exports).toHaveProperty("CommandList"));
    it("should export CommandSeparator", () => expect(exports).toHaveProperty("CommandSeparator"));
    it("should export CommandShortcut", () => expect(exports).toHaveProperty("CommandShortcut"));
  });

  describe("ContextMenu", () => {
    it("should export ContextMenu", () => expect(exports).toHaveProperty("ContextMenu"));
    it("should export ContextMenuCheckboxItem", () => expect(exports).toHaveProperty("ContextMenuCheckboxItem"));
    it("should export ContextMenuContent", () => expect(exports).toHaveProperty("ContextMenuContent"));
    it("should export ContextMenuGroup", () => expect(exports).toHaveProperty("ContextMenuGroup"));
    it("should export ContextMenuItem", () => expect(exports).toHaveProperty("ContextMenuItem"));
    it("should export ContextMenuLabel", () => expect(exports).toHaveProperty("ContextMenuLabel"));
    it("should export ContextMenuPortal", () => expect(exports).toHaveProperty("ContextMenuPortal"));
    it("should export ContextMenuRadioGroup", () => expect(exports).toHaveProperty("ContextMenuRadioGroup"));
    it("should export ContextMenuRadioItem", () => expect(exports).toHaveProperty("ContextMenuRadioItem"));
    it("should export ContextMenuSeparator", () => expect(exports).toHaveProperty("ContextMenuSeparator"));
    it("should export ContextMenuShortcut", () => expect(exports).toHaveProperty("ContextMenuShortcut"));
    it("should export ContextMenuSub", () => expect(exports).toHaveProperty("ContextMenuSub"));
    it("should export ContextMenuSubContent", () => expect(exports).toHaveProperty("ContextMenuSubContent"));
    it("should export ContextMenuSubTrigger", () => expect(exports).toHaveProperty("ContextMenuSubTrigger"));
    it("should export ContextMenuTrigger", () => expect(exports).toHaveProperty("ContextMenuTrigger"));
  });

  describe("CountingNumber", () => {
    it("should export CountingNumber", () => expect(exports).toHaveProperty("CountingNumber"));
  });

  describe("Dialog", () => {
    it("should export Dialog", () => expect(exports).toHaveProperty("Dialog"));
    it("should export DialogClose", () => expect(exports).toHaveProperty("DialogClose"));
    it("should export DialogContent", () => expect(exports).toHaveProperty("DialogContent"));
    it("should export DialogDescription", () => expect(exports).toHaveProperty("DialogDescription"));
    it("should export DialogFooter", () => expect(exports).toHaveProperty("DialogFooter"));
    it("should export DialogHeader", () => expect(exports).toHaveProperty("DialogHeader"));
    it("should export DialogOverlay", () => expect(exports).toHaveProperty("DialogOverlay"));
    it("should export DialogPortal", () => expect(exports).toHaveProperty("DialogPortal"));
    it("should export DialogTitle", () => expect(exports).toHaveProperty("DialogTitle"));
    it("should export DialogTrigger", () => expect(exports).toHaveProperty("DialogTrigger"));
  });

  describe("DotBackground", () => {
    it("should export DotBackground", () => expect(exports).toHaveProperty("DotBackground"));
  });

  describe("Drawer", () => {
    it("should export Drawer", () => expect(exports).toHaveProperty("Drawer"));
    it("should export DrawerClose", () => expect(exports).toHaveProperty("DrawerClose"));
    it("should export DrawerContent", () => expect(exports).toHaveProperty("DrawerContent"));
    it("should export DrawerDescription", () => expect(exports).toHaveProperty("DrawerDescription"));
    it("should export DrawerFooter", () => expect(exports).toHaveProperty("DrawerFooter"));
    it("should export DrawerHeader", () => expect(exports).toHaveProperty("DrawerHeader"));
    it("should export DrawerOverlay", () => expect(exports).toHaveProperty("DrawerOverlay"));
    it("should export DrawerPortal", () => expect(exports).toHaveProperty("DrawerPortal"));
    it("should export DrawerTitle", () => expect(exports).toHaveProperty("DrawerTitle"));
    it("should export DrawerTrigger", () => expect(exports).toHaveProperty("DrawerTrigger"));
  });

  describe("DropdownMenu", () => {
    it("should export DropdownMenu", () => expect(exports).toHaveProperty("DropdownMenu"));
    it("should export DropdownMenuCheckboxItem", () => expect(exports).toHaveProperty("DropdownMenuCheckboxItem"));
    it("should export DropdownMenuContent", () => expect(exports).toHaveProperty("DropdownMenuContent"));
    it("should export DropdownMenuGroup", () => expect(exports).toHaveProperty("DropdownMenuGroup"));
    it("should export DropdownMenuItem", () => expect(exports).toHaveProperty("DropdownMenuItem"));
    it("should export DropdownMenuLabel", () => expect(exports).toHaveProperty("DropdownMenuLabel"));
    it("should export DropdownMenuPortal", () => expect(exports).toHaveProperty("DropdownMenuPortal"));
    it("should export DropdownMenuRadioGroup", () => expect(exports).toHaveProperty("DropdownMenuRadioGroup"));
    it("should export DropdownMenuRadioItem", () => expect(exports).toHaveProperty("DropdownMenuRadioItem"));
    it("should export DropdownMenuSeparator", () => expect(exports).toHaveProperty("DropdownMenuSeparator"));
    it("should export DropdownMenuShortcut", () => expect(exports).toHaveProperty("DropdownMenuShortcut"));
    it("should export DropdownMenuSub", () => expect(exports).toHaveProperty("DropdownMenuSub"));
    it("should export DropdownMenuSubContent", () => expect(exports).toHaveProperty("DropdownMenuSubContent"));
    it("should export DropdownMenuSubTrigger", () => expect(exports).toHaveProperty("DropdownMenuSubTrigger"));
    it("should export DropdownMenuTrigger", () => expect(exports).toHaveProperty("DropdownMenuTrigger"));
  });

  describe("DropDrawer", () => {
    it("should export DropDrawer", () => expect(exports).toHaveProperty("DropDrawer"));
    it("should export DropDrawerContent", () => expect(exports).toHaveProperty("DropDrawerContent"));
    it("should export DropDrawerFooter", () => expect(exports).toHaveProperty("DropDrawerFooter"));
    it("should export DropDrawerGroup", () => expect(exports).toHaveProperty("DropDrawerGroup"));
    it("should export DropDrawerItem", () => expect(exports).toHaveProperty("DropDrawerItem"));
    it("should export DropDrawerLabel", () => expect(exports).toHaveProperty("DropDrawerLabel"));
    it("should export DropDrawerSeparator", () => expect(exports).toHaveProperty("DropDrawerSeparator"));
    it("should export DropDrawerSub", () => expect(exports).toHaveProperty("DropDrawerSub"));
    it("should export DropDrawerSubContent", () => expect(exports).toHaveProperty("DropDrawerSubContent"));
    it("should export DropDrawerSubTrigger", () => expect(exports).toHaveProperty("DropDrawerSubTrigger"));
    it("should export DropDrawerTrigger", () => expect(exports).toHaveProperty("DropDrawerTrigger"));
  });

  describe("Empty", () => {
    it("should export Empty", () => expect(exports).toHaveProperty("Empty"));
    it("should export EmptyContent", () => expect(exports).toHaveProperty("EmptyContent"));
    it("should export EmptyDescription", () => expect(exports).toHaveProperty("EmptyDescription"));
    it("should export EmptyHeader", () => expect(exports).toHaveProperty("EmptyHeader"));
    it("should export EmptyMedia", () => expect(exports).toHaveProperty("EmptyMedia"));
    it("should export EmptyTitle", () => expect(exports).toHaveProperty("EmptyTitle"));
  });

  describe("Field", () => {
    it("should export Field", () => expect(exports).toHaveProperty("Field"));
    it("should export FieldContent", () => expect(exports).toHaveProperty("FieldContent"));
    it("should export FieldDescription", () => expect(exports).toHaveProperty("FieldDescription"));
    it("should export FieldError", () => expect(exports).toHaveProperty("FieldError"));
    it("should export FieldGroup", () => expect(exports).toHaveProperty("FieldGroup"));
    it("should export FieldLabel", () => expect(exports).toHaveProperty("FieldLabel"));
    it("should export FieldLegend", () => expect(exports).toHaveProperty("FieldLegend"));
    it("should export FieldSeparator", () => expect(exports).toHaveProperty("FieldSeparator"));
    it("should export FieldSet", () => expect(exports).toHaveProperty("FieldSet"));
    it("should export FieldTitle", () => expect(exports).toHaveProperty("FieldTitle"));
  });

  describe("FireworksBackground", () => {
    it("should export FireworksBackground", () => expect(exports).toHaveProperty("FireworksBackground"));
  });

  describe("FlipButton", () => {
    it("should export FlipButton", () => expect(exports).toHaveProperty("FlipButton"));
  });

  describe("Form", () => {
    it("should export Form", () => expect(exports).toHaveProperty("Form"));
    it("should export FormControl", () => expect(exports).toHaveProperty("FormControl"));
    it("should export FormDescription", () => expect(exports).toHaveProperty("FormDescription"));
    it("should export FormField", () => expect(exports).toHaveProperty("FormField"));
    it("should export FormItem", () => expect(exports).toHaveProperty("FormItem"));
    it("should export FormLabel", () => expect(exports).toHaveProperty("FormLabel"));
    it("should export FormMessage", () => expect(exports).toHaveProperty("FormMessage"));
  });

  describe("GradientBackground", () => {
    it("should export GradientBackground", () => expect(exports).toHaveProperty("GradientBackground"));
  });

  describe("GradientText", () => {
    it("should export GradientText", () => expect(exports).toHaveProperty("GradientText"));
  });

  describe("HighlightText", () => {
    it("should export HighlightText", () => expect(exports).toHaveProperty("HighlightText"));
  });

  describe("HoleBackground", () => {
    it("should export HoleBackground", () => expect(exports).toHaveProperty("HoleBackground"));
  });

  describe("HoverCard", () => {
    it("should export HoverCard", () => expect(exports).toHaveProperty("HoverCard"));
    it("should export HoverCardContent", () => expect(exports).toHaveProperty("HoverCardContent"));
    it("should export HoverCardTrigger", () => expect(exports).toHaveProperty("HoverCardTrigger"));
  });

  describe("Input", () => {
    it("should export Input", () => expect(exports).toHaveProperty("Input"));
  });

  describe("InputGroup", () => {
    it("should export InputGroup", () => expect(exports).toHaveProperty("InputGroup"));
    it("should export InputGroupAddon", () => expect(exports).toHaveProperty("InputGroupAddon"));
    it("should export InputGroupButton", () => expect(exports).toHaveProperty("InputGroupButton"));
    it("should export InputGroupInput", () => expect(exports).toHaveProperty("InputGroupInput"));
    it("should export InputGroupText", () => expect(exports).toHaveProperty("InputGroupText"));
    it("should export InputGroupTextarea", () => expect(exports).toHaveProperty("InputGroupTextarea"));
  });

  describe("InputOTP", () => {
    it("should export InputOTP", () => expect(exports).toHaveProperty("InputOTP"));
    it("should export InputOTPGroup", () => expect(exports).toHaveProperty("InputOTPGroup"));
    it("should export InputOTPSeparator", () => expect(exports).toHaveProperty("InputOTPSeparator"));
    it("should export InputOTPSlot", () => expect(exports).toHaveProperty("InputOTPSlot"));
  });

  describe("Item", () => {
    it("should export Item", () => expect(exports).toHaveProperty("Item"));
    it("should export ItemActions", () => expect(exports).toHaveProperty("ItemActions"));
    it("should export ItemContent", () => expect(exports).toHaveProperty("ItemContent"));
    it("should export ItemDescription", () => expect(exports).toHaveProperty("ItemDescription"));
    it("should export ItemFooter", () => expect(exports).toHaveProperty("ItemFooter"));
    it("should export ItemGroup", () => expect(exports).toHaveProperty("ItemGroup"));
    it("should export ItemHeader", () => expect(exports).toHaveProperty("ItemHeader"));
    it("should export ItemMedia", () => expect(exports).toHaveProperty("ItemMedia"));
    it("should export ItemSeparator", () => expect(exports).toHaveProperty("ItemSeparator"));
    it("should export ItemTitle", () => expect(exports).toHaveProperty("ItemTitle"));
  });

  describe("Kbd", () => {
    it("should export Kbd", () => expect(exports).toHaveProperty("Kbd"));
    it("should export KbdGroup", () => expect(exports).toHaveProperty("KbdGroup"));
  });

  describe("Label", () => {
    it("should export Label", () => expect(exports).toHaveProperty("Label"));
  });

  describe("Menubar", () => {
    it("should export Menubar", () => expect(exports).toHaveProperty("Menubar"));
    it("should export MenubarCheckboxItem", () => expect(exports).toHaveProperty("MenubarCheckboxItem"));
    it("should export MenubarContent", () => expect(exports).toHaveProperty("MenubarContent"));
    it("should export MenubarGroup", () => expect(exports).toHaveProperty("MenubarGroup"));
    it("should export MenubarItem", () => expect(exports).toHaveProperty("MenubarItem"));
    it("should export MenubarLabel", () => expect(exports).toHaveProperty("MenubarLabel"));
    it("should export MenubarMenu", () => expect(exports).toHaveProperty("MenubarMenu"));
    it("should export MenubarPortal", () => expect(exports).toHaveProperty("MenubarPortal"));
    it("should export MenubarRadioGroup", () => expect(exports).toHaveProperty("MenubarRadioGroup"));
    it("should export MenubarRadioItem", () => expect(exports).toHaveProperty("MenubarRadioItem"));
    it("should export MenubarSeparator", () => expect(exports).toHaveProperty("MenubarSeparator"));
    it("should export MenubarShortcut", () => expect(exports).toHaveProperty("MenubarShortcut"));
    it("should export MenubarSub", () => expect(exports).toHaveProperty("MenubarSub"));
    it("should export MenubarSubContent", () => expect(exports).toHaveProperty("MenubarSubContent"));
    it("should export MenubarSubTrigger", () => expect(exports).toHaveProperty("MenubarSubTrigger"));
    it("should export MenubarTrigger", () => expect(exports).toHaveProperty("MenubarTrigger"));
  });

  describe("Meter", () => {
    it("should export Meter", () => expect(exports).toHaveProperty("Meter"));
    it("should export MeterIndicator", () => expect(exports).toHaveProperty("MeterIndicator"));
    it("should export MeterLabel", () => expect(exports).toHaveProperty("MeterLabel"));
    it("should export MeterTrack", () => expect(exports).toHaveProperty("MeterTrack"));
  });

  describe("NavigationMenu", () => {
    it("should export NavigationMenu", () => expect(exports).toHaveProperty("NavigationMenu"));
    it("should export NavigationMenuContent", () => expect(exports).toHaveProperty("NavigationMenuContent"));
    it("does not export the removed navigation indicator", () => expect(exports).not.toHaveProperty("NavigationMenuIndicator"));
    it("should export NavigationMenuItem", () => expect(exports).toHaveProperty("NavigationMenuItem"));
    it("should export NavigationMenuLink", () => expect(exports).toHaveProperty("NavigationMenuLink"));
    it("should export NavigationMenuList", () => expect(exports).toHaveProperty("NavigationMenuList"));
    it("should export NavigationMenuTrigger", () => expect(exports).toHaveProperty("NavigationMenuTrigger"));
    it("should export navigationMenuTriggerStyle", () => expect(exports).toHaveProperty("navigationMenuTriggerStyle"));
    it("does not export the removed viewport adapter", () => expect(exports).not.toHaveProperty("NavigationMenuViewport"));
  });

  describe("NumberField", () => {
    it("should export NumberField", () => expect(exports).toHaveProperty("NumberField"));
    it("should export NumberFieldDecrement", () => expect(exports).toHaveProperty("NumberFieldDecrement"));
    it("should export NumberFieldGroup", () => expect(exports).toHaveProperty("NumberFieldGroup"));
    it("should export NumberFieldIncrement", () => expect(exports).toHaveProperty("NumberFieldIncrement"));
    it("should export NumberFieldInput", () => expect(exports).toHaveProperty("NumberFieldInput"));
    it("should export NumberFieldScrubArea", () => expect(exports).toHaveProperty("NumberFieldScrubArea"));
  });

  describe("Pagination", () => {
    it("should export Pagination", () => expect(exports).toHaveProperty("Pagination"));
    it("should export PaginationContent", () => expect(exports).toHaveProperty("PaginationContent"));
    it("should export PaginationEllipsis", () => expect(exports).toHaveProperty("PaginationEllipsis"));
    it("should export PaginationItem", () => expect(exports).toHaveProperty("PaginationItem"));
    it("should export PaginationLink", () => expect(exports).toHaveProperty("PaginationLink"));
    it("should export PaginationNext", () => expect(exports).toHaveProperty("PaginationNext"));
    it("should export PaginationPrevious", () => expect(exports).toHaveProperty("PaginationPrevious"));
  });

  describe("Popover", () => {
    it("should export Popover", () => expect(exports).toHaveProperty("Popover"));
    it("does not export the removed structural anchor", () => expect(exports).not.toHaveProperty("PopoverAnchor"));
    it("should export PopoverContent", () => expect(exports).toHaveProperty("PopoverContent"));
    it("should export PopoverTrigger", () => expect(exports).toHaveProperty("PopoverTrigger"));
  });

  describe("Progress", () => {
    it("should export Progress", () => expect(exports).toHaveProperty("Progress"));
  });

  describe("RadioGroup", () => {
    it("should export RadioGroup", () => expect(exports).toHaveProperty("RadioGroup"));
    it("should export RadioGroupItem", () => expect(exports).toHaveProperty("RadioGroupItem"));
  });

  describe("Resizable", () => {
    it("should export ResizableHandle", () => expect(exports).toHaveProperty("ResizableHandle"));
    it("should export ResizablePanel", () => expect(exports).toHaveProperty("ResizablePanel"));
    it("should export ResizablePanelGroup", () => expect(exports).toHaveProperty("ResizablePanelGroup"));
  });

  describe("RippleButton", () => {
    it("should export RippleButton", () => expect(exports).toHaveProperty("RippleButton"));
  });

  describe("Scratcher", () => {
    it("should export Scratcher", () => expect(exports).toHaveProperty("Scratcher"));
  });

  describe("ScrollArea", () => {
    it("should export ScrollArea", () => expect(exports).toHaveProperty("ScrollArea"));
    it("should export ScrollBar", () => expect(exports).toHaveProperty("ScrollBar"));
  });

  describe("Select", () => {
    it("should export Select", () => expect(exports).toHaveProperty("Select"));
    it("should export SelectContent", () => expect(exports).toHaveProperty("SelectContent"));
    it("should export SelectGroup", () => expect(exports).toHaveProperty("SelectGroup"));
    it("should export SelectItem", () => expect(exports).toHaveProperty("SelectItem"));
    it("should export SelectLabel", () => expect(exports).toHaveProperty("SelectLabel"));
    it("should export SelectScrollDownButton", () => expect(exports).toHaveProperty("SelectScrollDownButton"));
    it("should export SelectScrollUpButton", () => expect(exports).toHaveProperty("SelectScrollUpButton"));
    it("should export SelectSeparator", () => expect(exports).toHaveProperty("SelectSeparator"));
    it("should export SelectTrigger", () => expect(exports).toHaveProperty("SelectTrigger"));
    it("should export SelectValue", () => expect(exports).toHaveProperty("SelectValue"));
  });

  describe("Separator", () => {
    it("should export Separator", () => expect(exports).toHaveProperty("Separator"));
  });

  describe("Sheet", () => {
    it("should export Sheet", () => expect(exports).toHaveProperty("Sheet"));
    it("should export SheetClose", () => expect(exports).toHaveProperty("SheetClose"));
    it("should export SheetContent", () => expect(exports).toHaveProperty("SheetContent"));
    it("should export SheetDescription", () => expect(exports).toHaveProperty("SheetDescription"));
    it("should export SheetFooter", () => expect(exports).toHaveProperty("SheetFooter"));
    it("should export SheetHeader", () => expect(exports).toHaveProperty("SheetHeader"));
    it("should export SheetOverlay", () => expect(exports).toHaveProperty("SheetOverlay"));
    it("should export SheetPortal", () => expect(exports).toHaveProperty("SheetPortal"));
    it("should export SheetTitle", () => expect(exports).toHaveProperty("SheetTitle"));
    it("should export SheetTrigger", () => expect(exports).toHaveProperty("SheetTrigger"));
  });

  describe("Sidebar", () => {
    it("should export Sidebar", () => expect(exports).toHaveProperty("Sidebar"));
    it("should export SidebarContent", () => expect(exports).toHaveProperty("SidebarContent"));
    it("should export SidebarFooter", () => expect(exports).toHaveProperty("SidebarFooter"));
    it("should export SidebarGroup", () => expect(exports).toHaveProperty("SidebarGroup"));
    it("should export SidebarGroupAction", () => expect(exports).toHaveProperty("SidebarGroupAction"));
    it("should export SidebarGroupContent", () => expect(exports).toHaveProperty("SidebarGroupContent"));
    it("should export SidebarGroupLabel", () => expect(exports).toHaveProperty("SidebarGroupLabel"));
    it("should export SidebarHeader", () => expect(exports).toHaveProperty("SidebarHeader"));
    it("should export SidebarInput", () => expect(exports).toHaveProperty("SidebarInput"));
    it("should export SidebarInset", () => expect(exports).toHaveProperty("SidebarInset"));
    it("should export SidebarMenu", () => expect(exports).toHaveProperty("SidebarMenu"));
    it("should export SidebarMenuAction", () => expect(exports).toHaveProperty("SidebarMenuAction"));
    it("should export SidebarMenuBadge", () => expect(exports).toHaveProperty("SidebarMenuBadge"));
    it("should export SidebarMenuButton", () => expect(exports).toHaveProperty("SidebarMenuButton"));
    it("should export SidebarMenuItem", () => expect(exports).toHaveProperty("SidebarMenuItem"));
    it("should export SidebarMenuSkeleton", () => expect(exports).toHaveProperty("SidebarMenuSkeleton"));
    it("should export SidebarMenuSub", () => expect(exports).toHaveProperty("SidebarMenuSub"));
    it("should export SidebarMenuSubButton", () => expect(exports).toHaveProperty("SidebarMenuSubButton"));
    it("should export SidebarMenuSubItem", () => expect(exports).toHaveProperty("SidebarMenuSubItem"));
    it("should export SidebarProvider", () => expect(exports).toHaveProperty("SidebarProvider"));
    it("should export SidebarRail", () => expect(exports).toHaveProperty("SidebarRail"));
    it("should export SidebarSeparator", () => expect(exports).toHaveProperty("SidebarSeparator"));
    it("should export SidebarTrigger", () => expect(exports).toHaveProperty("SidebarTrigger"));
  });

  describe("Skeleton", () => {
    it("should export Skeleton", () => expect(exports).toHaveProperty("Skeleton"));
  });

  describe("Slider", () => {
    it("should export Slider", () => expect(exports).toHaveProperty("Slider"));
  });

  describe("Spinner", () => {
    it("should export Spinner", () => expect(exports).toHaveProperty("Spinner"));
  });

  describe("Switch", () => {
    it("should export Switch", () => expect(exports).toHaveProperty("Switch"));
  });

  describe("Table", () => {
    it("should export Table", () => expect(exports).toHaveProperty("Table"));
    it("should export TableBody", () => expect(exports).toHaveProperty("TableBody"));
    it("should export TableCaption", () => expect(exports).toHaveProperty("TableCaption"));
    it("should export TableCell", () => expect(exports).toHaveProperty("TableCell"));
    it("should export TableFooter", () => expect(exports).toHaveProperty("TableFooter"));
    it("should export TableHead", () => expect(exports).toHaveProperty("TableHead"));
    it("should export TableHeader", () => expect(exports).toHaveProperty("TableHeader"));
    it("should export TableRow", () => expect(exports).toHaveProperty("TableRow"));
  });

  describe("Tabs", () => {
    it("should export Tabs", () => expect(exports).toHaveProperty("Tabs"));
    it("should export TabsContent", () => expect(exports).toHaveProperty("TabsContent"));
    it("should export TabsList", () => expect(exports).toHaveProperty("TabsList"));
    it("should export TabsTrigger", () => expect(exports).toHaveProperty("TabsTrigger"));
  });

  describe("Textarea", () => {
    it("should export Textarea", () => expect(exports).toHaveProperty("Textarea"));
  });

  describe("Toolbar", () => {
    it("should export Toolbar", () => expect(exports).toHaveProperty("Toolbar"));
    it("should export ToolbarButton", () => expect(exports).toHaveProperty("ToolbarButton"));
    it("should export ToolbarGroup", () => expect(exports).toHaveProperty("ToolbarGroup"));
    it("should export ToolbarLink", () => expect(exports).toHaveProperty("ToolbarLink"));
    it("should export ToolbarSeparator", () => expect(exports).toHaveProperty("ToolbarSeparator"));
  });

  describe("Toast", () => {
    it("should export toast", () => expect(exports).toHaveProperty("toast"));
    it("should export Toaster", () => expect(exports).toHaveProperty("Toaster"));
  });

  describe("Toggle", () => {
    it("should export Toggle", () => expect(exports).toHaveProperty("Toggle"));
    it("should export toggleVariants", () => expect(exports).toHaveProperty("toggleVariants"));
  });

  describe("ToggleGroup", () => {
    it("should export ToggleGroup", () => expect(exports).toHaveProperty("ToggleGroup"));
    it("should export ToggleGroupItem", () => expect(exports).toHaveProperty("ToggleGroupItem"));
  });

  describe("Tooltip", () => {
    it("should export Tooltip", () => expect(exports).toHaveProperty("Tooltip"));
    it("should export TooltipContent", () => expect(exports).toHaveProperty("TooltipContent"));
    it("should export TooltipProvider", () => expect(exports).toHaveProperty("TooltipProvider"));
    it("should export TooltipTrigger", () => expect(exports).toHaveProperty("TooltipTrigger"));
  });

  describe("TypewriterText", () => {
    it("should export TypewriterText", () => expect(exports).toHaveProperty("TypewriterText"));
    it("should export TypewriterTextSmooth", () => expect(exports).toHaveProperty("TypewriterTextSmooth"));
  });

  describe("Hooks", () => {
    it("should export useFormField", () => expect(exports).toHaveProperty("useFormField"));
    it("should export useIsMobile", () => expect(exports).toHaveProperty("useIsMobile"));
    it("should export useSidebar", () => expect(exports).toHaveProperty("useSidebar"));
    it("should export useWindowSize", () => expect(exports).toHaveProperty("useWindowSize"));
  });

  it("should not have undefined exports", () => {
    Object.entries(exports).forEach(([key, value]) => {
      expect(value, `Export "${key}" should not be undefined`).toBeDefined();
    });
  });
});
