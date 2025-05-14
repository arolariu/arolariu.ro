import prettyBytes from "pretty-bytes";
import type { FileComparisonItem, ScriptParams, WorkflowInfo } from "../types";
import getJestResultsSection from "../lib/jest-helper";

const BUNDLE_TARGET_FOLDERS: string[] = [
  "sites/arolariu.ro",
  "sites/api.arolariu.ro",
  "sites/docs.arolariu.ro",
];

/**
 * Retrieves file sizes for specified folders from a given git branch.
 * @param params - The script parameters (for core and exec).
 * @param branchName - The name of the branch (e.g., 'refs/remotes/origin/main', 'HEAD').
 * @param targetFolders - An array of folder paths to inspect.
 * @returns A map of file paths to their sizes in bytes.
 */
async function getFileSizesFromGit(
  params: ScriptParams,
  branchName: string,
  targetFolders: string[]
): Promise<Record<string, number>> {
  const { core, exec } = params;
  const filesMap: Record<string, number> = {};
  for (const folder of targetFolders) {
    try {
      const folderPath = folder.endsWith("/") ? folder.slice(0, -1) : folder;
      const { stdout, stderr, exitCode } = await exec.getExecOutput(
        `git ls-tree -r -l ${branchName} -- ${folderPath}`,
        [],
        { ignoreReturnCode: true, silent: true }
      );

      if (exitCode !== 0) {
        core.debug(
          `git ls-tree for branch '${branchName}' and folder '${folderPath}' exited with ${exitCode}. Stderr: ${
            stderr || "N/A"
          }`
        );
        if (stderr && stderr.includes("fatal: Not a valid object name")) {
          core.warning(
            `Branch '${branchName}' or path '${folderPath}' might not exist or was not fetched correctly for bundle size check.`
          );
        }
        continue;
      }

      if (!stdout || !stdout.trim()) {
        continue;
      }

      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        if (parts.length === 2) {
          const meta = parts[0].trim().split(/\s+/);
          if (meta.length === 4 && meta[1] === "blob") {
            const filePath = parts[1];
            const sizeStr = meta[3];
            if (sizeStr !== "-") {
              const size = parseInt(sizeStr, 10);
              if (!isNaN(size)) {
                filesMap[filePath] = size;
              } else {
                core.warning(
                  `Could not parse size '${sizeStr}' from ls-tree line: '${line}'`
                );
              }
            }
          }
        } else {
          core.warning(
            `Could not parse line from ls-tree (expected tab separator): '${line}'`
          );
        }
      }
    } catch (error) {
      const err = error as Error;
      core.error(
        `Error processing folder ${folder} for branch ${branchName} with git ls-tree: ${err.message}`
      );
    }
  }
  return filesMap;
}

/**
 * Generates the initial workflow information section for the PR comment.
 * @param workflowInfo - Basic workflow, PR, and job status information.
 * @returns Markdown string for the workflow info section.
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
}: WorkflowInfo): string {
  const statusEmoji =
    jobStatus === "success" ? "✅" : jobStatus === "failure" ? "❌" : "⚠️";
  const statusText = jobStatus.charAt(0).toUpperCase() + jobStatus.slice(1);

  let section = `## ${statusEmoji} Tests ${statusText} for [\`${shortCurrentCommitSha}\`](${commitUrl})\n\n`;
  section += `**PR:** [#${prNumber}](${prUrl}) | **Branch:** \`${branchName}\` | **Workflow:** [#${runId} Action](${workflowRunUrl})\n\n`;
  section += `----\n`;
  return section;
}

/**
 * Generates the branch comparison table section (commits, not bundle sizes).
 * @param params - The script parameters.
 * @param currentCommitSha - The full SHA of the current commit.
 * @param shortCurrentCommitSha - The short SHA of the current commit.
 * @returns Markdown string for the branch comparison section.
 */
async function getBranchCommitComparisonSection(
  params: ScriptParams,
  currentCommitSha: string,
  shortCurrentCommitSha: string
): Promise<string> {
  const { core, exec } = params;
  let section = `### 📊 Branch Comparison\n\n`;
  section += `| Branch          | SHA         | Commits vs. Main |\n`;
  section += `|-----------------|-------------|------------------|\n`;

  let mainBranchShaShort = "N/A";
  let commitsAhead = "N/A";

  try {
    await exec.getExecOutput(
      "git fetch origin main:refs/remotes/origin/main --depth=50"
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
    const err = error as Error;
    console.error(
      "Failed to get main branch information for commit comparison:",
      err.message
    );
    core.warning(
      `Failed to retrieve main branch information for commit comparison: ${err.message}.`
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
 * @param jobStatus - The status of the job (e.g., "success", "failure").
 * @param workflowRunUrl - The URL to the workflow run for artifact links.
 * @returns Markdown string for the Playwright test results section.
 */
function getPlaywrightResultsSection(
  jobStatus: string,
  workflowRunUrl: string
): string {
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

/**
 * Generates the bundle size comparison section with dropdowns for each target folder.
 * @param params - The script parameters.
 * @param targetFolders - An array of folder paths to compare.
 * @returns Markdown string for the bundle size comparison section.
 */
async function getBundleSizeComparisonSection(
  params: ScriptParams,
  targetFolders: string[]
): Promise<string> {
  const { core, exec } = params;
  let section = `### 📦 Bundle Size Analysis (vs. Main)\n\n`;
  let anyChangesOverall = false;

  try {
    await exec.getExecOutput(
      "git fetch origin main:refs/remotes/origin/main --depth=1 --no-tags --quiet"
    );
    const mainBranchFiles = await getFileSizesFromGit(
      params,
      "refs/remotes/origin/main",
      targetFolders
    );
    const previewBranchFiles = await getFileSizesFromGit(
      params,
      "HEAD",
      targetFolders
    );

    for (const folder of targetFolders) {
      const filesInFolder: FileComparisonItem[] = [];
      let folderMainTotalSize = 0;
      let folderPreviewTotalSize = 0;

      const relevantFilePaths = new Set<string>();
      Object.keys(mainBranchFiles).forEach((p) => {
        if (p.startsWith(folder + "/")) relevantFilePaths.add(p);
      });
      Object.keys(previewBranchFiles).forEach((p) => {
        if (p.startsWith(folder + "/")) relevantFilePaths.add(p);
      });

      for (const path of relevantFilePaths) {
        const mainSize = mainBranchFiles[path];
        const previewSize = previewBranchFiles[path];

        if (mainSize !== undefined) folderMainTotalSize += mainSize;
        if (previewSize !== undefined) folderPreviewTotalSize += previewSize;

        let status = "";
        let diff = 0;
        let changed = false;

        if (mainSize === undefined && previewSize !== undefined) {
          status = "Added";
          diff = previewSize;
          changed = true;
        } else if (mainSize !== undefined && previewSize === undefined) {
          status = "Removed";
          diff = -mainSize;
          changed = true;
        } else if (
          mainSize !== undefined &&
          previewSize !== undefined &&
          mainSize !== previewSize
        ) {
          // Ensure both are defined before comparing
          status = "Modified";
          diff = previewSize - mainSize;
          changed = true;
        }

        if (changed) {
          filesInFolder.push({ path, mainSize, previewSize, diff, status });
        }
      }

      const folderDiff = folderPreviewTotalSize - folderMainTotalSize;
      const numFilesChanged = filesInFolder.length;

      if (numFilesChanged > 0 || folderDiff !== 0) {
        anyChangesOverall = true;

        // Determine diff sign
        let diffSign = "";
        if (folderDiff > 0) {
          diffSign = "+";
        } else if (folderDiff < 0) {
          diffSign = "-";
        }

        const diffDisplay =
          folderDiff === 0
            ? "---"
            : `${diffSign}${prettyBytes(Math.abs(folderDiff))}`;

        let folderStatusText = "Modified";
        if (numFilesChanged === 0 && folderDiff !== 0)
          folderStatusText = "Size Changed";
        else if (
          folderPreviewTotalSize === 0 &&
          folderMainTotalSize > 0 &&
          numFilesChanged === relevantFilePaths.size
        )
          folderStatusText = "Removed";
        else if (
          folderMainTotalSize === 0 &&
          folderPreviewTotalSize > 0 &&
          numFilesChanged === relevantFilePaths.size
        )
          folderStatusText = "Added";
        else if (folderDiff === 0 && numFilesChanged > 0)
          folderStatusText = "Internally Modified";

        section += `<details>\n`;
        section += `<summary><strong>\`${folder}\`</strong> - Total Diff: ${diffDisplay} (Preview: ${prettyBytes(
          folderPreviewTotalSize
        )} vs Main: ${prettyBytes(
          folderMainTotalSize
        )}) - ${numFilesChanged} file(s) changed (${folderStatusText})</summary>\n\n`;

        if (numFilesChanged > 0) {
          section += `| File Path (relative to folder) | Main Branch | Preview Branch | Difference | Status   |\n`;
          section += `|--------------------------------|-------------|----------------|------------|----------|\n`;
          filesInFolder.sort((a, b) => a.path.localeCompare(b.path));
          for (const item of filesInFolder) {
            // Determine item diff sign
            let itemDiffSign = "";
            if (item.diff > 0) {
              itemDiffSign = "+";
            } else if (item.diff < 0) {
              itemDiffSign = "-";
            }

            const itemDiffDisplay =
              item.diff === 0
                ? "---"
                : `${itemDiffSign}${prettyBytes(Math.abs(item.diff))}`;
            const relativePath = item.path.substring(folder.length + 1);
            section += `| \`${relativePath}\` | ${prettyBytes(
              item.mainSize ?? 0 // Use ?? 0 to handle undefined for prettyBytes
            )} | ${prettyBytes(item.previewSize ?? 0)} | ${itemDiffDisplay} | ${
              item.status
            } |\n`;
          }
          section += `\n`;
        } else {
          section += `  _No individual file changes in this folder, but total size may have changed due to other factors._\n\n`;
        }
        section += `</details>\n\n`;
      } else {
        section += `<details>\n`;
        section += `<summary><strong>\`${folder}\`</strong> - No changes (Preview: ${prettyBytes(
          folderPreviewTotalSize
        )}, Main: ${prettyBytes(folderMainTotalSize)})</summary>\n`;
        section += `  _No file changes detected in this folder._\n\n`;
        section += `</details>\n\n`;
      }
    }

    if (!anyChangesOverall) {
      section +=
        "No significant changes in bundle sizes for monitored folders.\n\n";
    }
  } catch (error) {
    const err = error as Error;
    core.error(`Failed to generate bundle size comparison: ${err.message}`);
    section += `_Error generating bundle size comparison: ${err.message}_\n\n`;
    anyChangesOverall = true;
  }

  if (
    !anyChangesOverall &&
    !section.includes("_Error generating bundle size comparison")
  ) {
    return `### 📦 Bundle Size Analysis (vs. Main)\n\nNo significant changes in bundle sizes for monitored folders.\n\n----\n`;
  }

  section += `----\n`;
  return section;
}

/**
 * Main function to create a comment on a pull request with test and build results.
 * @param params - The script parameters.
 * @returns A promise that resolves when the comment is created or if the process is skipped.
 */
export default async (params: ScriptParams): Promise<void> => {
  const { github: octokit, context, core } = params;
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

  const jobStatus = process.env.JOB_STATUS ?? "unknown";
  const currentCommitSha = process.env.COMMIT_SHA;
  const runId = process.env.RUN_ID;
  const branchName = process.env.BRANCH_NAME;
  const repoOwner = context.repo.owner;
  const repoName = context.repo.repo;

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

  let commentBody = "";

  const workflowInfo: WorkflowInfo = {
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

  commentBody += await getBranchCommitComparisonSection(
    params,
    currentCommitSha,
    shortCurrentCommitSha
  );

  commentBody += await getJestResultsSection(core);

  commentBody += getPlaywrightResultsSection(jobStatus, workflowRunUrl);

  commentBody += await getBundleSizeComparisonSection(
    params,
    BUNDLE_TARGET_FOLDERS
  );
  try {
    await octokit.rest.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: prNumber,
      body: commentBody,
    });
    console.log(`Successfully commented on PR #${prNumber}.`);
  } catch (error) {
    const err = error as Error;
    core.setFailed(
      `Failed to create PR comment for PR #${prNumber}: ${err.message}`
    );
  }
};
