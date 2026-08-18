/**
 * @fileoverview Tests for the monorepo taxonomy artifact generator.
 * @module scripts/generate.artifacts.test
 */

import {deflateRawSync} from "node:zlib";
import {describe, expect, it} from "vitest";
import {extractZipEntry} from "./generate.artifacts.ts";

/** Minimal ZIP entry description used by the archive builder below. */
interface ZipEntryInput {
  readonly name: string;
  readonly contents: string;
  /** 0 = stored, 8 = deflate. Any other value produces an intentionally unsupported archive. */
  readonly method: number;
}

/**
 * Builds a valid single-disk ZIP archive in memory.
 *
 * @param entries - Entries to place in the archive.
 * @returns Complete ZIP bytes.
 */
function createZipArchive(entries: readonly ZipEntryInput[]): Uint8Array {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const rawBytes = Buffer.from(entry.contents, "utf8");
    const payload = entry.method === 8 ? deflateRawSync(rawBytes) : rawBytes;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(entry.method, 8);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawBytes.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(entry.method, 10);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawBytes.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt32LE(localOffset, 42);

    localChunks.push(localHeader, nameBytes, payload);
    centralChunks.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + payload.length;
  }

  const localSection = Buffer.concat(localChunks);
  const centralSection = Buffer.concat(centralChunks);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSection.length, 12);
  eocd.writeUInt32LE(localSection.length, 16);

  return new Uint8Array(Buffer.concat([localSection, centralSection, eocd]));
}

describe("extractZipEntry", () => {
  it("extracts a deflate-compressed entry by suffix", () => {
    const archive = createZipArchive([
      {name: "readme.txt", contents: "ignore me", method: 8},
      {name: "GPC as of May 2026 EN.json", contents: '{"LanguageCode":"EN"}', method: 8},
    ]);

    const extracted = extractZipEntry(archive, " EN.json");

    expect(Buffer.from(extracted).toString("utf8")).toBe('{"LanguageCode":"EN"}');
  });

  it("extracts a stored entry by suffix", () => {
    const archive = createZipArchive([{name: "data EN.json", contents: "stored payload", method: 0}]);

    expect(Buffer.from(extractZipEntry(archive, " EN.json")).toString("utf8")).toBe("stored payload");
  });

  it("throws when no entry matches the suffix", () => {
    const archive = createZipArchive([{name: "readme.txt", contents: "x", method: 8}]);

    expect(() => extractZipEntry(archive, " EN.json")).toThrow("ZIP entry ending with ' EN.json' was not found.");
  });

  it("throws when the end-of-central-directory record is missing", () => {
    expect(() => extractZipEntry(new Uint8Array(8), "anything")).toThrow(
      "ZIP end-of-central-directory record was not found.",
    );
  });

  it("throws for an unsupported compression method", () => {
    const archive = createZipArchive([{name: "data EN.json", contents: "x", method: 12}]);

    expect(() => extractZipEntry(archive, " EN.json")).toThrow("Unsupported ZIP compression method 12");
  });
});