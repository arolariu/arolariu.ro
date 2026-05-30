import {describe, expect, it} from "vitest";

import {jsonResponse, noContentResponse, textResponse} from "./http";

describe("http builders", () => {
  it("creates a real JSON Response", async () => {
    const response = jsonResponse({id: "invoice-1"}, {status: 201});

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({id: "invoice-1"});
  });

  it("creates a real text Response", async () => {
    const response = textResponse("not found", {status: 404});

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("not found");
  });

  it("creates a no-content Response", async () => {
    const response = noContentResponse();

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe("");
  });
});
