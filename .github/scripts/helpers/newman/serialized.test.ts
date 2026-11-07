import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {fs} from "../filesystem/index.ts";
import {createNewmanHelper} from "./index.ts";

describe("serialized Newman evidence", () => {
  it("decodes Buffer JSON, URL objects/strings, and request failures without fake assertions", async () => {
    const value = await fs.readJson<unknown>(fileURLToPath(new URL("../reports/fixtures/newman.json", import.meta.url)));
    const helper = createNewmanHelper();
    const result = helper.parseReport(value);
    expect(result).toMatchObject({collectionName: "Serialized API", totalRequests: 2, failedRequests: 2, failedAssertions: 1});
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]).toMatchObject({url: "https://example.invalid/api", responseBody: "bad"});
    expect(result.failures[1]).toMatchObject({url: "https://example.invalid/slow", requestError: "Request timeout", failedAssertions: []});
    expect(helper.categorizeFailures(result)).toMatchObject({serverErrors: 1, timeouts: 1});
  });

  it.each([null, {}, {run: {}}, {collection: {info: {name: "x"}}, run: {stats: {}}}])("rejects malformed report %j", (value) => {
    expect(() => createNewmanHelper().parseReport(value)).toThrow();
  });
});
