import {describe, expect, it} from "vitest";
import {COMMIT_SHA, CONFIG_STORE, generateGuid, SITE_ENV, SITE_NAME, SITE_URL, TIMESTAMP} from "./utils.generic";

describe("generateGuid", () => {
  it("should generate a valid UUIDv4 string from an ArrayBuffer", () => {
    const buffer = new ArrayBuffer(16);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = i;
    }

    const guid = generateGuid(buffer);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(guid).toMatch(uuidRegex);
  });

  it("should generate different GUIDs for different ArrayBuffers", () => {
    const buffer1 = new ArrayBuffer(16);
    const buffer2 = new ArrayBuffer(16);
    const view1 = new Uint8Array(buffer1);
    const view2 = new Uint8Array(buffer2);

    for (let i = 0; i < view1.length; i++) {
      view1[i] = i;
      view2[i] = i + 1;
    }

    const guid1 = generateGuid(buffer1);
    const guid2 = generateGuid(buffer2);

    expect(guid1).not.toBe(guid2);
  });

  it("should generate the same GUID for the same ArrayBuffer", () => {
    const buffer = new ArrayBuffer(16);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = i;
    }

    const guid1 = generateGuid(buffer);
    const guid2 = generateGuid(buffer);

    expect(guid1).toBe(guid2);
  });

  it("should generate a valid UUIDv4 string from a Uint8Array", () => {
    const view = new Uint8Array(16);
    for (let i = 0; i < view.length; i++) {
      view[i] = i;
    }

    const guid = generateGuid(view.buffer);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(guid).toMatch(uuidRegex);
  });

  it("should generate different GUIDs for different Uint8Arrays", () => {
    const view1 = new Uint8Array(16);
    const view2 = new Uint8Array(16);

    for (let i = 0; i < view1.length; i++) {
      view1[i] = i;
      view2[i] = i + 1;
    }

    const guid1 = generateGuid(view1.buffer);
    const guid2 = generateGuid(view2.buffer);

    expect(guid1).not.toBe(guid2);
  });

  it("does not throw when the ArrayBuffer is too small", () => {
    const buffer = new ArrayBuffer(1);
    const view = new Uint8Array(buffer);
    view[0] = 0;

    expect(() => generateGuid(buffer)).not.toThrow();
  });
});

describe("Environment Variables", () => {
  it("should have SITE_ENV defined", () => {
    expect(SITE_ENV).toBeDefined();
  });

  it("should have SITE_URL defined", () => {
    expect(SITE_URL).toBeDefined();
  });

  it("should have SITE_NAME defined", () => {
    expect(SITE_NAME).toBeDefined();
  });

  it("should have COMMIT_SHA defined", () => {
    expect(COMMIT_SHA).toBeDefined();
  });

  it("should have TIMESTAMP defined", () => {
    expect(TIMESTAMP).toBeDefined();
  });

  it("should have CONFIG_STORE defined", () => {
    expect(CONFIG_STORE).toBeDefined();
  });
});
