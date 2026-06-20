/**
 * @fileoverview Storybook mock for the `createInvoiceFromScans` server action.
 * @module app/domains/invoices/_storybook/mocks/actions/createInvoiceFromScans
 *
 * @remarks
 * The real action (`view-scans/_actions/createInvoiceFromScans`) is a `"use server"`
 * module that imports server-only instrumentation and fetch utilities, which cannot
 * execute in the Storybook browser runtime. This mock preserves the call signature
 * and returns an empty success result so the CreateInvoiceDialog story can mount.
 */

import type {Invoice} from "@/types/invoices";
import type {Scan} from "@/types/scans";

/** Input parameters mirroring the real action. */
type CreateInvoiceFromScansInput = Readonly<{
  scans: ReadonlyArray<Scan>;
  mode: "single" | "batch";
}>;

/** Output mirroring the real action. */
type CreateInvoiceFromScansOutput = Promise<
  Readonly<{
    invoices: Invoice[];
    convertedScanIds: string[];
    errors: Array<{scanId: string; error: string}>;
  }>
>;

/**
 * Mock implementation that resolves to an empty success result.
 *
 * @param input - The scans and creation mode (unused in the mock).
 * @returns An empty success result.
 */
export async function createInvoiceFromScans(input: CreateInvoiceFromScansInput): CreateInvoiceFromScansOutput {
  void input;
  return {invoices: [], convertedScanIds: [], errors: []};
}
