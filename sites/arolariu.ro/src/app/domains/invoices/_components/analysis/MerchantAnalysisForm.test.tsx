/**
 * @fileoverview Unit tests for the merchant analysis form.
 * @module app/domains/invoices/_components/analysis/MerchantAnalysisForm.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
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
const stubFetchBffUser = vi.mocked(fetchBFFUserFromAuthService);
const stubFetchWithTimeout = vi.mocked(fetchWithTimeout);
const labels = {
  balanced: "forms.invoices.analysis.profiles.balanced",
  capabilities: "forms.invoices.analysis.merchant.capabilitiesLegend",
  descriptionGeneration: "forms.invoices.analysis.merchantCapabilities.descriptionGeneration",
  fast: "forms.invoices.analysis.profiles.fast",
  naceClassification: "forms.invoices.analysis.merchantCapabilities.naceClassification",
  profile: "forms.invoices.analysis.merchant.profileLegend",
  start: "forms.invoices.analysis.buttons.start",
} as const;

describe("MerchantAnalysisForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubFetchBffUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1", user: null});
    stubFetchWithTimeout.mockImplementation((_url, options) => {
      const requestBody = typeof options?.body === "string" ? (JSON.parse(options.body) as {overrides?: Record<string, unknown>}) : {};
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

      return Promise.resolve(new Response(JSON.stringify(acceptedResponse), {status: 202, statusText: "Accepted"}));
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
    expect(screen.getByRole("group", {name: labels.profile})).toBeInTheDocument();
    expect(screen.getByRole("group", {name: labels.capabilities})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: labels.naceClassification})).toBeChecked();
    expect(screen.getByRole("checkbox", {name: labels.descriptionGeneration})).toBeChecked();
    expect(screen.queryByRole("checkbox", {name: "forms.invoices.analysis.capabilities.documentExtraction"})).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", {name: "forms.invoices.analysis.capabilities.productClassification"})).not.toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("checkbox", {name: labels.naceClassification}));
    await user.click(screen.getByRole("button", {name: labels.start}));

    // Assert
    await waitFor(() => {
      expect(stubFetchWithTimeout).toHaveBeenCalledWith(
        `/rest/v1/merchants/${merchantIdentifier}/analyze`,
        expect.objectContaining({method: "POST"}),
        15_000,
      );
    });
    const requestOptions = stubFetchWithTimeout.mock.calls[0]?.[1];
    expect(typeof requestOptions?.body).toBe("string");
    if (typeof requestOptions?.body === "string") {
      expect(JSON.parse(requestOptions.body) as unknown).toEqual({
        profile: "comprehensive",
        overrides: {merchantClassification: {enabled: false}},
      });
    }
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("forms.invoices.analysis.status.queued");
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
    const balancedProfile = screen.getByRole("radio", {name: labels.balanced});
    await user.click(balancedProfile);

    // Act
    fireEvent.change(balancedProfile, {target: {value: "unexpected-profile"}});
    await user.click(screen.getByRole("button", {name: labels.start}));

    // Assert
    await waitFor(() => {
      expect(stubFetchWithTimeout).toHaveBeenCalledOnce();
    });
    const requestOptions = stubFetchWithTimeout.mock.calls[0]?.[1];
    expect(typeof requestOptions?.body).toBe("string");
    if (typeof requestOptions?.body === "string") {
      expect(JSON.parse(requestOptions.body) as unknown).toEqual({profile: "balanced", overrides: {}});
    }
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
    await user.click(screen.getByRole("radio", {name: labels.fast}));

    // Assert
    expect(screen.getByRole("checkbox", {name: labels.descriptionGeneration})).not.toBeChecked();
    expect(screen.getByRole("checkbox", {name: labels.naceClassification})).toBeDisabled();
  });
});
