/** @format */

import {extractBase64FromBlob} from "./utils.client";

describe("extractBase64FromBlob", () => {
  it("should extract base64 string from a blob", async () => {
    const blob = new Blob(["Hello, world!"], {type: "text/plain"});
    const base64String = await extractBase64FromBlob(blob);
    expect(base64String).toMatch(/^data:text\/plain;base64,/);
  });

  it("should handle empty blob", async () => {
    const blob = new Blob([], {type: "text/plain"});
    const base64String = await extractBase64FromBlob(blob);
    expect(base64String).toBe("data:text/plain;base64,");
  });

  it("should handle binary data", async () => {
    const binaryData = new Uint8Array([72, 101, 108, 108, 111]);
    const blob = new Blob([binaryData], {type: "application/octet-stream"});
    const base64String = await extractBase64FromBlob(blob);
    expect(base64String).toMatch(/^data:application\/octet-stream;base64,/);
  });
});
