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
import {Readable} from "stream";

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
  const {participantId, jobId, label, equipmentType} = input;
  const itemRepository = new LabelJobItemRepository();

  const extension =
    input.format === "svg" || input.format === "png"
      ? input.format
      : input.extension;

  const labelSegment = input.format === "qr" ? "qr" : "label";
  const formatSize = input.format === "qr" ? "" : input.formatSize || "";

  const buildUrl = `http://localhost:3003/api/participants/${participantId}/${equipmentType}s/${label.labelId}/${extension}/${labelSegment}/${formatSize}`;

  // i'd like... GET /api/labels/participants/{participantId}/{equipmentType}s/{labelId}/{format(svg|png|qr)}/{locale}?size=sm|undefined&extension=png|svg|undefined
  // for a qr format, you'd need to supply the extension, for others it can be inferred from the format.

  const labelParams: Omit<ImageLabelParams, "blob"> = {
    labelId: label.labelId,
    swVersion: input.swVersion,
    locale: input.locale,
    format: input.format,
    formatSize: input.formatSize || "",
    extension,
  };

  try {
    const imageRepo = new LabelImageRepository();
    const existingImage = await imageRepo.labelImageExists(labelParams);

    if (!existingImage.exists) {
      const response = await fetch(buildUrl, {
        method: "GET",
        headers: {
          "Accept-Language": input.locale,
        },
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

      const blob = Readable.fromWeb(response.body as any);
      const blobSize = Number(response.headers.get("Content-Length"));
      const contentType =
        extension === "svg" ? "image/svg+xml" : `image/${extension}`;

      // const buffer = await blob.arrayBuffer();

      const uploadResponse = await imageRepo.uploadLabelImage({
        blob,
        contentType,
        labelId: label.labelId,
        swVersion: input.swVersion,
        locale: input.locale,
        format: input.format,
        formatSize: input.formatSize || "",
        extension,
      });

      existingImage.blobUrl = uploadResponse.blobUrl;
      existingImage.blobLength = blobSize;
      existingImage.status = uploadResponse.status;
      existingImage.blobPath = uploadResponse.blobPath;
    }

    const labelArchiveName = `${label.labelId}.${extension}`;

    await itemRepository.upsert(
      {
        jobId,
        labelId: label.labelId,
        status: "built",
        archiveName: labelArchiveName,
        buildUrl: buildUrl,
        location: existingImage.blobUrl,
        size: existingImage.blobLength,
        lastUpdated: new Date().toISOString(),
      },
      "Replace",
    );

    return {
      success: true,
      status: existingImage.status,
      // buildUrl: existingImage.blobUrl,
      blobUrl: existingImage.blobUrl,
      blobPath: existingImage.blobPath,
      size: existingImage.blobLength,
      existingImage: existingImage.exists,
      labelId: label.labelId,
      archiveName: labelArchiveName,
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
