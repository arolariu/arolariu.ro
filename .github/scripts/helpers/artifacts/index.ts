/**
 * @fileoverview Artifact management using @actions/artifact
 * @module helpers/artifacts
 * 
 * Provides a clean API for uploading and downloading artifacts in GitHub Actions.
 * Uses @actions/artifact for managing build outputs, test results, and other files.
 * Follows Single Responsibility Principle by focusing on artifact operations.
 */

import * as artifact from "@actions/artifact";
import * as core from "@actions/core";
import { glob } from "@actions/glob";

/**
 * Artifact upload options
 */
export interface UploadOptions {
  /** Artifact name */
  name: string;
  /** Files or patterns to upload */
  files: string[];
  /** Root directory for relative paths */
  rootDirectory?: string;
  /** Retention days (1-90, default: repository setting) */
  retentionDays?: number;
}

/**
 * Artifact download options
 */
export interface DownloadOptions {
  /** Artifact name to download */
  name: string;
  /** Destination directory */
  destination: string;
}

/**
 * Artifact information
 */
export interface ArtifactInfo {
  /** Artifact ID */
  id: number;
  /** Artifact name */
  name: string;
  /** Artifact size in bytes */
  size: number;
}

/**
 * Upload result
 */
export interface UploadResult {
  /** Artifact ID */
  id: number;
  /** Number of files uploaded */
  fileCount: number;
  /** Total size in bytes */
  size: number;
}

/**
 * Download result
 */
export interface DownloadResult {
  /** Artifact ID */
  id: number;
  /** Download path */
  downloadPath: string;
}

/**
 * Artifact helper interface
 * Provides methods for artifact management
 */
export interface IArtifactHelper {
  /**
   * Uploads files as an artifact
   * @param options - Upload options
   * @returns Promise resolving to upload result
   */
  upload(options: UploadOptions): Promise<UploadResult>;

  /**
   * Downloads an artifact
   * @param options - Download options
   * @returns Promise resolving to download result
   */
  download(options: DownloadOptions): Promise<DownloadResult>;

  /**
   * Lists available artifacts
   * @returns Promise resolving to array of artifact information
   */
  list(): Promise<ArtifactInfo[]>;

  /**
   * Uploads a directory as an artifact
   * @param name - Artifact name
   * @param directory - Directory to upload
   * @param retentionDays - Optional retention period
   * @returns Promise resolving to upload result
   */
  uploadDirectory(name: string, directory: string, retentionDays?: number): Promise<UploadResult>;

  /**
   * Uploads specific files as an artifact
   * @param name - Artifact name
   * @param files - Array of file paths
   * @param rootDirectory - Root directory for relative paths
   * @param retentionDays - Optional retention period
   * @returns Promise resolving to upload result
   */
  uploadFiles(name: string, files: string[], rootDirectory?: string, retentionDays?: number): Promise<UploadResult>;
}

/**
 * Implementation of artifact helper
 */
export class ArtifactHelper implements IArtifactHelper {
  private client: ReturnType<typeof artifact.create>;

  constructor() {
    this.client = artifact.create();
  }

  /**
   * {@inheritDoc IArtifactHelper.upload}
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    try {
      core.info(`📦 Uploading artifact: ${options.name}`);
      
      // Resolve glob patterns to actual file paths
      const globber = await glob.create(options.files.join("\n"));
      const files = await globber.glob();

      if (files.length === 0) {
        throw new Error(`No files found matching patterns: ${options.files.join(", ")}`);
      }

      core.info(`Found ${files.length} files to upload`);

      const uploadOptions: {
        retentionDays?: number;
      } = {};

      if (options.retentionDays !== undefined) {
        uploadOptions.retentionDays = options.retentionDays;
      }

      const response = await this.client.uploadArtifact(
        options.name,
        files,
        options.rootDirectory ?? process.cwd(),
        uploadOptions
      );

      core.info(`✅ Artifact uploaded successfully: ${options.name}`);
      core.info(`   ID: ${response.id}`);
      core.info(`   Size: ${response.size} bytes`);

      return {
        id: response.id,
        fileCount: files.length,
        size: response.size,
      };
    } catch (error) {
      const err = error as Error;
      core.error(`❌ Failed to upload artifact '${options.name}': ${err.message}`);
      throw new Error(`Failed to upload artifact: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IArtifactHelper.download}
   */
  async download(options: DownloadOptions): Promise<DownloadResult> {
    try {
      core.info(`📥 Downloading artifact: ${options.name}`);

      const response = await this.client.downloadArtifact(
        options.name,
        options.destination
      );

      core.info(`✅ Artifact downloaded successfully: ${options.name}`);
      core.info(`   Path: ${response.downloadPath}`);

      return {
        id: response.artifactId,
        downloadPath: response.downloadPath,
      };
    } catch (error) {
      const err = error as Error;
      core.error(`❌ Failed to download artifact '${options.name}': ${err.message}`);
      throw new Error(`Failed to download artifact: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IArtifactHelper.list}
   */
  async list(): Promise<ArtifactInfo[]> {
    try {
      core.debug("Listing available artifacts");

      const response = await this.client.listArtifacts();

      return response.artifacts.map((art) => ({
        id: art.id,
        name: art.name,
        size: art.size,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to list artifacts: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IArtifactHelper.uploadDirectory}
   */
  async uploadDirectory(name: string, directory: string, retentionDays?: number): Promise<UploadResult> {
    return this.upload({
      name,
      files: [`${directory}/**/*`],
      rootDirectory: directory,
      retentionDays,
    });
  }

  /**
   * {@inheritDoc IArtifactHelper.uploadFiles}
   */
  async uploadFiles(
    name: string,
    files: string[],
    rootDirectory?: string,
    retentionDays?: number
  ): Promise<UploadResult> {
    return this.upload({
      name,
      files,
      rootDirectory,
      retentionDays,
    });
  }
}

/**
 * Creates a new artifact helper instance
 * @returns Artifact helper instance
 * @example
 * ```typescript
 * const artifacts = createArtifactHelper();
 * 
 * // Upload test results
 * await artifacts.uploadDirectory('test-results', './test-output', 30);
 * 
 * // Upload specific files
 * await artifacts.uploadFiles('logs', ['app.log', 'error.log'], './', 7);
 * 
 * // Download an artifact
 * await artifacts.download({ name: 'build-output', destination: './download' });
 * ```
 */
export function createArtifactHelper(): IArtifactHelper {
  return new ArtifactHelper();
}

/**
 * Default artifact helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const artifacts = createArtifactHelper();
