import assert from "node:assert/strict";
import path from "node:path";
import ts from "typescript";

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
    assert(symbol, `Missing canonical declaration: ${name}`);
    return checker.getDeclaredTypeOfSymbol(resolveAlias(checker, symbol));
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
    for (const member of removed) assert.equal(checker.getPropertyOfType(getType(name), member), undefined, `${name}.${member}`);
  }
  const direction = getType("FlipDirection");
  assert(direction.isUnion());
  assert(!direction.types.some((type) => type.isStringLiteral() && type.value === "righ"));
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
    assert(!symbols.has(removed), removed);
  }
}

function resolveAlias(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function sourceOptions(): ts.CompilerOptions {
  const directory = path.resolve(import.meta.dirname, "..");
  const config = ts.readConfigFile(path.join(directory, "tsconfig.json"), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const {options} = ts.parseJsonConfigFileContent(config.config, ts.sys, directory);
  return {...options, noEmit: true, strict: true, strictNullChecks: true};
}

const [mode, directory, ...subpaths] = process.argv.slice(2);
assert((mode === "source" || mode === "packed") && directory && subpaths.length > 0, "Expected mode, root, and public subpaths.");
const packed = mode === "packed";
const index = path.join(directory, packed ? "index.d.ts" : "index.ts");
const files = subpaths.map((subpath) => path.join(directory, subpath));
const program = ts.createProgram(
  [...files, index],
  packed
    ? {
        noEmit: true,
        strict: true,
        skipLibCheck: false,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        types: ["node", "react", "react-dom"],
      }
    : sourceOptions(),
);
if (packed) {
  assert.deepEqual(
    ts.getPreEmitDiagnostics(program).map(({messageText}) => ts.flattenDiagnosticMessageText(messageText, "\n")),
    [],
  );
}

const checker = program.getTypeChecker();
function exportsFrom(file: string): readonly ts.Symbol[] {
  const source = program.getSourceFile(file);
  assert(source, `Public declaration file not loaded: ${file}`);
  const symbol = checker.getSymbolAtLocation(source);
  assert(symbol, `Public declaration file has no module symbol: ${file}`);
  return checker.getExportsOfModule(symbol);
}

const rootExports = new Map(exportsFrom(index).map((symbol) => [symbol.name, symbol]));
assertCanonicalDeclarations(checker, rootExports);
for (const name of retainedFormTypes) assert(rootExports.has(name), name);
const missing: string[] = [];
for (const file of files) {
  for (const exported of exportsFrom(file)) {
    const name = /^form\.(?:tsx|d\.ts)$/u.test(path.basename(file)) && exported.name === "FieldError" ? "RHFFieldError" : exported.name;
    const rootExport = rootExports.get(name);
    if (!rootExport) {
      missing.push(`${path.basename(file)}:${name}`);
      continue;
    }
    assert(
      resolveAlias(checker, rootExport) === resolveAlias(checker, exported),
      `${path.basename(file)}:${name} must retain its original type/namespace`,
    );
  }
}
assert.deepEqual(missing, []);
