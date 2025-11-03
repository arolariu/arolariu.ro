/**
 * @fileoverview Unit tests for artifacts helper
 */

import { describe, it, expect } from 'vitest';
import { createArtifactsHelper } from './index';

describe('ArtifactsHelper', () => {
  it('should create an artifacts helper instance', () => {
    const artifactsHelper = createArtifactsHelper();
    
    expect(artifactsHelper).toBeDefined();
    expect(typeof artifactsHelper.upload).toBe('function');
    expect(typeof artifactsHelper.download).toBe('function');
    expect(typeof artifactsHelper.list).toBe('function');
    expect(typeof artifactsHelper.uploadDirectory).toBe('function');
    expect(typeof artifactsHelper.uploadFiles).toBe('function');
  });

  describe('upload', () => {
    it('should have upload method', () => {
      const artifactsHelper = createArtifactsHelper();
      expect(typeof artifactsHelper.upload).toBe('function');
    });
  });

  describe('download', () => {
    it('should have download method', () => {
      const artifactsHelper = createArtifactsHelper();
      expect(typeof artifactsHelper.download).toBe('function');
    });
  });

  describe('list', () => {
    it('should have list method', () => {
      const artifactsHelper = createArtifactsHelper();
      expect(typeof artifactsHelper.list).toBe('function');
    });
  });

  describe('uploadDirectory', () => {
    it('should have uploadDirectory method', () => {
      const artifactsHelper = createArtifactsHelper();
      expect(typeof artifactsHelper.uploadDirectory).toBe('function');
    });
  });

  describe('uploadFiles', () => {
    it('should have uploadFiles method', () => {
      const artifactsHelper = createArtifactsHelper();
      expect(typeof artifactsHelper.uploadFiles).toBe('function');
    });
  });

  describe('constants', () => {
    it('should have DEFAULT_RETENTION_DAYS constant', () => {
      const artifactsHelper = createArtifactsHelper();
      expect(artifactsHelper.DEFAULT_RETENTION_DAYS).toBe(90);
    });
  });
});
