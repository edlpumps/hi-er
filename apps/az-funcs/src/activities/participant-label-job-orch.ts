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

export const participantLabelJobOrchHandler: OrchestrationHandler = function* (
  context: OrchestrationContext,
) {
  const request = context.df.getInput<
    LabelJobRequest & {participantId: string}
  >();

  const durableInstanceId = context.df.instanceId;

  // set up the job
  yield initializeParticipantLabelJobActivity({
    ...request,
    participantId: request.participantId,
    durableInstanceId,
  });

  const labelTasks = request.labels.map((label) =>
    addParticipantLabelJobActivity({
      participantId: request.participantId,
      jobId: request.id,
      format: request.format,
      formatSize: request.formatSize,
      locale: request.locale,
      swVersion: request.swVersion,
      labelGenerationUrl: request.labelGenerationUrl,
      equipmentType: request.equipmentType,
      label,
    }),
  );

  // wait for all label generation tasks to complete
  const results: AddParticipantLabelJobActivityResult[] =
    yield context.df.Task.all(labelTasks);

  // chunk results into groups no greater than 256MB zip size limit for app.
  const chunkableResults: AddParticipantLabelJobActivityResult[][] =
    getChunkedResults(results, 256 * 1024 * 1024);

  // spin off zip activities for each chunk of results
  const zipTasks = chunkableResults.map((chunk, index) =>
    zipLabelsChunkActivity({
      participantId: request.participantId,
      jobId: request.id,
      chunkIndex: index,
      chunk,
    }),
  );

  // wait for all zip tasks to complete and gather their results
  const zipResults: ZipLabelsChunkActivityResult[] =
    yield context.df.Task.all(zipTasks);

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
