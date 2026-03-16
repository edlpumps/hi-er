import {Bool, OpenAPIRoute, Str} from "chanfana";
import {z} from "zod";
import {
  type AppContext,
  labelJobDetailsResponseSchema,
  LabelJobRequestResponse,
  labelJobRequestResponseSchema,
  Task,
} from "./types";

export class ParticipantLabelJobGet extends OpenAPIRoute {
  schema = {
    tags: ["Labels"],
    summary: "Get a single Label Job by participant ID and job ID",
    request: {
      params: z.object({
        participantId: Str({example: "58a5b35b4e1734001181ddf8"}),
        jobId: Str({example: "job123"}),
      }),
      query: z.object({
        includeLabelDetails: Bool({
          description:
            "Whether to include detailed information about the labels in the job",
          required: false,
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
                success: Bool(),
                result: z.object({
                  job: labelJobDetailsResponseSchema,
                }),
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
                success: Bool(),
                error: Str(),
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

    // Retrieve the validated participantId
    const {participantId} = data.params;

    // Implement your own object fetch here

    const exists = true;

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
      job: {
        description: "Example label job",
        labels: ["label1", "label2"],
        participantId, // include participantId in the response
        id: "job123", // example job ID
        name: "Example Job Name", // example job name
        requestDate: new Date().toISOString(), // example request date
      } as LabelJobRequestResponse,
    };
  }
}
