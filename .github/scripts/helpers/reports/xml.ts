/**
 * @fileoverview Validated XML primitives shared by JUnit and TRX decoders.
 * @module github/scripts/helpers/reports/xml
 * @internal
 */
import {XMLParser, XMLValidator} from "fast-xml-parser";
import {count, finite, record, text} from "./validation.ts";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
});

/** Validates syntax before exposing an unknown-valued document. */
export function document(xml: string): Record<string, unknown> {
  if (XMLValidator.validate(xml) !== true) throw new TypeError("Invalid XML report syntax");
  const parsed: unknown = parser.parse(xml);
  return record(parsed, "XML report");
}

/** Accepts an empty XML element or a structured element, not arbitrary text. */
export function node(value: unknown, field: string): Record<string, unknown> {
  return value === "" ? {} : record(value, field);
}

/** Normalizes the XML parser's single/multiple element representation. */
export function elements(value: unknown): readonly unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

/** Reads an optional string attribute without coercing objects. */
export function attribute(value: Record<string, unknown>, name: string): string | undefined {
  const field = value[`@_${name}`];
  return field === undefined ? undefined : text(field, `XML ${name}`);
}

/** Requires a numeric XML attribute; counters additionally require safe integers. */
export function numeric(value: string, field: string, integer = false): number {
  if (!/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) throw new TypeError(`Invalid XML ${field}: expected nonnegative number`);
  return integer ? count(Number(value), field) : finite(Number(value), field);
}

/** Reads text content without rendering arbitrary object values. */
export function content(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  const field = record(value, "XML text")["#text"];
  return field === undefined ? undefined : text(field, "XML text");
}
