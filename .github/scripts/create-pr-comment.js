// .github/scripts/create-pr-comment.js
module.exports = async ({ github, context, core, exec }) => {
  const prNumberStr = process.env.PR_NUMBER;

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

  const jobStatus = process.env.JOB_STATUS;
  const currentCommitSha = process.env.COMMIT_SHA; // Full SHA from github.sha
  const shortCurrentCommitSha = currentCommitSha.substring(0, 7);
  const runId = process.env.RUN_ID;
  const branchName = process.env.BRANCH_NAME; // e.g., preview
  const repoOwner = context.repo.owner;
  const repoName = context.repo.repo;
  const workflowRunUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}`;

  let commentBody = `## Test & Build Results for Workflow Run [#${runId}](${workflowRunUrl})\\n\\n`;

  // --- Commit Information ---
  commentBody += `### Commit Information\\n`;
  commentBody += `**Preview Branch (\`${branchName}\`) SHA:** \`${shortCurrentCommitSha}\`\\n`;

  let mainBranchShaShort = "";
  try {
    // Ensure main is fetched. This is crucial if the runner does a shallow clone.
    await exec.getExecOutput(
      "git fetch origin main:refs/remotes/origin/main --depth=10000"
    ); // Fetch with more history if needed
    const { stdout: mainShaFull } = await exec.getExecOutput(
      "git rev-parse refs/remotes/origin/main"
    );
    mainBranchShaShort = mainShaFull.trim().substring(0, 7);
    commentBody += `**Main Branch SHA:** \`${mainBranchShaShort}\`\\n`;

    // Get commits ahead of main
    const { stdout: commitsAheadOutput } = await exec.getExecOutput(
      `git rev-list --count refs/remotes/origin/main..${currentCommitSha}`
    );
    const commitsAhead = commitsAheadOutput.trim();
    commentBody += `**Commits Ahead of Main:** ${commitsAhead}\\n`;
  } catch (error) {
    console.error("Failed to get main branch information:", error.message);
    core.warning(
      `Failed to retrieve main branch information: ${error.message}`
    );
    commentBody += `**Main Branch SHA:** Error retrieving\\n`;
    commentBody += `**Commits Ahead of Main:** Error retrieving\\n`;
  }
  commentBody += `\\n`;

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
    if (error.status === 404) {
      console.log("PR not found, it might have been closed or merged.");
    } else if (error.status === 403) {
      console.log(
        "Permission denied. Ensure GITHUB_TOKEN has issues:write or pull-requests:write permission."
      );
    }
  }
};
