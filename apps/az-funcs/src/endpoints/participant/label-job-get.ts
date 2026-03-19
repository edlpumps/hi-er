import {OpenAPIRoute} from "chanfana";
import {z} from "zod";
import {labelJobDetailsResponseSchema, LabelJobRequestResponse} from "./types";
import {AppContext, getInvocationDurableClient} from "../../app-context";
import {LabelJobRepository} from "../../tables/repository";

export class ParticipantLabelJobGet extends OpenAPIRoute {
  schema = {
    tags: ["Labels"],
    summary: "Get a single Label Job by participant ID and job ID",
    request: {
      params: z.object({
        participantId: z
          .string()
          .openapi({example: "58a5b35b4e1734001181ddf8"}),
        jobId: z.string().openapi({example: "job123"}),
      }),
      query: z.object({
        includeLabelDetails: z.boolean().optional().openapi({
          description:
            "Whether to include detailed information about the labels in the job",
        }),
      }),
    },
    responses: {
      "200": {
        description: "Returns a single label job if found",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: z.boolean(),
                job: labelJobDetailsResponseSchema,
              }),
            }),
          },
        },
      },
      "404": {
        description: "Label job not found",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: z.boolean(),
                error: z.string(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    // Get validated data
    const data = await this.getValidatedData<typeof this.schema>();

    // Retrieve the validated participantId and jobId
    const {participantId, jobId} = data.params;

    // Implement your own object fetch here
    const repo = new LabelJobRepository();
    const job = await repo.get(participantId, jobId);
    const exists = !!job;

    // @ts-ignore: check if the object exists
    if (exists === false) {
      return Response.json(
        {
          success: false,
          error: "Label job not found",
        },
        {
          status: 404,
        },
      );
    }

    return {
      success: true,
      job,
    };
  }
}
