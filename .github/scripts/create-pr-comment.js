// .github/scripts/create-pr-comment.js
/**
 * @typedef {object} ScriptParams
 * @property {object} github - The GitHub Octokit client.
 * @property {object} context - The GitHub Actions context.
 * @property {object} core - The GitHub Actions core helper.
 * @property {object} exec - The GitHub Actions exec helper.
 */

/**
 * @typedef {object} WorkflowInfo
 * @property {number} prNumber - The Pull Request number.
 * @property {string} prUrl - The URL to the Pull Request.
 * @property {string} runId - The GitHub Actions run ID.
 * @property {string} workflowRunUrl - The URL to the workflow run.
 * @property {string} shortCurrentCommitSha - The short SHA of the current commit.
 * @property {string} commitUrl - The URL to the current commit.
 * @property {string} branchName - The name of the current branch.
 * @property {string} jobStatus - The status of the job.
 */

const BUNDLE_TARGET_FOLDERS = ['sites/arolariu.ro', 'sites/api.arolariu.ro', 'sites/docs.arolariu.ro'];

/**
 * Formats bytes into a human-readable string (KB, MB, GB).
 * @param {number | undefined} bytes - The number of bytes.
 * @param {number} [decimals=2] - The number of decimal places.
 * @returns {string} Human-readable file size or '---' if bytes is undefined.
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === undefined || bytes === null || isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '---';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) return `${(bytes / Math.pow(k, sizes.length -1 )).toFixed(dm)} ${sizes[sizes.length -1]}`;
  return `${(bytes / Math.pow(k, i)).toFixed(dm)} ${sizes[i]}`;
}

/**
 * Retrieves file sizes for specified folders from a given git branch.
 * @param {ScriptParams} params - The script parameters (for core and exec).
 * @param {string} branchName - The name of the branch (e.g., 'refs/remotes/origin/main', 'HEAD').
 * @param {string[]} targetFolders - An array of folder paths to inspect.
 * @returns {Promise<Record<string, number>>} A map of file paths to their sizes in bytes.
 */
async function getFileSizesFromGit(params, branchName, targetFolders) {
  const { core, exec } = params;
  const filesMap = {};
  for (const folder of targetFolders) {
    try {
      const folderPath = folder.endsWith('/') ? folder.slice(0, -1) : folder;
      const { stdout, stderr, exitCode } = await exec.getExecOutput(
        `git ls-tree -r -l ${branchName} -- ${folderPath}`,
        [],
        { ignoreReturnCode: true }
      );

      if (exitCode !== 0) {
        core.info(`git ls-tree for branch '${branchName}' and folder '${folderPath}' exited with ${exitCode}. Stderr: ${stderr || 'N/A'}`);
        if (stderr && stderr.includes("fatal: Not a valid object name")) {
          core.warning(`Branch '${branchName}' or path '${folderPath}' might not exist or was not fetched correctly.`);
        }
        // Continue, as some folders might exist and others not, or the folder might be empty.
      }

      if (!stdout || !stdout.trim()) {
        core.info(`No files found by git ls-tree for branch '${branchName}' in folder '${folderPath}'.`);
        continue;
      }

      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split('\t');
        if (parts.length === 2) {
          const meta = parts[0].trim().split(/\s+/);
          if (meta.length === 4 && meta[1] === 'blob') {
            const filePath = parts[1];
            const sizeStr = meta[3];
            if (sizeStr !== '-') {
              const size = parseInt(sizeStr, 10);
              if (!isNaN(size)) {
                filesMap[filePath] = size;
              } else {
                core.warning(`Could not parse size '${sizeStr}' from ls-tree line: '${line}'`);
              }
            }
          }
        } else {
          core.warning(`Could not parse line from ls-tree (expected tab separator): '${line}'`);
        }
      }
    } catch (error) {
      core.error(`Error processing folder ${folder} for branch ${branchName} with git ls-tree: ${error.message}`);
    }
  }
  return filesMap;
}

/**
 * Generates the initial workflow information section for the PR comment.
 * @param {WorkflowInfo} workflowInfo - Basic workflow, PR, and job status information.
 * @returns {string} Markdown string for the workflow info section.
 */
function getWorkflowInfoSection({
  prNumber,
  prUrl,
  runId,
  workflowRunUrl,
  shortCurrentCommitSha,
  commitUrl,
  branchName,
  jobStatus,
}) {
  const statusEmoji =
    jobStatus === "success" ? "✅" : jobStatus === "failure" ? "❌" : "⚠️";
  // Capitalize first letter of jobStatus
  const statusText = jobStatus.charAt(0).toUpperCase() + jobStatus.slice(1);

  let section = `## ${statusEmoji} Tests ${statusText} for [\`${shortCurrentCommitSha}\`](${commitUrl})\n\n`;
  section += `**PR:** [#${prNumber}](${prUrl}) | **Branch:** \`${branchName}\` | **Workflow:** [#${runId} Action](${workflowRunUrl})\n\n`;
  section += `----\n`;
  return section;
}

/**
 * Generates the branch comparison table section.
 * @param {ScriptParams} params - The script parameters.
 * @param {string} currentCommitSha - The full SHA of the current commit.
 * @param {string} shortCurrentCommitSha - The short SHA of the current commit.
 * @returns {Promise<string>} Markdown string for the branch comparison section.
 */
async function getBranchComparisonSection(
  params,
  currentCommitSha,
  shortCurrentCommitSha
) {
  const { core, exec } = params;
  let section = `### 📊 Branch Comparison\n\n`;
  section += `| Branch          | SHA         | Commits vs. Main |\n`;
  section += `|-----------------|-------------|------------------|\n`;

  let mainBranchShaShort = "N/A";
  let commitsAhead = "N/A";

  try {
    await exec.getExecOutput(
      "git fetch origin main:refs/remotes/origin/main --depth=500"
    );
    const { stdout: mainShaFull } = await exec.getExecOutput(
      "git rev-parse refs/remotes/origin/main"
    );
    mainBranchShaShort = mainShaFull.trim().substring(0, 7);

    const { stdout: commitsAheadOutput } = await exec.getExecOutput(
      `git rev-list --count refs/remotes/origin/main..${currentCommitSha}`
    );
    commitsAhead = commitsAheadOutput.trim();
  } catch (error) {
    console.error("Failed to get main branch information:", error.message);
    core.warning(
      `Failed to retrieve main branch information: ${error.message}. This might be due to a new repository, shallow clone, or the main branch not existing locally.`
    );
    mainBranchShaShort = "Error";
    commitsAhead = "Error";
  }

  section += `| **Preview**     | \`${shortCurrentCommitSha}\` | ${commitsAhead}          |\n`;
  section += `| **Main**        | \`${mainBranchShaShort}\` | N/A              |\n\n`;
  section += `----\n`;
  return section;
}

/**
 * Generates the Playwright test results section.
 * @param {string} jobStatus - The status of the job (e.g., "success", "failure").
 * @param {string} workflowRunUrl - The URL to the workflow run for artifact links.
 * @returns {string} Markdown string for the Playwright test results section.
 */
function getPlaywrightResultsSection(jobStatus, workflowRunUrl) {
  const statusEmoji =
    jobStatus === "success" ? "✅" : jobStatus === "failure" ? "❌" : "⚠️";
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

/**
 * Generates the bundle size comparison section.
 * @param {ScriptParams} params - The script parameters.
 * @param {string[]} targetFolders - An array of folder paths to compare.
 * @returns {Promise<string>} Markdown string for the bundle size comparison section.
 */
async function getBundleSizeComparisonSection(params, targetFolders) {
  const { core, exec } = params;
  let section = `### 📦 Bundle Size Analysis (vs. Main)\n\n`;

  try {
    // Ensure main branch is fetched
    await exec.getExecOutput("git fetch origin main:refs/remotes/origin/main --depth=1 --no-tags --quiet");

    const mainBranchFiles = await getFileSizesFromGit(params, 'refs/remotes/origin/main', targetFolders);
    const previewBranchFiles = await getFileSizesFromGit(params, 'HEAD', targetFolders);

    const comparisonResults = [];
    const allFilePaths = new Set([...Object.keys(mainBranchFiles), ...Object.keys(previewBranchFiles)]);

    for (const path of allFilePaths) {
      const mainSize = mainBranchFiles[path];
      const previewSize = previewBranchFiles[path];
      let status = '';
      let diff = 0;

      if (mainSize === undefined && previewSize !== undefined) {
        status = 'Added';
        diff = previewSize;
      } else if (mainSize !== undefined && previewSize === undefined) {
        status = 'Removed';
        diff = -mainSize;
      } else if (mainSize !== previewSize) {
        status = 'Modified';
        diff = (previewSize || 0) - (mainSize || 0);
      } else {
        continue; // No change in size or presence
      }
      comparisonResults.push({ path, mainSize, previewSize, diff, status });
    }

    comparisonResults.sort((a, b) => a.path.localeCompare(b.path));

    if (comparisonResults.length === 0) {
      section += "No significant changes in bundle sizes for monitored folders.\n\n";
    } else {
      section += `| File Path                 | Main Branch | Preview Branch | Difference | Status   |\n`;
      section += `|---------------------------|-------------|----------------|------------|----------|\n`;
      for (const item of comparisonResults) {
        const diffSign = item.diff > 0 ? '+' : (item.diff < 0 ? '-' : '');
        const diffDisplay = item.diff === 0 ? '---' : `${diffSign}${formatBytes(Math.abs(item.diff))}`;
        const mainDisplay = formatBytes(item.mainSize);
        const previewDisplay = formatBytes(item.previewSize);
        section += `| \`${item.path}\` | ${mainDisplay} | ${previewDisplay} | ${diffDisplay} | ${item.status} |\n`;
      }
      section += '\n';
    }
  } catch (error) {
    core.error(`Failed to generate bundle size comparison: ${error.message}`);
    section += `_Error generating bundle size comparison: ${error.message}_\n\n`;
  }
  return section;
}

/**
 * Main function to create a comment on a pull request with test and build results.
 * @param {ScriptParams} params - The script parameters.
 * @returns {Promise<void>} A promise that resolves when the comment is created or if the process is skipped.
 */
module.exports = async (params) => {
  const { github, context, core, exec } = params;
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
  const commitUrl = `https://github.com/${repoOwner}/${repoName}/commit/${currentCommitSha}`;
  const prUrl = `https://github.com/${repoOwner}/${repoName}/pull/${prNumber}`;

  // --- Initialize Comment Body ---
  let commentBody = "";

  const workflowInfo = {
    prNumber,
    prUrl,
    runId,
    workflowRunUrl,
    shortCurrentCommitSha,
    commitUrl,
    branchName,
    jobStatus,
  };
  commentBody += getWorkflowInfoSection(workflowInfo);

  commentBody += await getBranchComparisonSection(
    params,
    currentCommitSha,
    shortCurrentCommitSha
  );

  commentBody += getPlaywrightResultsSection(jobStatus, workflowRunUrl);

  commentBody += await getBundleSizeComparisonSection(params, BUNDLE_TARGET_FOLDERS);

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
