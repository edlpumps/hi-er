import {
  BlobClient,
  BlobDownloadResponseParsed,
  BlobServiceClient,
  BlockBlobClient,
  NodeJSReadableStream,
} from "@azure/storage-blob";
import archiver from "archiver";
import {Writable} from "stream";

export type ImageLabelUploadParams = {
  buffer: ArrayBuffer;
  labelId: string;
  swVersion: string;
  locale: string;
  format: string;
  extension: string;
};

export type ImageLabelParams = Omit<ImageLabelUploadParams, "buffer">;

export type ZipJobParams = {
  participantId: string;
  jobId: string;
  index?: number;
};

class BlobWritable extends Writable {
  private chunks: Buffer[] = [];

  _write(chunk: any, encoding: string, callback: Function): void {
    this.chunks.push(chunk);
    callback();
  }

  getBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

export class LabelImageRepository {
  private containerName: string;
  private blobServiceClient: BlobServiceClient;

  constructor() {
    this.containerName = process.env.LabelsContainerName || "hi-labels";
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AzureWebJobsStorage || "",
    );
  }

  private getBlobName(params: ImageLabelParams): string {
    return `labels/${params.labelId}/${params.swVersion}/label-(${params.locale})-(${params.format}).${params.extension}`;
  }

  private getZipBlobName({participantId, jobId, index}: ZipJobParams): string {
    const folder = this.getZipBlobFolder({participantId, jobId});
    const indexSuffix = index !== undefined ? `-${index}` : "";
    return `${folder}labels${indexSuffix}.zip`;
  }

  private getZipBlobFolder({participantId, jobId}: ZipJobParams): string {
    return `participants/${participantId}/label-jobs/${jobId}/`;
  }

  async labelImageExists(params: ImageLabelParams): Promise<{
    exists: boolean;
    blobUrl?: string;
    blobPath?: string;
    blobLength?: number;
    status?: number;
  }> {
    const client = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blobName = this.getBlobName(params);
    const blockBlobClient = client.getBlockBlobClient(blobName);
    const exists = await blockBlobClient.exists();
    const properties = exists
      ? await blockBlobClient.getProperties()
      : undefined;
    return {
      exists,
      blobUrl: exists ? blockBlobClient.url : undefined,
      blobPath: blobName,
      blobLength: properties?.contentLength,
      status: properties?._response.status,
    };
  }

  async uploadLabelImage({
    buffer,
    labelId,
    swVersion,
    locale,
    format,
    extension,
  }: ImageLabelUploadParams): Promise<{
    blobUrl: string;
    blobPath: string;
    status: number;
    success: boolean;
  }> {
    const client = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blobName = this.getBlobName({
      labelId,
      swVersion,
      locale,
      format,
      extension,
    });
    const blockBlobClient = client.getBlockBlobClient(blobName);
    const response = await blockBlobClient.uploadData(buffer);
    return {
      blobUrl: blockBlobClient.url,
      blobPath: blobName,
      status: response._response.status,
      success:
        response._response.status >= 200 && response._response.status < 300,
    };
  }

  async downloadLabelImageStream(
    imageUrl: string,
  ): Promise<BlobDownloadResponseParsed> {
    const client = this.blobServiceClient.getContainerClient(
      this.containerName,
    );

    const blockBlobClient = client.getBlockBlobClient(imageUrl);
    const downloadResponse = await blockBlobClient.download();
    return downloadResponse;
  }

  async deleteLabel(params: ImageLabelParams) {
    const client = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blobName = this.getBlobName(params);
    const blockBlobClient = client.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  }

  async deleteZips({participantId, jobId}: ZipJobParams) {
    const client = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const folder = this.getZipBlobFolder({participantId, jobId});
    const blobs = client.listBlobsFlat({prefix: folder});
    for await (const blob of blobs) {
      const blockBlobClient = client.getBlockBlobClient(blob.name);
      await blockBlobClient.deleteIfExists();
    }
  }

  async initZipUpload({participantId, jobId, index}: ZipJobParams): Promise<{
    archive: any;
    blobClient: BlockBlobClient;
    blobWritable: BlobWritable;
  }> {
    // This method can be used to perform any necessary initialization before uploading zip files, such as creating a folder structure or setting metadata. For Azure Blob Storage, we don't need to do anything here since blobs are created on demand when we upload them.
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const archiveName = this.getZipBlobName({participantId, jobId, index});
    const blobClient = containerClient.getBlockBlobClient(archiveName);
    const blobWritable = new BlobWritable();
    const archive = archiver("zip", {zlib: {level: 9}});

    archive.pipe(blobWritable);

    return {
      archive,
      blobClient,
      blobWritable,
    };
  }

  async finalizeZipUpload({
    archive,
    blobClient,
    blobWritable,
  }: {
    archive: any;
    blobClient: BlockBlobClient;
    blobWritable: BlobWritable;
  }): Promise<{
    blobUrl: string;
    status: number;
    success: boolean;
  }> {
    await archive.finalize();

    const buffer = blobWritable.getBuffer();
    await blobClient.upload(buffer, buffer.length);

    return {
      blobUrl: blobClient.url,
      status: 200,
      success: true,
    };
  }
}
