/**
 * @fileoverview GitHub issue creation utilities for test failures
 * @module lib/issue-creator
 */

import type {OctokitClient, RepositoryInfo} from "../types/index.ts";
import type {CreateIssueParams} from "../types/workflow-types.ts";
import {MAX_ISSUE_SEARCH_RESULTS} from "./constants.ts";

/**
 * Creates a new GitHub issue with the provided parameters
 * @param octokit - Authenticated GitHub API client (Octokit instance)
 * @param repo - Target repository information (owner and name)
 * @param params - Issue creation parameters (title, body, labels, assignees)
 * @returns Promise resolving to object with created issue's URL and number
 * @throws {Error} If API request fails or authentication is invalid
 * @example
 * ```typescript
 * const issue = await createGitHubIssue(
 *   octokit,
 *   { owner: 'arolariu', name: 'arolariu.ro' },
 *   {
 *     title: 'Test Failed',
 *     body: 'Details...',
 *     labels: ['bug'],
 *     assignees: ['arolariu']
 *   }
 * );
 * console.log(`Created issue #${issue.number}: ${issue.url}`);
 * ```
 */
export async function createGitHubIssue(
  octokit: OctokitClient,
  repo: RepositoryInfo,
  params: CreateIssueParams,
): Promise<{url: string; number: number}> {
  try {
    const issueParams: {
      owner: string;
      repo: string;
      title: string;
      body: string;
      labels: string[];
      assignees?: string[];
    } = {
      owner: repo.owner,
      repo: repo.name,
      title: params.title,
      body: params.body,
      labels: params.labels,
    };

    if (params.assignees) {
      issueParams.assignees = params.assignees;
    }

    console.log(`Creating GitHub issue in ${repo.owner}/${repo.name}: "${params.title}"`);
    const response = await octokit.rest.issues.create(issueParams);

    console.log(`✓ Created issue #${response.data.number}: ${response.data.html_url}`);
    return {
      url: response.data.html_url,
      number: response.data.number,
    };
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to create GitHub issue in ${repo.owner}/${repo.name}: ${err.message}`);
  }
}

/**
 * Searches for existing issues matching a title pattern to prevent duplicates
 * @param octokit - Authenticated GitHub API client (Octokit instance)
 * @param repo - Target repository information (owner and name)
 * @param titlePattern - Text pattern to search for within issue titles
 * @param labels - Optional array of label names to filter results
 * @returns Promise resolving to array of matching issues with number, title, and state
 * @throws {Error} If API request fails or authentication is invalid
 * @example
 * ```typescript
 * const existing = await findExistingIssues(
 *   octokit,
 *   { owner: 'arolariu', name: 'arolariu.ro' },
 *   '2025-10-20',
 *   ['automated-test-failure']
 * );
 * const openIssues = existing.filter(issue => issue.state === 'open');
 * if (openIssues.length > 0) {
 *   console.log(`Found ${openIssues.length} open issues for today`);
 * }
 * ```
 */
export async function findExistingIssues(
  octokit: OctokitClient,
  repo: RepositoryInfo,
  titlePattern: string,
  labels?: string[],
): Promise<Array<{number: number; title: string; state: string}>> {
  try {
    const query = [
      `repo:${repo.owner}/${repo.name}`,
      `is:issue`,
      `"${titlePattern}" in:title`,
      ...(labels ? labels.map((label) => `label:"${label}"`) : []),
    ].join(" ");

    console.log(`Searching for existing issues with pattern: "${titlePattern}"`);
    const response = await octokit.rest.search.issuesAndPullRequests({
      q: query,
      per_page: MAX_ISSUE_SEARCH_RESULTS,
    });

    const issues = response.data.items.map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
    }));

    console.log(`Found ${issues.length} existing issue(s)`);
    return issues;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to search for existing issues in ${repo.owner}/${repo.name}: ${err.message}`);
  }
}

/**
 * Updates the body content of an existing GitHub issue
 * @param octokit - Authenticated GitHub API client (Octokit instance)
 * @param repo - Target repository information (owner and name)
 * @param issueNumber - The issue number to update
 * @param body - New markdown content for the issue body
 * @returns Promise that resolves when the update is complete
 * @throws {Error} If issue doesn't exist, API request fails, or authentication is invalid
 * @example
 * ```typescript
 * await updateGitHubIssue(
 *   octokit,
 *   { owner: 'arolariu', name: 'arolariu.ro' },
 *   123,
 *   '## Updated\n\nNew information...'
 * );
 * ```
 */
export async function updateGitHubIssue(octokit: OctokitClient, repo: RepositoryInfo, issueNumber: number, body: string): Promise<void> {
  try {
    console.log(`Updating issue #${issueNumber} in ${repo.owner}/${repo.name}`);
    await octokit.rest.issues.update({
      owner: repo.owner,
      repo: repo.name,
      issue_number: issueNumber,
      body,
    });
    console.log(`✓ Successfully updated issue #${issueNumber}`);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to update issue #${issueNumber} in ${repo.owner}/${repo.name}: ${err.message}`);
  }
}

/**
 * Adds a comment to an existing GitHub issue
 * @param octokit - Authenticated GitHub API client (Octokit instance)
 * @param repo - Target repository information (owner and name)
 * @param issueNumber - The issue number to comment on
 * @param body - Markdown content for the comment
 * @returns Promise that resolves when the comment is created
 * @throws {Error} If issue doesn't exist, API request fails, or authentication is invalid
 * @example
 * ```typescript
 * await addIssueComment(
 *   octokit,
 *   { owner: 'arolariu', name: 'arolariu.ro' },
 *   123,
 *   'Additional test results:\n- All tests passed'
 * );
 * ```
 */
export async function addIssueComment(octokit: OctokitClient, repo: RepositoryInfo, issueNumber: number, body: string): Promise<void> {
  try {
    console.log(`Adding comment to issue #${issueNumber} in ${repo.owner}/${repo.name}`);
    await octokit.rest.issues.createComment({
      owner: repo.owner,
      repo: repo.name,
      issue_number: issueNumber,
      body,
    });
    console.log(`✓ Successfully added comment to issue #${issueNumber}`);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to add comment to issue #${issueNumber} in ${repo.owner}/${repo.name}: ${err.message}`);
  }
}
