import {mkdtempDisposableSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "svelte/compiler";
import {describe, expect, it} from "vitest";
import {createAuthoredBranchCheck} from "./authored-branches.ts";

const source = `<script>
  let {value, fallback} = $props();
  const scripted = value ?? "";
</script>
<p title="prefix {value}">{value}</p>
<p>{value ?? ""}</p>
<p>{value || fallback}</p>
<p>{scripted}</p>
`;

function span(line: number, left: number, right: number) {
  return {
    type: "binary-expr",
    locations: [{start: {line, column: left}}, {start: {line, column: right}}],
  };
}

describe("Status authored branch coverage", () => {
  it.each([false, true])("counts authored branches and retains colliding template spans (%s)", (collision) => {
    using directory = mkdtempDisposableSync(join(tmpdir(), "status-branch-test-"));
    const file = join(directory.path, "example.svelte");
    writeFileSync(file, source);
    const {js} = compile(source, {filename: file, generate: "client", dev: true});
    const {capture, count} = createAuthoredBranchCheck([file]);
    const transform = typeof capture.transform === "function" ? capture.transform : capture.transform?.handler;
    if (!transform) throw new Error("Missing Svelte transform capture.");
    Reflect.apply(transform, {getCombinedSourcemap: () => js.map}, [js.code, file]);

    const result = count({
      [file]: {
        branchMap: {
          attribute: span(5, 2, 2),
          authoredScript: span(3, 19, 28),
          authoredTemplate: span(6, 4, 13),
          authoredOr: span(7, 4, 4),
          ...(collision ? {coincident: span(5, 2, 2)} : {}),
        },
        b: {
          attribute: [1, 0],
          authoredScript: [1, 0],
          authoredTemplate: [1, 1],
          authoredOr: [1, 0],
          ...(collision ? {coincident: [1, 0]} : {}),
        },
      },
    });

    expect(result).toEqual(collision ? {covered: 6, total: 10, compilerOnly: 0} : {covered: 4, total: 6, compilerOnly: 1});
  });

  it("fails closed when the report omits eligible runtime or adds unexpected files", () => {
    const {count} = createAuthoredBranchCheck(["eligible.ts"]);

    expect(() => count({"unexpected.ts": {branchMap: {}, b: {}}})).toThrow(
      /Unexpected Status coverage inventory\. Missing: .*eligible\.ts\. Extra: .*unexpected\.ts\./u,
    );
  });
});
