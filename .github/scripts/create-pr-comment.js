// .github/scripts/create-pr-comment.js
/**
 * Creates a comment on a pull request with test and build results.
 *
 * @param {object} params - The parameters object.
 * @param {object} params.github - The GitHub Octokit client.
 * @param {object} params.context - The GitHub Actions context.
 * @param {object} params.core - The GitHub Actions core helper.
 * @param {object} params.exec - The GitHub Actions exec helper.
 * @returns {Promise<void>} A promise that resolves when the comment is created or if the process is skipped.
 */
module.exports = async ({ github, context, core, exec }) => {
  // Retrieve PR_NUMBER from environment variables
  const prNumberStr = process.env.PR_NUMBER;

  // Validate PR_NUMBER
  if (
    !prNumberStr ||
    prNumberStr === "null" ||
    prNumberStr === "" ||
    prNumberStr === "undefined"
  ) {
    console.log(
      `No open PR found for this commit (PR_NUMBER: ${prNumberStr}), or PR_NUMBER env var not set correctly. Skipping comment.`
    );
    return;
  }

  const prNumber = parseInt(prNumberStr);
  if (isNaN(prNumber)) {
    console.log(`Invalid PR_NUMBER: ${prNumberStr}. Skipping comment.`);
    return;
  }

  // Retrieve other necessary environment variables
  const jobStatus = process.env.JOB_STATUS || "unknown"; // Default to 'unknown' if not set
  const currentCommitSha = process.env.COMMIT_SHA;
  const runId = process.env.RUN_ID;
  const branchName = process.env.BRANCH_NAME; // e.g., preview
  const repoOwner = context.repo.owner;
  const repoName = context.repo.repo;

  // Validate essential environment variables
  if (!currentCommitSha || !runId || !branchName) {
    core.setFailed(
      "Missing one or more essential environment variables (COMMIT_SHA, RUN_ID, BRANCH_NAME). Cannot create PR comment."
    );
    return;
  }

  const shortCurrentCommitSha = currentCommitSha.substring(0, 7);
  const workflowRunUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}`;

  // Initialize comment body
  let commentBody = `## Test & Build Results for Workflow Run [#${runId}](${workflowRunUrl})\\n\\n`;

  // --- Commit Information ---
  commentBody += `### Commit Information\\n`;
  commentBody += `**Preview Branch (\`${branchName}\`) SHA:** \`${shortCurrentCommitSha}\`\\n`;

  let mainBranchShaShort = "N/A"; // Default to N/A if main branch info can't be retrieved
  try {
    // Ensure the main branch is fetched with sufficient history.
    // Shallow clones might not have the main branch or enough history to compare.
    // Using --depth=0 fetches all history but can be slow. Adjust depth as needed.
    await exec.getExecOutput(
      "git fetch origin main:refs/remotes/origin/main --depth=50" // Fetched with a reasonable depth
    );
    const { stdout: mainShaFull } = await exec.getExecOutput(
      "git rev-parse refs/remotes/origin/main" // Get the full SHA of the local main branch reference
    );
    mainBranchShaShort = mainShaFull.trim().substring(0, 7);
    commentBody += `**Main Branch SHA:** \`${mainBranchShaShort}\`\\n`;

    // Get the number of commits the preview branch is ahead of the main branch
    const { stdout: commitsAheadOutput } = await exec.getExecOutput(
      `git rev-list --count refs/remotes/origin/main..${currentCommitSha}`
    );
    const commitsAhead = commitsAheadOutput.trim();
    commentBody += `**Commits Ahead of Main:** ${commitsAhead}\\n`;
  } catch (error) {
    console.error("Failed to get main branch information:", error.message);
    core.warning(
      `Failed to retrieve main branch information: ${error.message}. This might be due to a new repository, shallow clone, or the main branch not existing locally.`
    );
    commentBody += `**Main Branch SHA:** Error retrieving\\n`;
    commentBody += `**Commits Ahead of Main:** Error retrieving\\n`;
  }
  commentBody += `\\n`; // Add a newline for spacing

  // --- Playwright Test Results ---
  commentBody += `### Playwright Test Results\\n`;
  if (jobStatus === "success") {
    commentBody += "✅ All Playwright tests passed!\\n";
  } else if (jobStatus === "failure") {
    commentBody += "❌ Playwright tests failed.\\n";
  } else {
    commentBody += `⚠️ Playwright tests status: ${jobStatus}.\\n`;
  }
  commentBody += `🔗 [View Full Test Report Artifact](${workflowRunUrl}#artifacts)\\n\\n`;

  // --- Bundle Size Analysis (Placeholder) ---
  commentBody += `### Bundle Size Analysis (vs Main Branch)\\n`;
  commentBody += `_Bundle size comparison is planned. This section will show changes for folders in \`sites/\` (e.g., \`arolariu.ro\`, \`api.arolariu.ro\`, \`docs.arolariu.ro\`)._\\n`;
  commentBody += `_To implement this, the workflow needs to be updated to calculate and provide bundle size data from both the 'main' branch and this 'preview' branch._\\n\\n`;

  // --- Create Comment ---
  try {
    await github.rest.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: prNumber,
      body: commentBody,
    });
    console.log(`Successfully commented on PR #${prNumber}.`);
  } catch (error) {
    console.error(`Failed to comment on PR #${prNumber}: ${error.message}`);
    core.setFailed(`Failed to comment on PR #${prNumber}: ${error.message}`);
    // Provide more specific feedback based on error status
    if (error.status === 404) {
      console.log(
        "PR not found. It might have been closed, merged, or the PR number is incorrect."
      );
    } else if (error.status === 403) {
      console.log(
        "Permission denied. Ensure the GITHUB_TOKEN has 'issues:write' or 'pull-requests:write' permission."
      );
    } else {
      console.log(
        `Received status ${error.status} when trying to comment: ${error.message}`
      );
    }
  }
};
