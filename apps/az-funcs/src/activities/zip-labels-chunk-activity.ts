import {ActivityHandler} from "durable-functions";
import {AddParticipantLabelJobActivityResult} from "./add-participant-label-job-activity";
import {input, InvocationContext} from "@azure/functions";
import * as df from "durable-functions";
import {ACTIVITY_NAMES} from "./activity-names";
import {LabelImageRepository} from "../labels/label-image-repository";
import {LabelJobItemRepository} from "../tables/repository";

export type ZipLabelsChunkActivityInput = {
  participantId: string;
  jobId: string;
  chunkIndex: number;
  archiveName: string;
  chunk: AddParticipantLabelJobActivityResult[];
};

export type ZipLabelsChunkActivityResult = {
  success: boolean;
  message?: string;
  blobUrl?: string;
};

const zipLabelsChunkActivityHandler: ActivityHandler = async (
  input: ZipLabelsChunkActivityInput,
  context: InvocationContext,
): Promise<ZipLabelsChunkActivityResult> => {
  const imageRepo = new LabelImageRepository();
  const zipArgs = await imageRepo.initZipUpload({
    participantId: input.participantId,
    jobId: input.jobId,
    index: input.chunkIndex,
    archiveName: input.archiveName,
  });

  // add files to the zip
  for (const item of input.chunk) {
    console.log("Adding item to zip:", item.blobPath);
    const blob = await imageRepo.downloadLabelImageStream(item.blobPath || "");
    if (blob.readableStreamBody) {
      zipArgs.archive.append(blob.readableStreamBody, {
        name: item.archiveName,
      });
    }
  }

  await imageRepo.finalizeZipUpload(zipArgs);

  try {
    const repo = new LabelJobItemRepository();
    const tasks = input.chunk.map((item) =>
      repo.upsert(
        {
          jobId: input.jobId,
          labelId: item.labelId || "",
          zipChunkIndex: input.chunkIndex,
          status: "zipped",
        },
        "Merge",
      ),
    );
    await Promise.all(tasks);
  } catch (error) {
    console.error("Error recording zip chunk to items", error);
  }

  return {
    success: true,
    message: `Chunk ${input.chunkIndex} processed successfully.`,
    blobUrl: zipArgs.blobClient.url,
  };
};

export const zipLabelsChunkActivity = df.app.activity(
  ACTIVITY_NAMES.ZIP_LABELS_CHUNK_ACTIVITY,
  {handler: zipLabelsChunkActivityHandler},
);
