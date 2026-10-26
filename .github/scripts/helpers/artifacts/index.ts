/**
 * @fileoverview Artifact management using @actions/artifact.
 * @module github/scripts/helpers/artifacts
 *
 * @remarks
 * Provides a clean API for uploading and downloading artifacts in GitHub Actions.
 * Uses @actions/artifact for managing build outputs, test results, and other files.
 * Follows Single Responsibility Principle by focusing on artifact operations.
 */

import {
  DefaultArtifactClient,
  type Artifact,
  type ArtifactClient,
  type DownloadArtifactOptions as ActionsDownloadOptions,
  type DownloadArtifactResponse,
  type FindOptions,
  type ListArtifactsOptions,
  type UploadArtifactOptions as ActionsUploadOptions,
  type UploadArtifactResponse,
} from "../sdk/artifact.ts";
import * as core from "../sdk/core.ts";
import * as glob from "../sdk/glob.ts";
import {join} from "node:path";

/**
 * Artifact upload options
 */
export interface UploadOptions {
  /** Artifact name */
  readonly name: string;
  /** Files or patterns to upload */
  readonly files: readonly string[];
  /** Native archive root; patterns retain native glob's working-directory semantics. */
  readonly rootDirectory?: string;
  /** Native retention period; zero uses repository defaults. */
  readonly retentionDays?: number;
  /** Complete native upload configuration; conflicting retention values reject. */
  readonly nativeOptions?: Readonly<ActionsUploadOptions>;
}

/**
 * Artifact download options
 */
export interface DownloadOptions {
  /** Artifact name or ID to download */
  readonly name?: string;
  /** Artifact ID (alternative to name) */
  readonly artifactId?: number;
  /** Destination directory */
  readonly destination: string;
  /** Native integrity/extraction/cross-run options; destination owns the path. */
  readonly nativeOptions?: Readonly<Omit<ActionsDownloadOptions & FindOptions, "path">>;
}

/**
 * Artifact information
 */
export type ArtifactInfo = Readonly<Artifact>;

/**
 * Upload result
 */
export interface UploadResult extends Readonly<UploadArtifactResponse> {
  /** Required positive native identity. */
  readonly id: number;
  /** Number of files uploaded */
  readonly fileCount: number;
}

/**
 * Download result
 */
export interface DownloadResult extends Readonly<DownloadArtifactResponse> {
  /** Artifact ID */
  readonly id: number;
  /** Download path */
  readonly downloadPath: string;
}

/**
 * Artifact helper interface
 * Provides methods for artifact management
 */
export interface IArtifactHelper {
  /**
   * Uploads files as an artifact
   * @param options - Upload options
   * @returns Positive identity, discovered file count, and available native metadata.
   * @throws Original SDK errors or an error for absent/nonpositive identity.
   */
  upload(options: UploadOptions): Promise<UploadResult>;

  /**
   * Downloads an artifact
   * @param options - Download options
   * @returns Native metadata and the known destination.
   * @throws Original SDK errors or an explicit digest mismatch error.
   */
  download(options: DownloadOptions): Promise<DownloadResult>;

  /**
   * Lists available artifacts
   * @param nativeOptions - Native latest/cross-run lookup configuration.
   * @returns Promise resolving to array of artifact information
   */
  list(nativeOptions?: Readonly<ListArtifactsOptions & FindOptions>): Promise<ArtifactInfo[]>;

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
  uploadFiles(name: string, files: readonly string[], rootDirectory?: string, retentionDays?: number): Promise<UploadResult>;
}

/**
 * Implementation of artifact helper
 */
export class ArtifactHelper implements IArtifactHelper {
  private readonly client: ArtifactClient;

  /**
   * Composes a complete native artifact client.
   * @param client - Optional configured external client; errors retain their identities.
   */
  constructor(client: ArtifactClient = new DefaultArtifactClient()) {
    this.client = client;
  }

  /**
   * {@inheritDoc IArtifactHelper.upload}
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    const nativeOptions: ActionsUploadOptions = {...options.nativeOptions};
    if (options.retentionDays !== undefined) {
      if (nativeOptions.retentionDays !== undefined && nativeOptions.retentionDays !== options.retentionDays) {
        throw new TypeError("Conflicting legacy and native artifact retentionDays");
      }
      nativeOptions.retentionDays = options.retentionDays;
    }
    const globber = await glob.create(options.files.join("\n"), {matchDirectories: false});
    const files = await globber.glob();
    if (files.length === 0) throw new Error(`No files found matching patterns: ${options.files.join(", ")}`);
    const response = await this.client.uploadArtifact(options.name, files, options.rootDirectory ?? process.cwd(), nativeOptions);
    const id = this.requiredId(response.id);
    core.info(`Artifact '${options.name}' uploaded with ID ${id}`);
    return {...response, id, fileCount: files.length};
  }

  /**
   * {@inheritDoc IArtifactHelper.download}
   */
  async download(options: DownloadOptions): Promise<DownloadResult> {
    const nativeOptions = {...options.nativeOptions, path: options.destination};
    let id: number;
    if (options.artifactId !== undefined) id = this.requiredId(options.artifactId);
    else if (options.name) {
      const lookup: FindOptions = nativeOptions.findBy ? {findBy: nativeOptions.findBy} : {};
      id = this.requiredId((await this.client.getArtifact(options.name, lookup)).artifact.id);
    } else throw new Error("Either 'name' or 'artifactId' must be provided");
    const response = await this.client.downloadArtifact(id, nativeOptions);
    if (response.digestMismatch) throw new Error(`Artifact digest mismatch for ID ${id}`);
    return {...response, id, downloadPath: response.downloadPath ?? options.destination};
  }

  /**
   * {@inheritDoc IArtifactHelper.list}
   */
  async list(nativeOptions?: Readonly<ListArtifactsOptions & FindOptions>): Promise<ArtifactInfo[]> {
    return (await this.client.listArtifacts(nativeOptions)).artifacts;
  }

  private requiredId(id: number | undefined): number {
    if (id === undefined || !Number.isSafeInteger(id) || id <= 0) throw new Error("Artifact response has no valid positive ID");
    return id;
  }

  /**
   * {@inheritDoc IArtifactHelper.uploadDirectory}
   */
  async uploadDirectory(name: string, directory: string, retentionDays?: number): Promise<UploadResult> {
    const uploadOptions: UploadOptions = {
      name,
      files: [join(directory, "**", "*")],
      rootDirectory: directory,
    };
    return this.upload({...uploadOptions, ...(retentionDays === undefined ? {} : {retentionDays})});
  }

  /**
   * {@inheritDoc IArtifactHelper.uploadFiles}
   */
  async uploadFiles(name: string, files: readonly string[], rootDirectory?: string, retentionDays?: number): Promise<UploadResult> {
    return this.upload({
      name,
      files,
      ...(rootDirectory === undefined ? {} : {rootDirectory}),
      ...(retentionDays === undefined ? {} : {retentionDays}),
    });
  }
}

/**
 * Creates a new artifact helper instance
 * @param client - Optional complete native artifact client.
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
export function createArtifactHelper(client?: ArtifactClient): IArtifactHelper {
  return new ArtifactHelper(client);
}

/**
 * Default artifact helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const artifacts = createArtifactHelper();
