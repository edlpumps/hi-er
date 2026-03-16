import {DateTime, Str, Arr, Enumeration} from "chanfana";
import type {Context} from "hono";
import {z} from "zod";

export type AppContext = Context<{Bindings: Env}>;

export const Task = z.object({
  name: Str({example: "lorem"}),
  slug: Str(),
  description: Str({required: false}),
  completed: z.boolean().default(false),
  due_date: DateTime(),
});

export const labelJobLabelItemSchema = z.object({
  labelId: Str({
    example: "123e4567e89b12d3a456426614174000",
    description:
      "The unique identifier for this label that is known by requestor",
  }),
  archiveName: Str({
    example: "label1",
    description:
      "The filename that will be generated for this label in the zip",
  }),
});

export const labelJobRequestSchema = z.object({
  id: Str({example: "123e4567e89b12d3a456426614174000"}),
  name: Str({
    example: "Armstrong Fluid Technology - 2026-03-13:02:06PM -- svg",
    description: "The name of the labeling job, as it appears in the UI",
  }),
  archiveName: Str({
    example: "Armstrong Fluid Technology - 2026-03-13:02:06PM -- svg",
    description:
      "The zip filename that will ultimately be generated for this labeling job",
  }),
  requestDate: DateTime(),
  description: Str({required: false}),
  labels: Arr(labelJobLabelItemSchema, {required: true}),
});

export const labelJobRequestResponseSchema = z.object({
  ...labelJobRequestSchema.shape,
  participantId: Str({example: "58a5b35b4e1734001181ddf8"}),
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
        lastUpdated: DateTime(),
        error: Str().optional(),
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
