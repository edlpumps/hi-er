import {Bool, OpenAPIRoute} from "chanfana";
import {z} from "zod";
import {
  type AppContext,
  LabelJobRequest,
  LabelJobRequestResponse,
  labelJobRequestSchema,
} from "./types";

export class ParticipantLabelJobCreate extends OpenAPIRoute {
  schema = {
    tags: ["Labels"],
    summary: "Create a new Label Job",
    request: {
      params: z.object({
        participantId: z.string().describe("Participant ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: labelJobRequestSchema,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns the created label job",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  job: labelJobRequestSchema,
                }),
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

    // Retrieve the validated request body
    const taskToCreate = data.body as LabelJobRequest;
    const {participantId} = data.params;

    // Implement your own object insertion here
    // kick off a workflow (participant-label-job-workflow) with the participantId and taskToCreate as input

    // return the new label job
    return {
      success: true,
      job: {
        ...taskToCreate, // spread for now (just and echo)
        participantId, // include participantId in the response
      },
    };
  }
}
