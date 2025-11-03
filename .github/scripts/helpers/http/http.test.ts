/**
 * @fileoverview Unit tests for HTTP helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHttpHelper } from './index';
import * as httpClient from '@actions/http-client';

// Mock @actions/http-client
vi.mock('@actions/http-client');

describe('HttpHelper', () => {
  let mockClient: any;
  let httpHelper: ReturnType<typeof createHttpHelper>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      del: vi.fn(),
      head: vi.fn()
    };

    vi.mocked(httpClient.HttpClient).mockImplementation(() => mockClient);
    httpHelper = createHttpHelper();
  });

  describe('get', () => {
    it('should perform GET request and return JSON', async () => {
      const mockResponse = {
        statusCode: 200,
        readBody: vi.fn().mockResolvedValue(JSON.stringify({ data: 'test' }))
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await httpHelper.get<{ data: string }>('https://api.example.com/data');

      expect(mockClient.get).toHaveBeenCalledWith('https://api.example.com/data', undefined);
      expect(result).toEqual({ data: 'test' });
    });

    it('should pass custom headers', async () => {
      const mockResponse = {
        statusCode: 200,
        readBody: vi.fn().mockResolvedValue('{}')
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await httpHelper.get('https://api.example.com/data', {
        'Authorization': 'Bearer token'
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.example.com/data',
        { 'Authorization': 'Bearer token' }
      );
    });

    it('should throw error on non-200 status', async () => {
      const mockResponse = {
        statusCode: 404,
        readBody: vi.fn().mockResolvedValue('Not Found')
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await expect(
        httpHelper.get('https://api.example.com/notfound')
      ).rejects.toThrow('HTTP request failed with status 404');
    });
  });

  describe('post', () => {
    it('should perform POST request with JSON body', async () => {
      const mockResponse = {
        statusCode: 201,
        readBody: vi.fn().mockResolvedValue(JSON.stringify({ id: 123 }))
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await httpHelper.post<{ id: number }>(
        'https://api.example.com/items',
        { name: 'test' }
      );

      expect(result).toEqual({ id: 123 });
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.example.com/items',
        JSON.stringify({ name: 'test' }),
        expect.objectContaining({
          'Content-Type': 'application/json'
        })
      );
    });

    it('should merge custom headers with Content-Type', async () => {
      const mockResponse = {
        statusCode: 201,
        readBody: vi.fn().mockResolvedValue('{}')
      };

      mockClient.post.mockResolvedValue(mockResponse);

      await httpHelper.post(
        'https://api.example.com/items',
        { data: 'test' },
        { 'Authorization': 'Bearer token' }
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        })
      );
    });
  });

  describe('put', () => {
    it('should perform PUT request', async () => {
      const mockResponse = {
        statusCode: 200,
        readBody: vi.fn().mockResolvedValue(JSON.stringify({ updated: true }))
      };

      mockClient.put.mockResolvedValue(mockResponse);

      const result = await httpHelper.put<{ updated: boolean }>(
        'https://api.example.com/items/123',
        { name: 'updated' }
      );

      expect(result).toEqual({ updated: true });
      expect(mockClient.put).toHaveBeenCalled();
    });
  });

  describe('patch', () => {
    it('should perform PATCH request', async () => {
      const mockResponse = {
        statusCode: 200,
        readBody: vi.fn().mockResolvedValue(JSON.stringify({ patched: true }))
      };

      mockClient.patch.mockResolvedValue(mockResponse);

      const result = await httpHelper.patch<{ patched: boolean }>(
        'https://api.example.com/items/123',
        { field: 'value' }
      );

      expect(result).toEqual({ patched: true });
      expect(mockClient.patch).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should perform DELETE request', async () => {
      const mockResponse = {
        statusCode: 204,
        readBody: vi.fn().mockResolvedValue('')
      };

      mockClient.del.mockResolvedValue(mockResponse);

      await httpHelper.delete('https://api.example.com/items/123');

      expect(mockClient.del).toHaveBeenCalledWith(
        'https://api.example.com/items/123',
        undefined
      );
    });
  });

  describe('head', () => {
    it('should perform HEAD request', async () => {
      const mockResponse = {
        statusCode: 200,
        readBody: vi.fn()
      };

      mockClient.head.mockResolvedValue(mockResponse);

      await httpHelper.head('https://api.example.com/resource');

      expect(mockClient.head).toHaveBeenCalledWith(
        'https://api.example.com/resource',
        undefined
      );
    });
  });

  describe('downloadFile', () => {
    it('should download file and return content', async () => {
      const fileContent = 'File content here';
      const mockResponse = {
        statusCode: 200,
        readBody: vi.fn().mockResolvedValue(fileContent)
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await httpHelper.downloadFile('https://example.com/file.txt');

      expect(result).toBe(fileContent);
      expect(mockClient.get).toHaveBeenCalledWith('https://example.com/file.txt', undefined);
    });

    it('should throw error on download failure', async () => {
      const mockResponse = {
        statusCode: 404,
        readBody: vi.fn().mockResolvedValue('Not Found')
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await expect(
        httpHelper.downloadFile('https://example.com/missing.txt')
      ).rejects.toThrow('HTTP request failed with status 404');
    });
  });
});
