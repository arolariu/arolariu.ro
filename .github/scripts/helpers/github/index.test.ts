/**
 * @fileoverview Unit tests for github helper.
 * @module github/scripts/helpers/github/tests
 *
 * @remarks
 * Uses a mocked Octokit client to validate request shaping.
 */

import * as github from "@actions/github";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createGitHubHelper} from "./index";

// Mock @actions/github
vi.mock("@actions/github", () => ({
  getOctokit: vi.fn(),
  context: {
    payload: {
      pull_request: {
        number: 123,
      },
    },
    repo: {
      owner: "test-owner",
      repo: "test-repo",
    },
  },
}));

describe("GitHubHelper", () => {
  let mockOctokit: any;
  let ghHelper: ReturnType<typeof createGitHubHelper>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOctokit = {
      rest: {
        issues: {
          createComment: vi.fn(),
          updateComment: vi.fn(),
          listComments: vi.fn(),
          deleteComment: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          get: vi.fn(),
          list: vi.fn(),
          listForRepo: vi.fn(),
          addLabels: vi.fn(),
          removeLabel: vi.fn(),
        },
        repos: {
          get: vi.fn(),
        },
      },
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);
    ghHelper = createGitHubHelper("fake-token");
  });

  describe("getPullRequest", () => {
    it("should return PR context from payload", () => {
      // Update mock to have full PR object
      const originalPayload = github.context.payload;
      github.context.payload = {
        pull_request: {
          number: 123,
          title: "Test PR",
          html_url: "https://github.com/test/repo/pull/123",
          state: "open",
          base: {ref: "main"},
          head: {ref: "feature"},
          user: {login: "test-user"},
        },
      };

      const pr = ghHelper.getPullRequest();

      expect(pr?.number).toBe(123);
      expect(pr?.title).toBe("Test PR");

      github.context.payload = originalPayload;
    });

    it("should return null when not in PR context", () => {
      const originalPayload = github.context.payload;
      github.context.payload = {};

      const pr = ghHelper.getPullRequest();

      expect(pr).toBeNull();

      github.context.payload = originalPayload;
    });
  });

  describe("postPullRequestComment", () => {
    it("should create a comment on PR", async () => {
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: {id: 456, body: "Test comment"},
      });

      const result = await ghHelper.postPullRequestComment(123, "Test comment");

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        issue_number: 123,
        body: "Test comment",
      });
      expect(result.id).toBe(456);
    });
  });

  describe("updateComment", () => {
    it("should update existing comment", async () => {
      mockOctokit.rest.issues.updateComment.mockResolvedValue({
        data: {id: 456, body: "Updated comment"},
      });

      const result = await ghHelper.updateComment(456, "Updated comment");

      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        comment_id: 456,
        body: "Updated comment",
      });
      expect(result.body).toBe("Updated comment");
    });
  });

  describe("deleteComment", () => {
    it("should delete comment", async () => {
      mockOctokit.rest.issues.deleteComment.mockResolvedValue({});

      await ghHelper.deleteComment(456);

      expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        comment_id: 456,
      });
    });
  });

  describe("findComment", () => {
    it("should find comment by identifier", async () => {
      const comments = [
        {id: 1, body: "Regular comment"},
        {id: 2, body: "Comment with <!-- test-id --> identifier"},
        {id: 3, body: "Another regular comment"},
      ];

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: comments,
      });

      const result = await ghHelper.findComment(123, "test-id");

      expect(result?.id).toBe(2);
    });

    it("should return null when identifier not found", async () => {
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [{id: 1, body: "Regular comment"}],
      });

      const result = await ghHelper.findComment(123, "nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("upsertComment", () => {
    it("should update existing comment", async () => {
      const existingComment = {
        id: 456,
        body: "Old <!-- test-id --> content",
      };

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [existingComment],
      });

      mockOctokit.rest.issues.updateComment.mockResolvedValue({
        data: {id: 456, body: "New content"},
      });

      const result = await ghHelper.upsertComment(123, "New content", "test-id");

      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalled();
      expect(result.id).toBe(456);
    });

    it("should create new comment when none exists", async () => {
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: {id: 789, body: "New comment"},
      });

      const result = await ghHelper.upsertComment(123, "New comment", "test-id");

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
      expect(result.id).toBe(789);
    });
  });

  describe("createIssue", () => {
    it("should create an issue", async () => {
      mockOctokit.rest.issues.create.mockResolvedValue({
        data: {
          number: 42,
          title: "Test Issue",
          body: "Issue body",
          state: "open",
          html_url: "https://github.com/test/repo/issues/42",
          user: {login: "test-user"},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          labels: [],
          assignees: [],
        },
      });

      const result = await ghHelper.createIssue("Test Issue", "Issue body");

      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        title: "Test Issue",
        body: "Issue body",
      });
      expect(result.number).toBe(42);
    });

    it("should create issue with labels", async () => {
      mockOctokit.rest.issues.create.mockResolvedValue({
        data: {
          number: 42,
          title: "Test",
          body: "Body",
          state: "open",
          html_url: "https://github.com/test/repo/issues/42",
          user: {login: "test-user"},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          labels: [{name: "bug"}, {name: "high-priority"}],
          assignees: [],
        },
      });

      await ghHelper.createIssue("Test", "Body", ["bug", "high-priority"]);

      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: ["bug", "high-priority"],
        }),
      );
    });

    it("should create issue with assignees", async () => {
      mockOctokit.rest.issues.create.mockResolvedValue({
        data: {
          number: 43,
          title: "Test",
          body: "Body",
          state: "open",
          html_url: "https://github.com/test/repo/issues/43",
          user: {login: "test-user"},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          labels: [],
          assignees: [{login: "dev1"}],
        },
      });

      await ghHelper.createIssue("Test", "Body", undefined, ["dev1"]);

      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assignees: ["dev1"],
        }),
      );
    });

    it("should create issue with labels and assignees", async () => {
      mockOctokit.rest.issues.create.mockResolvedValue({
        data: {
          number: 44,
          title: "Test",
          body: "Body",
          state: "open",
          html_url: "https://github.com/test/repo/issues/44",
          user: {login: "test-user"},
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          labels: [{name: "bug"}],
          assignees: [{login: "dev1"}],
        },
      });

      await ghHelper.createIssue("Test", "Body", ["bug"], ["dev1"]);

      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: ["bug"],
          assignees: ["dev1"],
        }),
      );
    });
  });

  describe("addLabels", () => {
    it("should add labels to issue", async () => {
      mockOctokit.rest.issues.addLabels.mockResolvedValue({
        data: [],
      });

      await ghHelper.addLabels(123, ["bug", "enhancement"]);

      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        issue_number: 123,
        labels: ["bug", "enhancement"],
      });
    });
  });

  describe("getRepository", () => {
    it("should return repository information", () => {
      const info = ghHelper.getRepository();

      expect(info.name).toBe("test-repo");
      expect(info.fullName).toBe("test-owner/test-repo");
      expect(info.owner).toBe("test-owner");
    });
  });

  describe("listPullRequestComments", () => {
    it("should list all comments on PR", async () => {
      const comments = [
        {
          id: 1,
          body: "First comment",
          user: {login: "user1"},
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
          html_url: "https://github.com/...",
        },
        {
          id: 2,
          body: "Second comment",
          user: {login: "user2"},
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
          html_url: "https://github.com/...",
        },
      ];

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: comments,
      });

      const result = await ghHelper.listPullRequestComments(123);

      expect(result).toHaveLength(2);
      expect(result[0]?.body).toBe("First comment");
      expect(result[1]?.author).toBe("user2");
    });

    it("should handle errors when listing comments", async () => {
      mockOctokit.rest.issues.listComments.mockRejectedValue(new Error("API error"));

      await expect(ghHelper.listPullRequestComments(123)).rejects.toThrow("Failed to list PR comments: API error");
    });
  });

  describe("updateIssue", () => {
    it("should update issue with all fields", async () => {
      mockOctokit.rest.issues.update.mockResolvedValue({
        data: {
          number: 42,
          title: "Updated Title",
          body: "Updated body",
          state: "closed",
          html_url: "https://github.com/test/repo/issues/42",
          labels: [{name: "bug"}],
          assignees: [{login: "developer"}],
        },
      });

      const result = await ghHelper.updateIssue(42, {
        title: "Updated Title",
        body: "Updated body",
        state: "closed",
        labels: ["bug"],
        assignees: ["developer"],
      });

      expect(result.title).toBe("Updated Title");
      expect(result.state).toBe("closed");
      expect(result.labels).toContain("bug");
    });

    it("should update issue with partial fields", async () => {
      mockOctokit.rest.issues.update.mockResolvedValue({
        data: {
          number: 42,
          title: "Original Title",
          body: "Updated body only",
          state: "open",
          html_url: "https://github.com/test/repo/issues/42",
          labels: [],
          assignees: [],
        },
      });

      await ghHelper.updateIssue(42, {body: "Updated body only"});

      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 42,
          body: "Updated body only",
        }),
      );
    });

    it("should throw error on update failure", async () => {
      mockOctokit.rest.issues.update.mockRejectedValue(new Error("Not found"));

      await expect(ghHelper.updateIssue(999, {title: "Update"})).rejects.toThrow("Failed to update issue: Not found");
    });
  });

  describe("getIssue", () => {
    it("should get issue information", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          number: 42,
          title: "Test Issue",
          body: "Issue body",
          state: "open",
          html_url: "https://github.com/test/repo/issues/42",
          labels: [{name: "bug"}, {name: "high-priority"}],
          assignees: [{login: "dev1"}, {login: "dev2"}],
        },
      });

      const result = await ghHelper.getIssue(42);

      expect(result.number).toBe(42);
      expect(result.title).toBe("Test Issue");
      expect(result.labels).toEqual(["bug", "high-priority"]);
      expect(result.assignees).toEqual(["dev1", "dev2"]);
    });

    it("should throw error when issue not found", async () => {
      mockOctokit.rest.issues.get.mockRejectedValue(new Error("Issue not found"));

      await expect(ghHelper.getIssue(999)).rejects.toThrow("Failed to get issue: Issue not found");
    });
  });

  describe("listIssues", () => {
    it("should list open issues by default", async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [
          {number: 1, title: "Issue 1", body: "Body 1", state: "open", html_url: "...", labels: [], assignees: []},
          {number: 2, title: "Issue 2", body: "Body 2", state: "open", html_url: "...", labels: [], assignees: []},
        ],
      });

      const result = await ghHelper.listIssues();

      expect(result).toHaveLength(2);
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: "open",
        }),
      );
    });

    it("should list issues with filters", async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
      });

      await ghHelper.listIssues({
        state: "closed",
        labels: ["bug", "urgent"],
        assignee: "developer1",
      });

      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: "closed",
          labels: "bug,urgent",
          assignee: "developer1",
        }),
      );
    });

    it("should list issues with only state filter", async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
      });

      await ghHelper.listIssues({state: "all"});

      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: "all",
        }),
      );
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.not.objectContaining({
          labels: expect.anything(),
          assignee: expect.anything(),
        }),
      );
    });

    it("should list issues with only labels filter", async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
      });

      await ghHelper.listIssues({labels: ["bug"]});

      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: "bug",
        }),
      );
    });

    it("should list issues with only assignee filter", async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
      });

      await ghHelper.listIssues({assignee: "developer1"});

      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: "developer1",
        }),
      );
    });

    it("should handle string labels in issue list", async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [
          {
            number: 1,
            title: "Issue",
            body: "Body",
            state: "open",
            html_url: "...",
            labels: ["bug" as any], // Some API responses have string labels
            assignees: [],
          },
        ],
      });

      const result = await ghHelper.listIssues();

      expect(result[0]?.labels).toEqual(["bug"]);
    });

    it("should throw error on list failure", async () => {
      mockOctokit.rest.issues.listForRepo.mockRejectedValue(new Error("API rate limit"));

      await expect(ghHelper.listIssues()).rejects.toThrow("Failed to list issues: API rate limit");
    });
  });

  describe("removeLabels", () => {
    it("should remove labels from issue", async () => {
      mockOctokit.rest.issues.removeLabel.mockResolvedValue({data: {}});

      await ghHelper.removeLabels(123, ["bug", "wontfix"]);

      expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 123,
          name: "bug",
        }),
      );
      expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 123,
          name: "wontfix",
        }),
      );
    });

    it("should throw error on remove failure", async () => {
      mockOctokit.rest.issues.removeLabel.mockRejectedValue(new Error("Label not found"));

      await expect(ghHelper.removeLabels(123, ["nonexistent"])).rejects.toThrow("Failed to remove labels: Label not found");
    });
  });

  describe("getClient", () => {
    it("should return Octokit client", () => {
      const client = ghHelper.getClient();

      expect(client).toBe(mockOctokit);
    });
  });

  describe("error handling", () => {
    it("should handle post comment errors", async () => {
      mockOctokit.rest.issues.createComment.mockRejectedValue(new Error("Permission denied"));

      await expect(ghHelper.postPullRequestComment(123, "Test")).rejects.toThrow("Failed to post PR comment: Permission denied");
    });

    it("should handle update comment errors", async () => {
      mockOctokit.rest.issues.updateComment.mockRejectedValue(new Error("Comment not found"));

      await expect(ghHelper.updateComment(456, "Updated")).rejects.toThrow("Failed to update comment 456: Comment not found");
    });

    it("should handle delete comment errors", async () => {
      mockOctokit.rest.issues.deleteComment.mockRejectedValue(new Error("Access denied"));

      await expect(ghHelper.deleteComment(456)).rejects.toThrow("Failed to delete comment 456: Access denied");
    });

    it("should handle create issue errors", async () => {
      mockOctokit.rest.issues.create.mockRejectedValue(new Error("Invalid input"));

      await expect(ghHelper.createIssue("Test", "Body")).rejects.toThrow("Failed to create issue: Invalid input");
    });

    it("should handle add labels errors", async () => {
      mockOctokit.rest.issues.addLabels.mockRejectedValue(new Error("Labels not found"));

      await expect(ghHelper.addLabels(123, ["invalid"])).rejects.toThrow("Failed to add labels: Labels not found");
    });
  });

  describe("edge cases", () => {
    it("should handle missing user in comment response", async () => {
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: {id: 456, body: "Test", user: null, created_at: "2024-01-01", updated_at: "2024-01-01", html_url: "..."},
      });

      const result = await ghHelper.postPullRequestComment(123, "Test");

      expect(result.author).toBe("unknown");
    });

    it("should handle missing body in comment response", async () => {
      mockOctokit.rest.issues.updateComment.mockResolvedValue({
        data: {id: 456, body: null, user: {login: "user"}, created_at: "2024-01-01", updated_at: "2024-01-01", html_url: "..."},
      });

      const result = await ghHelper.updateComment(456, "Updated");

      expect(result.body).toBe("");
    });

    it("should handle missing issue body", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {number: 42, title: "Test", body: null, state: "open", html_url: "...", labels: [], assignees: []},
      });

      const result = await ghHelper.getIssue(42);

      expect(result.body).toBe("");
    });

    it("should handle issue with assignees undefined", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {number: 42, title: "Test", body: "Body", state: "open", html_url: "...", labels: [], assignees: undefined},
      });

      const result = await ghHelper.getIssue(42);

      expect(result.assignees).toEqual([]);
    });

    it("should handle labels with missing name", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {number: 42, title: "Test", body: "Body", state: "open", html_url: "...", labels: [{name: undefined as any}], assignees: []},
      });

      const result = await ghHelper.getIssue(42);

      expect(result.labels).toEqual([""]);
    });
  });
});
