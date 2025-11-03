/**
 * @fileoverview Unit tests for artifacts helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createArtifactsHelper } from './index';
import * as artifact from '@actions/artifact';

// Mock @actions/artifact
vi.mock('@actions/artifact');

describe('ArtifactsHelper', () => {
  let mockArtifactClient: any;
  let artifactsHelper: ReturnType<typeof createArtifactsHelper>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockArtifactClient = {
      uploadArtifact: vi.fn(),
      downloadArtifact: vi.fn(),
      listArtifacts: vi.fn()
    };

    vi.mocked(artifact.create).mockReturnValue(mockArtifactClient);
    artifactsHelper = createArtifactsHelper();
  });

  describe('uploadDirectory', () => {
    it('should upload directory as artifact', async () => {
      mockArtifactClient.uploadArtifact.mockResolvedValue({
        artifactName: 'test-artifact',
        artifactItems: ['file1.txt', 'file2.txt'],
        size: 1024
      });

      const result = await artifactsHelper.uploadDirectory(
        'test-artifact',
        '/path/to/directory'
      );

      expect(result.artifactName).toBe('test-artifact');
      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalledWith(
        'test-artifact',
        expect.any(Array),
        '/path/to/directory',
        expect.objectContaining({
          retentionDays: 90
        })
      );
    });

    it('should use custom retention days', async () => {
      mockArtifactClient.uploadArtifact.mockResolvedValue({
        artifactName: 'test-artifact',
        artifactItems: [],
        size: 0
      });

      await artifactsHelper.uploadDirectory(
        'test-artifact',
        '/path/to/directory',
        { retentionDays: 30 }
      );

      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({
          retentionDays: 30
        })
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload single file as artifact', async () => {
      mockArtifactClient.uploadArtifact.mockResolvedValue({
        artifactName: 'single-file',
        artifactItems: ['report.json'],
        size: 512
      });

      const result = await artifactsHelper.uploadFile(
        'single-file',
        '/path/to/report.json'
      );

      expect(result.artifactName).toBe('single-file');
      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalled();
    });
  });

  describe('downloadArtifact', () => {
    it('should download artifact', async () => {
      mockArtifactClient.downloadArtifact.mockResolvedValue({
        artifactName: 'test-artifact',
        downloadPath: '/downloads/test-artifact'
      });

      const result = await artifactsHelper.downloadArtifact('test-artifact');

      expect(result.artifactName).toBe('test-artifact');
      expect(mockArtifactClient.downloadArtifact).toHaveBeenCalledWith(
        'test-artifact',
        undefined
      );
    });

    it('should download to specific path', async () => {
      mockArtifactClient.downloadArtifact.mockResolvedValue({
        artifactName: 'test-artifact',
        downloadPath: '/custom/path'
      });

      await artifactsHelper.downloadArtifact('test-artifact', '/custom/path');

      expect(mockArtifactClient.downloadArtifact).toHaveBeenCalledWith(
        'test-artifact',
        '/custom/path'
      );
    });
  });

  describe('listArtifacts', () => {
    it('should list all artifacts', async () => {
      mockArtifactClient.listArtifacts.mockResolvedValue({
        artifacts: [
          { name: 'artifact-1', size: 1024 },
          { name: 'artifact-2', size: 2048 }
        ]
      });

      const result = await artifactsHelper.listArtifacts();

      expect(result.artifacts).toHaveLength(2);
      expect(result.artifacts[0].name).toBe('artifact-1');
      expect(mockArtifactClient.listArtifacts).toHaveBeenCalled();
    });

    it('should return empty list when no artifacts', async () => {
      mockArtifactClient.listArtifacts.mockResolvedValue({
        artifacts: []
      });

      const result = await artifactsHelper.listArtifacts();

      expect(result.artifacts).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw error on upload failure', async () => {
      mockArtifactClient.uploadArtifact.mockRejectedValue(
        new Error('Upload failed')
      );

      await expect(
        artifactsHelper.uploadDirectory('test', '/path')
      ).rejects.toThrow('Upload failed');
    });

    it('should throw error on download failure', async () => {
      mockArtifactClient.downloadArtifact.mockRejectedValue(
        new Error('Download failed')
      );

      await expect(
        artifactsHelper.downloadArtifact('test')
      ).rejects.toThrow('Download failed');
    });
  });
});
