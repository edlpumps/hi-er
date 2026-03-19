// export interface BaseEntity {
//   partitionKey: string;
//   rowKey: string;
// }

// export interface BaseEntity<TEntity, pkName extends keyof TEntity, rkName extends keyof TEntity> {
//   partitionKey: string;
//   rowKey: string;
//   rowKeyName: rkName;
//   partitionKeyName: pkName;
// }

export type LabelJobEntity = {
  participantId: string;
  jobId: string;
  status: "running" | "success" | "cancelling" | "cancelled" | "failed";
  progress: number;
  format: string;
  formatSize?: string;
  locale: string;
  swVersion: string;
  labelGenerationUrl?: string;
  durableInstanceId: string;
  equipmentType: "pump" | "circulator";
};

export type LabelJobItemEntity = {
  jobId: string;
  labelId: string;
  status: "pending" | "completed" | "failed";
  archiveName: string;
  location?: string;
  size?: number;
  lastUpdated: string; // ISO date string
  error?: string;
};
