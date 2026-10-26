import {resolve} from "node:path";
import ts from "typescript";
import {describe, expect, it} from "vitest";

describe("domain constant type/value exports", () => {
  it("preserves literal-union types and runtime constants under their existing import names", () => {
    const fixturePath = resolve(import.meta.dirname, "domainConstants.fixture.ts");
    const fixture = `
      import {PaymentType} from "./invoices/Payment";
      import {ScanType, ScanStatus} from "./scans/Scan";
      import {ScanMetadataKey, ScanMetadataStatus, ScanDocumentKind, ScanDocumentRole} from "./scans/ScanMetadata";
      const payment: PaymentType = 200;
      const format: ScanType = "JPEG";
      const lifecycle: ScanStatus = "ready";
      const key: ScanMetadataKey = "scanId";
      const status: ScanMetadataStatus = "attached";
      const kind: ScanDocumentKind = "receipt";
      const role: ScanDocumentRole = "primary";
      const values: readonly [PaymentType, ScanType, ScanStatus, ScanMetadataKey, ScanMetadataStatus, ScanDocumentKind, ScanDocumentRole] =
        [PaymentType.Card, ScanType.JPEG, ScanStatus.READY, ScanMetadataKey.SCAN_ID, ScanMetadataStatus.ATTACHED,
         ScanDocumentKind.RECEIPT, ScanDocumentRole.PRIMARY];
      void [payment, format, lifecycle, key, status, kind, role, values];
    `;
    const options: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: [],
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
      fileName === fixturePath
        ? ts.createSourceFile(fileName, fixture, options.target ?? ts.ScriptTarget.ESNext, true)
        : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    const program = ts.createProgram([fixturePath], options, host);
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));

    expect(diagnostics).toEqual([]);
  });
});
