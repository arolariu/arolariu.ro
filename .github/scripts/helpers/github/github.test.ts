/**
 * @fileoverview Unit tests for github helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGitHubHelper } from './index';
import * as github from '@actions/github';

// Mock @actions/github
vi.mock('@actions/github', () => ({
  getOctokit: vi.fn(),
  context: {
    payload: {
      pull_request: {
        number: 123
      }
    },
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    }
  }
}));

describe('GitHubHelper', () => {
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
          list: vi.fn(),
          addLabels: vi.fn(),
          removeLabel: vi.fn()
        },
        repos: {
          get: vi.fn()
        }
      }
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);
    ghHelper = createGitHubHelper('fake-token');
  });

  describe('getPullRequest', () => {
    it('should return PR number from context', () => {
      const pr = ghHelper.getPullRequest();
      
      expect(pr).toEqual({ number: 123 });
    });

    it('should return null when not in PR context', () => {
      const originalPayload = github.context.payload;
      github.context.payload = {};
      
      const pr = ghHelper.getPullRequest();
      
      expect(pr).toBeNull();
      
      github.context.payload = originalPayload;
    });
  });

  describe('postPullRequestComment', () => {
    it('should create a comment on PR', async () => {
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 456, body: 'Test comment' }
      });

      const result = await ghHelper.postPullRequestComment(123, 'Test comment');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: 'Test comment'
      });
      expect(result.id).toBe(456);
    });
  });

  describe('updateComment', () => {
    it('should update existing comment', async () => {
      mockOctokit.rest.issues.updateComment.mockResolvedValue({
        data: { id: 456, body: 'Updated comment' }
      });

      const result = await ghHelper.updateComment(456, 'Updated comment');

      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 456,
        body: 'Updated comment'
      });
      expect(result.body).toBe('Updated comment');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment', async () => {
      mockOctokit.rest.issues.deleteComment.mockResolvedValue({});

      await ghHelper.deleteComment(456);

      expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 456
      });
    });
  });

  describe('findComment', () => {
    it('should find comment by identifier', async () => {
      const comments = [
        { id: 1, body: 'Regular comment' },
        { id: 2, body: 'Comment with <!-- test-id --> identifier' },
        { id: 3, body: 'Another regular comment' }
      ];

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: comments
      });

      const result = await ghHelper.findComment(123, 'test-id');

      expect(result?.id).toBe(2);
    });

    it('should return null when identifier not found', async () => {
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [{ id: 1, body: 'Regular comment' }]
      });

      const result = await ghHelper.findComment(123, 'nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('upsertComment', () => {
    it('should update existing comment', async () => {
      const existingComment = { 
        id: 456, 
        body: 'Old <!-- test-id --> content' 
      };

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [existingComment]
      });

      mockOctokit.rest.issues.updateComment.mockResolvedValue({
        data: { id: 456, body: 'New content' }
      });

      const result = await ghHelper.upsertComment(
        123,
        'New content',
        'test-id'
      );

      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalled();
      expect(result.id).toBe(456);
    });

    it('should create new comment when none exists', async () => {
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      });

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 789, body: 'New comment' }
      });

      const result = await ghHelper.upsertComment(
        123,
        'New comment',
        'test-id'
      );

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
      expect(result.id).toBe(789);
    });
  });

  describe('createIssue', () => {
    it('should create an issue', async () => {
      mockOctokit.rest.issues.create.mockResolvedValue({
        data: { 
          number: 42, 
          title: 'Test Issue',
          body: 'Issue body' 
        }
      });

      const result = await ghHelper.createIssue('Test Issue', 'Issue body');

      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Test Issue',
        body: 'Issue body'
      });
      expect(result.number).toBe(42);
    });

    it('should create issue with labels', async () => {
      mockOctokit.rest.issues.create.mockResolvedValue({
        data: { number: 42, title: 'Test', body: 'Body' }
      });

      await ghHelper.createIssue('Test', 'Body', ['bug', 'high-priority']);

      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: ['bug', 'high-priority']
        })
      );
    });
  });

  describe('addLabels', () => {
    it('should add labels to issue', async () => {
      mockOctokit.rest.issues.addLabels.mockResolvedValue({
        data: []
      });

      await ghHelper.addLabels(123, ['bug', 'enhancement']);

      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        labels: ['bug', 'enhancement']
      });
    });
  });

  describe('getRepoInfo', () => {
    it('should return repository information', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          name: 'test-repo',
          full_name: 'test-owner/test-repo',
          default_branch: 'main'
        }
      });

      const info = await ghHelper.getRepoInfo();

      expect(info.name).toBe('test-repo');
      expect(info.full_name).toBe('test-owner/test-repo');
    });
  });
});
