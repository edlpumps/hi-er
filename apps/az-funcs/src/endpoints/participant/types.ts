import type {Context} from "hono";
import {z} from "zod";

export const labelJobLabelItemSchema = z.object({
  labelId: z.string().openapi({
    example: "123e4567e89b12d3a456426614174000",
    description:
      "The unique identifier for this label that is known by requestor",
  }),
  archiveName: z.string().openapi({
    example: "label1",
    description:
      "The filename that will be generated for this label in the zip",
  }),
});

export const labelJobRequestSchema = z.object({
  id: z.string().openapi({example: "123e4567e89b12d3a456426614174000"}),
  name: z.string().openapi({
    example: "Armstrong Fluid Technology - 2026-03-13:02:06PM -- svg",
    description: "The name of the labeling job, as it appears in the UI",
  }),
  archiveName: z.string().openapi({
    example: "Armstrong Fluid Technology - 2026-03-13:02:06PM -- svg",
    description:
      "The zip filename that will ultimately be generated for this labeling job",
  }),
  requestDate: z.string().optional().openapi({
    example: "2026-03-13T14:06:00Z",
    description: "The date and time when the labeling job was requested",
  }),
  description: z.string().optional().openapi({
    example: "This is an optional description for the labeling job",
    description: "A brief description of the labeling job",
  }),
  labels: z.array(labelJobLabelItemSchema).openapi({
    description: "The list of labels associated with this labeling job",
  }),
  labelGenerationUrl: z.string().optional().openapi({
    example:
      "http://localhost:3003/labels/{participantId}/{labelId}/{format}?locale=en",
    description:
      "The URL template that the activity function will call to generate each label. It should include {participantId}, {labelId}, {format}, and {locale} as placeholders.",
  }),
  format: z.enum(["svg", "png", "qr"]).openapi({
    description: "The desired output format for the labels in this job",
  }),
  formatSize: z.enum(["sm", ""]).optional().openapi({
    description: "The desired output size for the labels in this job",
  }),
  extension: z.enum(["svg", "png"]).openapi({
    description: "The file extension for the generated label images",
  }),
  locale: z.enum(["en", "fr"]).openapi({
    description: "The desired output locale for the labels in this job",
  }),
  swVersion: z.string().openapi({
    example: "1.0.0",
    description: "The version of the software making the labeling request",
  }),
  equipmentType: z.enum(["pump", "circulator"]).openapi({
    description: "The type of equipment these labels are being generated for",
  }),
});

export const labelJobRequestResponseSchema = z.object({
  ...labelJobRequestSchema.shape,
  participantId: z.string().openapi({example: "58a5b35b4e1734001181ddf8"}),
});

export const labelJobDetailsResponseSchema = z.object({
  ...labelJobRequestResponseSchema.omit({labels: true}).shape,
  status: z.enum(["running", "success", "cancelling", "cancelled", "failed"]),
  progress: z.number().min(0).max(100),
  labels: z
    .array(
      z.object({
        ...labelJobLabelItemSchema.shape,
        status: z.enum(["pending", "completed", "failed"]),
        lastUpdated: z.string().openapi({
          example: "2026-03-13T14:06:00Z",
          description: "The date and time when the label was last updated",
        }),
        error: z.string().optional(),
      }),
    )
    .optional(),
});

export type LableJobLabelItem = z.infer<typeof labelJobLabelItemSchema>;
export type LabelJobRequest = Omit<
  z.infer<typeof labelJobRequestSchema>,
  "labels"
> & {
  labels: LableJobLabelItem[];
};
export type LabelJobRequestResponse = z.infer<
  typeof labelJobRequestResponseSchema
>;
export type LabelJobDetailsResponse = z.infer<
  typeof labelJobDetailsResponseSchema
>;
export type LabelJobRequestTrackingContext = Omit<LabelJobRequest, "labels"> & {
  participantId: string;
  status: "running" | "success" | "cancelling" | "cancelled" | "failed";
  totalLabels: number;
};

export type AddLabelActivityInput = {
  participantId: string;
  jobId: string;
  label: LableJobLabelItem;
} & Pick<
  LabelJobRequest,
  | "format"
  | "formatSize"
  | "extension"
  | "locale"
  | "swVersion"
  | "labelGenerationUrl"
  | "equipmentType"
>;
