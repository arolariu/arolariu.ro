/**
 * Generates the Playwright test results section.
 * @param jobStatus - The status of the job (e.g., "success", "failure").
 * @param workflowRunUrl - The URL to the workflow run for artifact links.
 * @returns Markdown string for the Playwright test results section.
 */
export default async function getPlaywrightResultsSection(jobStatus: string, workflowRunUrl: string): Promise<string> {
  let statusEmoji: string;
  if (jobStatus === "success") {
    statusEmoji = "✅";
  } else if (jobStatus === "failure") {
    statusEmoji = "❌";
  } else {
    statusEmoji = "⚠️";
  }

  let testStatusMessage = "";
  if (jobStatus === "success") {
    testStatusMessage = "All Playwright tests passed!";
  } else if (jobStatus === "failure") {
    testStatusMessage = "Playwright tests failed.";
  } else {
    testStatusMessage = `Playwright tests status: ${jobStatus}.`;
  }
  let section = `### ${statusEmoji} Playwright Tests\n\n`;
  section += `${testStatusMessage} ([View Full Report](${workflowRunUrl}#artifacts))\n\n`;
  section += `----\n`;
  return section;
}
