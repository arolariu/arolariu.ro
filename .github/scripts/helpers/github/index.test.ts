/**
 * @fileoverview GitHub broker contracts over real Octokit pagination and mocked transport.
 * @module github/scripts/helpers/github/tests
 */
import * as github from "@actions/github";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {GitHub} from "../sdk/github-utils.ts";
import {createGitHubHelper, type IGitHubHelper, type OctokitClient} from "./index.ts";

vi.mock("@actions/github", async (original) => ({
  ...(await original<typeof import("@actions/github")>()),
  getOctokit: vi.fn(),
}));

function reply(value: unknown, link?: string): Response {
  return new Response(JSON.stringify(value), {status: 200, headers: {"content-type": "application/json", ...(link ? {link} : {})}});
}
function comment(id: number, body: string | null = "body"): Record<string, unknown> {
  return {
    id,
    body,
    user: {login: "writer"},
    created_at: "2026-01-01",
    updated_at: "2026-01-02",
    html_url: `https://github.com/o/r/issues/1#issuecomment-${id}`,
  };
}
function issue(number = 42): Record<string, unknown> {
  return {
    number,
    title: "Test",
    body: "Body",
    state: "open",
    html_url: `https://github.com/o/r/issues/${number}`,
    labels: ["bug", {name: "urgent"}],
    assignees: [{login: "developer"}],
  };
}

describe("GitHubHelper", () => {
  let fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>;
  let client: OctokitClient;
  let helper: IGitHubHelper;
  let context: typeof github.context;

  beforeEach(() => {
    vi.resetAllMocks();
    fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error("Unconfigured test transport"));
    client = new GitHub({auth: "opaque", request: {fetch}});
    vi.mocked(github.getOctokit).mockReturnValue(client);
    context = {
      ...github.context,
      repo: {owner: "test-owner", repo: "test-repo"},
      issue: {owner: "test-owner", repo: "test-repo", number: 123},
      payload: {},
    };
    helper = createGitHubHelper("opaque", context);
  });
  afterEach(() => vi.restoreAllMocks());

  it("retains injected complete client identity and avoids constructing another", () => {
    const injected = new GitHub({request: {fetch}});
    vi.mocked(github.getOctokit).mockClear();
    expect(createGitHubHelper("opaque", context, {client: injected}).getClient()).toBe(injected);
    expect(github.getOctokit).not.toHaveBeenCalled();
  });

  it("retains repository and PR context without requiring an API request", () => {
    context.payload = {
      pull_request: {
        number: 123,
        title: "PR",
        html_url: "https://github.com/o/r/pull/123",
        state: "open",
        base: {ref: "main"},
        head: {ref: "feature"},
        user: {login: "writer"},
      },
    };
    expect(helper.getRepository()).toEqual({owner: "test-owner", name: "test-repo", fullName: "test-owner/test-repo"});
    expect(helper.getPullRequest()).toEqual({
      number: 123,
      title: "PR",
      url: "https://github.com/o/r/pull/123",
      state: "open",
      base: "main",
      head: "feature",
      author: "writer",
    });
    context.payload = {};
    expect(helper.getPullRequest()).toBeNull();
  });

  it("updates a substring marker found beyond the first page without an author-policy change", async () => {
    fetch
      .mockResolvedValueOnce(
        reply([comment(1, "regular")], '<https://api.github.com/repos/test-owner/test-repo/issues/123/comments?page=2>; rel="next"'),
      )
      .mockResolvedValueOnce(reply([comment(99, "prefix <!-- existing-marker --> suffix")]))
      .mockResolvedValueOnce(reply(comment(99, "new body")));
    expect((await helper.upsertComment(123, "new body", "existing-marker")).id).toBe(99);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(String(fetch.mock.calls[2]?.[0])).toContain("/issues/comments/99");
    expect(fetch.mock.calls[2]?.[1]?.method).toBe("PATCH");
  });

  it("creates a comment only after a successful empty marker lookup", async () => {
    fetch.mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply(comment(100, "new")));
    expect((await helper.upsertComment(123, "new", "marker")).id).toBe(100);
    expect(String(fetch.mock.calls[1]?.[0])).toContain("/issues/123/comments");
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("POST");
  });

  it("lists and normalizes all comment pages", async () => {
    fetch
      .mockResolvedValueOnce(
        reply([comment(1)], '<https://api.github.com/repos/test-owner/test-repo/issues/123/comments?page=2>; rel="next"'),
      )
      .mockResolvedValueOnce(reply([{...comment(2, null), user: null}]));
    const comments = await helper.listPullRequestComments(123);
    expect(comments.map((value) => value.id)).toEqual([1, 2]);
    expect(comments[1]).toMatchObject({body: "", author: "unknown", createdAt: "2026-01-01", updatedAt: "2026-01-02"});
  });

  it("does not find a marker absent from a successful list", async () => {
    fetch.mockResolvedValue(reply([comment(1, "ordinary")]));
    expect(await helper.findComment(123, "absent")).toBeNull();
  });

  it("shapes direct comment creation/update/deletion requests", async () => {
    fetch
      .mockResolvedValueOnce(reply(comment(1, "posted")))
      .mockResolvedValueOnce(reply(comment(1, "updated")))
      .mockResolvedValueOnce(reply({}));
    expect((await helper.postPullRequestComment(123, "posted")).body).toBe("posted");
    expect((await helper.updateComment(1, "updated")).body).toBe("updated");
    await helper.deleteComment(1);
    expect(fetch.mock.calls.map((call) => call[1]?.method)).toEqual(["POST", "PATCH", "DELETE"]);
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({body: "posted"});
  });

  it.each([
    {labels: undefined, assignees: undefined},
    {labels: ["bug"], assignees: undefined},
    {labels: undefined, assignees: ["developer"]},
    {labels: ["bug"], assignees: ["developer"]},
  ])("preserves optional create-issue fields $labels/$assignees", async ({labels, assignees}) => {
    fetch.mockResolvedValue(reply(issue()));
    expect((await helper.createIssue("Test", "Body", labels, assignees)).number).toBe(42);
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      title: "Test",
      body: "Body",
      ...(labels ? {labels} : {}),
      ...(assignees ? {assignees} : {}),
    });
  });

  it.each([{body: "updated"}, {title: "updated", body: "body", state: "closed" as const, labels: ["bug"], assignees: ["developer"]}])(
    "forwards issue updates without adding unrelated fields",
    async (updates) => {
      fetch.mockResolvedValue(reply({...issue(), ...updates}));
      await helper.updateIssue(42, updates);
      expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual(updates);
    },
  );

  it("retains issue fields and normalizes nullable metadata", async () => {
    fetch.mockResolvedValueOnce(reply(issue())).mockResolvedValueOnce(reply({...issue(), body: null, labels: [{}], assignees: null}));
    expect(await helper.getIssue(42)).toMatchObject({number: 42, labels: ["bug", "urgent"], assignees: ["developer"]});
    expect(await helper.getIssue(42)).toMatchObject({body: "", labels: [""], assignees: []});
  });

  it("paginates issues using existing filters", async () => {
    fetch
      .mockResolvedValueOnce(reply([issue(1)], '<https://api.github.com/repos/test-owner/test-repo/issues?page=2>; rel="next"'))
      .mockResolvedValueOnce(reply([issue(2)]));
    expect(
      (await helper.listIssues({state: "closed", labels: ["bug", "urgent"], assignee: "developer"})).map((value) => value.number),
    ).toEqual([1, 2]);
    const request = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(request.searchParams.get("labels")).toBe("bug,urgent");
    expect(request.searchParams.get("state")).toBe("closed");
    expect(request.searchParams.get("assignee")).toBe("developer");
  });

  it.each([{}, {state: "all" as const}, {labels: ["bug"]}, {assignee: "developer"}])(
    "retains independent list filters %j",
    async (options) => {
      fetch.mockResolvedValue(reply([]));
      expect(await helper.listIssues(options)).toEqual([]);
      const request = new URL(String(fetch.mock.calls[0]?.[0]));
      expect(request.searchParams.get("state")).toBe("state" in options ? options.state : "open");
      expect(request.searchParams.get("labels")).toBe("labels" in options ? options.labels?.join(",") : null);
      expect(request.searchParams.get("assignee")).toBe("assignee" in options ? options.assignee : null);
    },
  );

  it("adds and removes all requested labels", async () => {
    fetch.mockResolvedValue(reply([]));
    await helper.addLabels(123, ["bug", "enhancement"]);
    await helper.removeLabels(123, ["bug", "wontfix"]);
    expect(fetch.mock.calls.map((call) => call[1]?.method)).toEqual(["POST", "DELETE", "DELETE"]);
    expect(String(fetch.mock.calls[2]?.[0])).toContain("/labels/wontfix");
  });

  it("returns null only for a successful empty branch lookup", async () => {
    fetch.mockResolvedValue(reply([]));
    expect(await helper.findPullRequestForBranch("feature")).toBeNull();
    expect(new URL(String(fetch.mock.calls[0]?.[0])).searchParams.get("head")).toBe("test-owner:feature");
  });

  it("maps an existing open branch PR", async () => {
    fetch.mockResolvedValue(
      reply([
        {
          number: 123,
          title: "PR",
          html_url: "https://github.com/o/r/pull/123",
          state: "open",
          base: {ref: "main"},
          head: {ref: "feature"},
          user: {login: "writer"},
        },
      ]),
    );
    expect(await helper.findPullRequestForBranch("feature")).toMatchObject({number: 123, base: "main", head: "feature", author: "writer"});
  });

  it("preserves branch lookup failure rather than returning no PR", async () => {
    const failure = new Error("Lookup denied");
    vi.spyOn(client.rest.pulls, "list").mockRejectedValue(failure);
    await expect(helper.findPullRequestForBranch("feature")).rejects.toBe(failure);
  });

  it.each([
    {method: "createComment", run: (): Promise<unknown> => helper.postPullRequestComment(123, "body")},
    {method: "updateComment", run: (): Promise<unknown> => helper.updateComment(1, "body")},
    {method: "deleteComment", run: (): Promise<unknown> => helper.deleteComment(1)},
    {method: "create", run: (): Promise<unknown> => helper.createIssue("title", "body")},
    {method: "update", run: (): Promise<unknown> => helper.updateIssue(42, {body: "body"})},
    {method: "get", run: (): Promise<unknown> => helper.getIssue(42)},
    {method: "addLabels", run: (): Promise<unknown> => helper.addLabels(42, ["bug"])},
    {method: "removeLabel", run: (): Promise<unknown> => helper.removeLabels(42, ["bug"])},
  ] as const)("retains native $method error identity", async ({method, run}) => {
    const failure = new Error("Native endpoint failure");
    vi.spyOn(client.rest.issues, method).mockRejectedValue(failure);
    await expect(run()).rejects.toBe(failure);
  });

  it.each(["comments", "issues"])("retains native %s pagination errors", async (kind) => {
    const failure = new Error("Pagination failed");
    vi.spyOn(client, "paginate").mockRejectedValue(failure);
    await expect(kind === "comments" ? helper.listPullRequestComments(123) : helper.listIssues()).rejects.toBe(failure);
  });
});
