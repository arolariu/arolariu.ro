/** @format */

"use client";

import {useReportWebVitals} from "next/web-vitals";

// TODO: Implement the Web Vitals reporting.

/**
 * This function sets up the Web Vitals reporting.
 * @returns The Web Vitals reporting component.
 */
export function WebVitals() {
  useReportWebVitals((report) => console.log(report));
  return <></>;
}
