import {OrchestrationContext, OrchestrationHandler} from "durable-functions";
import {LabelJobRequest} from "../endpoints/participant/types";
import {
  addParticipantLabelJobActivity,
  AddParticipantLabelJobActivityResult,
} from "./add-participant-label-job-activity";
import {initializeParticipantLabelJobActivity} from "./initialize-participant-label-job-activity";
import {
  zipLabelsChunkActivity,
  ZipLabelsChunkActivityResult,
} from "./zip-labels-chunk-activity";
import {recordJobStatusActivity} from "./recording-activities";
import * as df from "durable-functions";
import moment from "moment";
import {ACTIVITY_NAMES} from "./activity-names";

export const participantLabelJobOrchHandler: OrchestrationHandler = function* (
  context: OrchestrationContext,
) {
  const request = context.df.getInput<
    LabelJobRequest & {participantId: string}
  >();

  const durableInstanceId = context.df.instanceId;

  // 1. Initialize the job
  yield initializeParticipantLabelJobActivity({
    ...request,
    participantId: request.participantId,
    durableInstanceId,
  });

  // // 2. Monitor rate limit on building.
  // const rateLimiterEntityId = new df.EntityId(
  //   ACTIVITY_NAMES.JOB_BUILDER_RATE_LIMITER_ENTITY,
  //   "global",
  // );

  // // only one may build at a time, so we acquire the lock before building and release after all builds are done.
  // while (true) {
  //   const acquired = yield context.df.callEntity(
  //     rateLimiterEntityId,
  //     "getLock",
  //     {maxCount: 1},
  //   );
  //   if (!acquired) {
  //     // if lock is held by another, wait for a bit before retrying
  //     const nextRetry = moment
  //       .utc(context.df.currentUtcDateTime)
  //       .add(10, "seconds")
  //       .toDate(); // retry after 10 seconds
  //     yield context.df.createTimer(nextRetry);
  //   } else {
  //     break; // lock acquired, proceed with building
  //   }
  // }

  // 2. Build the labels in parallel and put on shelf for zipping
  yield recordJobStatusActivity({
    participantId: request.participantId,
    jobId: request.id,
    status: "building",
  });
  const labelTasks = request.labels.map((label) =>
    addParticipantLabelJobActivity({
      participantId: request.participantId,
      jobId: request.id,
      format: request.format,
      formatSize: request.formatSize,
      extension: request.extension,
      locale: request.locale,
      swVersion: request.swVersion,
      labelGenerationUrl: request.labelGenerationUrl,
      equipmentType: request.equipmentType,
      label,
    }),
  );

  // release lock immediately after building tasks are kicked off, as the actual building happens in the activity and we don't want to block other jobs from starting their build process while we wait for these builds to complete.
  // yield context.df.callEntity(rateLimiterEntityId, "releaseLock");

  // wait for all label generation tasks to complete
  const results: AddParticipantLabelJobActivityResult[] =
    yield context.df.Task.all(labelTasks);

  // 3. chunk results into groups no greater than 256MB zip size limit for app.
  yield recordJobStatusActivity({
    participantId: request.participantId,
    jobId: request.id,
    status: "chunking",
  });
  const chunkableResults: AddParticipantLabelJobActivityResult[][] =
    getChunkedResults(results, 256 * 1024 * 1024); // .5 GB in bytes

  // spin off zip activities for each chunk of results
  yield recordJobStatusActivity({
    participantId: request.participantId,
    jobId: request.id,
    status: "zipping",
    zipChunkCount: chunkableResults.length,
  });
  const zipTasks = chunkableResults.map((chunk, index) =>
    zipLabelsChunkActivity({
      participantId: request.participantId,
      jobId: request.id,
      archiveName: request.archiveName,
      chunkIndex: index,
      chunk,
    }),
  );

  // wait for all zip tasks to complete and gather their results
  const zipResults: ZipLabelsChunkActivityResult[] =
    yield context.df.Task.all(zipTasks);

  yield recordJobStatusActivity({
    participantId: request.participantId,
    jobId: request.id,
    status: "done",
  });

  return {zipResults};
};

const getChunkedResults = (
  results: AddParticipantLabelJobActivityResult[],
  chunkSize: number,
): AddParticipantLabelJobActivityResult[][] => {
  const chunkedResults: AddParticipantLabelJobActivityResult[][] = [];
  let currentChunk: AddParticipantLabelJobActivityResult[] = [];
  let currentChunkSize = 0;

  for (const result of results) {
    if (result.size && currentChunkSize + result.size > chunkSize) {
      // start a new chunk, overflow reached
      chunkedResults.push(currentChunk); // store chunck
      currentChunk = []; // reset chunk
      currentChunkSize = 0; // reset size
    }

    // add to current chunk
    currentChunk.push(result);
    // increment current chunk size
    if (result.size) {
      currentChunkSize += result.size;
    }
  }

  // push any remaining results in the last chunk
  if (currentChunk.length > 0) {
    chunkedResults.push(currentChunk);
  }

  return chunkedResults;
};
