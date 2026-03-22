import {ActivityHandler} from "durable-functions";
import {LabelJobEntity} from "../tables/entitties";
import {InvocationContext} from "@azure/functions";
import * as df from "durable-functions";
import {ACTIVITY_NAMES} from "./activity-names";
import {LabelJobRepository} from "../tables/repository";

const recordJobStatusActivityHandler: ActivityHandler = async function (
  input: {
    participantId: string;
    jobId: string;
    status: LabelJobEntity["status"];
    zipChunkCount?: LabelJobEntity["zipChunkCount"];
  },
  context: InvocationContext,
) {
  const repo = new LabelJobRepository();
  await repo.upsert(
    {
      participantId: input.participantId,
      jobId: input.jobId,
      status: input.status,
      zipChunkCount: input.zipChunkCount,
    },
    "Merge",
  );
};

export const recordJobStatusActivity = df.app.activity(
  ACTIVITY_NAMES.RECORD_JOB_STATUS_ACTIVITY,
  {handler: recordJobStatusActivityHandler},
);
