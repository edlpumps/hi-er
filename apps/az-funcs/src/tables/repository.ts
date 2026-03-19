import {TableClient, UpdateMode, odata} from "@azure/data-tables";
import {LabelJobEntity, LabelJobItemEntity} from "./entitties";
import * as dotenv from "dotenv";

dotenv.config();

const tableClientFactory = (tableName: string): TableClient => {
  // for now return from local storage.
  const client = TableClient.fromConnectionString(
    process.env.AzureWebJobsStorage || "",
    tableName,
  );
  return client;
};

export class TableRepository<TEntity> {
  private initialized = false;
  constructor(
    protected tableName: string,
    protected pkName: keyof TEntity,
    protected rkName: keyof TEntity,
  ) {}

  protected async initialize() {
    const client = tableClientFactory(this.tableName);
    if (this.initialized) return client;
    try {
      const response = await client.createTable();
      this.initialized = true;
    } catch (error) {
      console.error(`Error creating table ${this.tableName}:`, error);
      throw error;
    }

    return client;
  }

  async insert(entity: TEntity) {
    const client = await this.initialize();
    const tableEntity = {
      ...entity,
      partitionKey: String(entity[this.pkName]),
      rowKey: String(entity[this.rkName]),
    };
    await client.createEntity(tableEntity);
  }

  async delete(partitionKey: string, rowKey: string) {
    const client = await this.initialize();
    await client.deleteEntity(partitionKey, rowKey);
  }

  async get(partitionKey: string, rowKey: string): Promise<TEntity | null> {
    const client = await this.initialize();

    try {
      const entity = await client.getEntity(partitionKey, rowKey);
      return entity as unknown as TEntity;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(entity: Partial<TEntity>, mode?: UpdateMode) {
    const client = await this.initialize();
    const tableEntity = {
      ...entity,
      partitionKey: String(entity[this.pkName]),
      rowKey: String(entity[this.rkName]),
    };
    await client.upsertEntity(tableEntity, mode || "Merge");
  }
}

export class LabelJobRepository extends TableRepository<LabelJobEntity> {
  constructor() {
    super("HILabelJobs", "participantId", "jobId");
  }

  async listByParticipant(participantId: string): Promise<LabelJobEntity[]> {
    const client = await this.initialize();
    const entities: LabelJobEntity[] = [];
    const jobsResult = client.listEntities<LabelJobEntity>({
      queryOptions: {
        filter: `partitionKey eq ${participantId}`,
      },
    });
    for await (const entity of jobsResult) {
      entities.push(entity);
    }

    return entities;
  }
}

export class LabelJobItemRepository extends TableRepository<LabelJobItemEntity> {
  constructor() {
    super("HILabelJobItems", "jobId", "labelId");
  }

  async deleteByJobId(jobId: string) {
    const client = await this.initialize();
    const entities: LabelJobItemEntity[] = [];
    const itemsResult = client.listEntities<LabelJobItemEntity>({
      queryOptions: {
        filter: `partitionKey eq ${jobId}`,
      },
    });
    for await (const entity of itemsResult) {
      entities.push(entity);
    }

    const tasks = entities.map((entity) =>
      client.deleteEntity(entity.jobId, entity.labelId),
    );

    await Promise.all(tasks);
  }
}
