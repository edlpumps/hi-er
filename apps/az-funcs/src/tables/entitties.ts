export type LabelJobEntity = {
  participantId: string;
  jobId: string;
  status:
    | "pending"
    | "building"
    | "chunkning"
    | "zipping"
    | "done"
    | "cancelling"
    | "cancelled"
    | "failed";
  progress: number;
  format: string;
  formatSize?: string;
  locale: string;
  swVersion: string;
  labelGenerationUrl?: string;
  durableInstanceId: string;
  equipmentType: "pump" | "circulator";
  labelCount: number;
  zipChunkCount?: number;
};

export type LabelJobZipChunkEntity = {
  jobId: string;
  chunkIndex: number;
  status: "pending" | "processing" | "completed" | "failed";
  archiveName: string;
  blobUrl?: string;
  lastUpdated: string; // ISO date string
};

export type LabelJobItemEntity = {
  jobId: string;
  labelId: string;
  status: "pending" | "built" | "zipped" | "failed";
  archiveName: string;
  zipChunkIndex?: number; // which chunk this item belongs to, used for zipping
  buildUrl?: string;
  location?: string;
  size?: number;
  lastUpdated: string; // ISO date string
  error?: string;
};
