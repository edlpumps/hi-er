import {InvocationContext} from "@azure/functions";
import {LabelJobRequest} from "../endpoints/participant/types";
import {ACTIVITY_NAMES} from "./activity-names";
import * as df from "durable-functions";
import {LabelJobItemRepository, LabelJobRepository} from "../tables/repository";

const initializeParticipantLabelJobHandler = async (
  input: LabelJobRequest & {participantId: string; durableInstanceId: string},
  context: InvocationContext,
): Promise<void> => {
  const {participantId, id: jobId, durableInstanceId} = input;

  context.log(
    `Initializing label job for participant ${participantId} with job ID ${jobId}`,
  );

  // Here you can add any initialization logic needed for the label job,
  // such as creating database entries, setting up storage, etc.
  const labelJobRepository = new LabelJobRepository();
  const labelJobItemRepository = new LabelJobItemRepository();

  await labelJobRepository.upsert({
    participantId,
    jobId,
    format: input.format,
    status: "running",
    progress: 0,
    locale: input.locale,
    swVersion: input.swVersion,
    equipmentType: input.equipmentType,
    formatSize: input.formatSize,
    labelGenerationUrl: input.labelGenerationUrl,
    durableInstanceId: durableInstanceId,
  });

  const labelItems = input.labels.map((label) => {
    return labelJobItemRepository.upsert({
      jobId: jobId,
      labelId: label.labelId,
      archiveName: label.archiveName,
      status: "pending",
      lastUpdated: new Date().toISOString(),
    });
  });

  await Promise.all(labelItems);

  // For this example, we'll just log the initialization.
  context.log(
    `Label job initialized for participant ${participantId} with job ID ${jobId}`,
  );
};

export const initializeParticipantLabelJobActivity = df.app.activity(
  ACTIVITY_NAMES.INITIALIZE_LABEL_JOB_ACTIVITY,
  {
    handler: initializeParticipantLabelJobHandler,
  },
);
