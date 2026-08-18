/**
 * @fileoverview Real-module tests for the merchant analysis form.
 * @module app/domains/invoices/_components/analysis/MerchantAnalysisForm.test
 */

import {
  ANALYSIS_API_URL,
  getAnalysisApiRequests,
  installAnalysisFetchHandler,
  type AnalysisFetchRequest,
} from "@/../tests/helpers/analysisBoundary";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../tests/helpers/analysis";
import {MerchantAnalysisForm} from "./MerchantAnalysisForm";

const merchantIdentifier = "22222222-2222-4222-8222-222222222222";
const response = {
  runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  targetType: "merchant",
  targetId: merchantIdentifier,
  status: "queued",
  profile: "comprehensive",
  acceptedCapabilities: ["merchantClassification", "descriptionGeneration"],
  acceptedAt: "2026-08-17T19:40:42.187Z",
} as const;

function getOnlyApiRequest(): AnalysisFetchRequest {
  const requestAtBoundary = getAnalysisApiRequests()[0];
  if (!requestAtBoundary) {
    throw new Error("Expected the form to submit through the real API boundary.");
  }

  return requestAtBoundary;
}

describe("MerchantAnalysisForm", () => {
  beforeEach(() => {
    installAnalysisFetchHandler((requestAtBoundary) => {
      const body = requestAtBoundary.init?.body;
      const requestBody = typeof body === "string" ? (JSON.parse(body) as {overrides?: Record<string, unknown>}) : {};
      const merchantClassification = requestBody.overrides?.["merchantClassification"];
      const hasDisabledClassification =
        typeof merchantClassification === "object"
        && merchantClassification !== null
        && "enabled" in merchantClassification
        && merchantClassification["enabled"] === false;
      const acceptedResponse = hasDisabledClassification
        ? {
            ...response,
            acceptedCapabilities: ["descriptionGeneration"],
            profile: "custom",
          }
        : response;

      return new Response(JSON.stringify(acceptedResponse), {status: 202, statusText: "Accepted"});
    });
  });

  it("exposes only NACE and description overrides with accessible fieldsets", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <MerchantAnalysisForm merchantIdentifier={merchantIdentifier} />
      </AnalysisTestProvider>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Analysis profile"})).toBeInTheDocument();
    expect(screen.getByRole("group", {name: "Merchant analysis capabilities"})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "NACE classification"})).toBeChecked();
    expect(screen.getByRole("checkbox", {name: "Generate merchant description"})).toBeChecked();
    expect(screen.queryByRole("checkbox", {name: "Document extraction"})).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", {name: "Product classification"})).not.toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("checkbox", {name: "NACE classification"}));
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    await waitFor(() => {
      expect(getOnlyApiRequest()).toMatchObject({
        url: `${ANALYSIS_API_URL}/rest/v1/merchants/${merchantIdentifier}/analyze`,
        init: expect.objectContaining({method: "POST"}),
      });
    });
    expect(getOnlyApiRequest().init?.body).toBe(
      JSON.stringify({
        profile: "comprehensive",
        overrides: {merchantClassification: {enabled: false}},
      }),
    );
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Analysis is queued. This page will refresh automatically; processing may continue afterward.",
      );
    });
  });

  it("ignores an invalid DOM profile value and preserves the last valid request", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <MerchantAnalysisForm merchantIdentifier={merchantIdentifier} />
      </AnalysisTestProvider>,
    );
    const balancedProfile = screen.getByRole("radio", {name: "Balanced"});
    await user.click(balancedProfile);

    // Act
    fireEvent.change(balancedProfile, {target: {value: "unexpected-profile"}});
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    await waitFor(() => {
      expect(getAnalysisApiRequests()).toHaveLength(1);
    });
    expect(getOnlyApiRequest().init?.body).toBe(JSON.stringify({profile: "balanced", overrides: {}}));
  });

  it("applies the fast profile baseline and protects the last enabled control", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <MerchantAnalysisForm merchantIdentifier={merchantIdentifier} />
      </AnalysisTestProvider>,
    );

    // Act
    await user.click(screen.getByRole("radio", {name: "Fast"}));

    // Assert
    expect(screen.getByRole("checkbox", {name: "Generate merchant description"})).not.toBeChecked();
    expect(screen.getByRole("checkbox", {name: "NACE classification"})).toBeDisabled();
  });
});
