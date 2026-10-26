/**
 * Browser-safe Azure Blob Storage boundary for Storybook.
 *
 * Production scan actions are transformed into RPC references by Next.js, but
 * Storybook resolves their imports in the browser. This mock keeps those
 * modules loadable and returns an empty container when a background scan sync
 * runs during a story.
 */

export class BlockBlobClient {
  public readonly url: string;

  public constructor(blobName = "storybook-blob") {
    this.url = `https://storybook.invalid/${encodeURIComponent(blobName)}`;
  }

  public async uploadData(): Promise<void> {}

  public async setMetadata(): Promise<void> {}

  public async deleteIfExists(): Promise<Readonly<{succeeded: boolean}>> {
    return {succeeded: true};
  }

  public async getProperties(): Promise<
    Readonly<{
      metadata: Readonly<Record<string, string>>;
      contentType: string;
      contentLength: number;
      createdOn: Date;
      lastModified: Date;
      etag: string;
    }>
  > {
    const timestamp = new Date(0);
    return {
      metadata: {},
      contentType: "application/octet-stream",
      contentLength: 0,
      createdOn: timestamp,
      lastModified: timestamp,
      etag: "storybook",
    };
  }
}

class ContainerClient {
  public getBlockBlobClient(blobName: string): BlockBlobClient {
    return new BlockBlobClient(blobName);
  }

  public async *listBlobsFlat(): AsyncGenerator<never, void, unknown> {}
}

export class BlobServiceClient {
  public readonly accountName = "storybook";

  public constructor(_storageEndpoint = "https://storybook.invalid", _credential?: unknown) {}

  public static fromConnectionString(): BlobServiceClient {
    return new BlobServiceClient();
  }

  public getContainerClient(): ContainerClient {
    return new ContainerClient();
  }

  public async getUserDelegationKey(): Promise<Readonly<Record<string, never>>> {
    return {};
  }
}

export class BlobSASPermissions {
  public static parse(value: string): string {
    return value;
  }
}

export function generateBlobSASQueryParameters(): Readonly<{toString: () => string}> {
  return {toString: () => ""};
}
