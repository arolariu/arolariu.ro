/**
 * @fileoverview Render regression test for the real AnalyzeDialog Storybook story.
 * @module app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog.story.test
 */

import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../../tests/helpers/analysis";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {OpenAnalyzeDialogStory} from "./AnalyzeDialog.stories";

describe("AnalyzeDialog Storybook story", () => {
  it("opens the real dialog only after its context payload is available", async () => {
    // Act
    render(
      <AnalysisTestProvider>
        <DialogProvider>
          <OpenAnalyzeDialogStory />
        </DialogProvider>
      </AnalysisTestProvider>,
    );

    // Assert
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
