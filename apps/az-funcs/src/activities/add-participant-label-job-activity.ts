import {InvocationContext} from "@azure/functions";
import {ActivityHandler} from "durable-functions";
import * as df from "durable-functions";
import {ACTIVITY_NAMES} from "./activity-names";
import {AddLabelActivityInput} from "../endpoints/participant/types";
import {LabelJobItemRepository} from "../tables/repository";
import {
  ImageLabelParams,
  LabelImageRepository,
} from "../labels/label-image-repository";

export type AddParticipantLabelJobActivityResult = {
  success: boolean;
  buildUrl?: string;
  message?: string;
  status?: number;
  blobUrl?: string;
  blobPath?: string;
  size?: number;
  existingImage?: boolean;
  labelId?: string;
  archiveName?: string;
};

const addParticipantLabelJobActivityHandler: ActivityHandler = async (
  input: AddLabelActivityInput,
  context: InvocationContext,
): Promise<AddParticipantLabelJobActivityResult> => {
  const {participantId, jobId, label} = input;
  const itemRepository = new LabelJobItemRepository();

  let format = input.format;
  if (input.formatSize === "sm" && format !== "qr" && format !== "qr/png") {
    format += "-sm";
  }

  let extension = "svg";
  if (format === "png" || format === "qr/png") {
    extension = "png";
  }

  const buildUrl = `http://localhost:3003/labels/${participantId}/${label.labelId}/${format}`;

  const labelParams: ImageLabelParams = {
    labelId: label.labelId,
    swVersion: input.swVersion,
    locale: input.locale,
    format,
    extension,
  };

  try {
    const imageRepo = new LabelImageRepository();
    const existingImage = await imageRepo.labelImageExists(labelParams);

    if (!existingImage.exists) {
      const response = await fetch(buildUrl, {
        method: "GET",
      });

      if (!response.ok) {
        context.log(
          `Failed to fetch label details for label ${label.labelId}, status: ${response.status}`,
        );
        return {
          success: false,
          message: `Failed to fetch label details for label ${label.labelId}, status: ${response.status}`,
          buildUrl,
        };
      }

      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();

      const uploadResponse = await imageRepo.uploadLabelImage({
        buffer,
        labelId: label.labelId,
        swVersion: input.swVersion,
        locale: input.locale,
        format,
        extension,
      });

      existingImage.blobUrl = uploadResponse.blobUrl;
      existingImage.blobLength = buffer.byteLength;
      existingImage.status = uploadResponse.status;
      existingImage.blobPath = uploadResponse.blobPath;
    }

    await itemRepository.upsert({
      jobId,
      labelId: label.labelId,
      status: "completed",
      archiveName: label.archiveName,
      location: existingImage.blobUrl,
      size: existingImage.blobLength,
      lastUpdated: new Date().toISOString(),
    });

    return {
      success: true,
      status: existingImage.status,
      // buildUrl: existingImage.blobUrl,
      blobUrl: existingImage.blobUrl,
      blobPath: existingImage.blobPath,
      size: existingImage.blobLength,
      existingImage: existingImage.exists,
      labelId: label.labelId,
      archiveName: label.archiveName,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.log(
      `Error fetching label details for label ${label.labelId}: ${errorMessage}`,
    );
    return {
      success: false,
      message: `Error fetching label details for label ${label.labelId}: ${errorMessage}`,
      buildUrl,
    };
  }
};

export const addParticipantLabelJobActivity = df.app.activity(
  ACTIVITY_NAMES.ADD_LABEL_ACTIVITY,
  {
    handler: addParticipantLabelJobActivityHandler,
  },
);
