import {OpenAPIRoute} from "chanfana";
import * as df from "durable-functions";
import {z} from "zod";
import {LabelJobRequest, labelJobRequestSchema} from "./types";
import {AppContext} from "../../app-context";
import {ACTIVITY_NAMES} from "../../activities/activity-names";

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
                success: z.boolean(),
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

    const client = df.getClient(c.var.func);

    const instanceId = await client.startNew(
      ACTIVITY_NAMES.PARTICIPANT_LABEL_JOB_ORCH,
      {
        input: {...taskToCreate, participantId},
        instanceId: `participant-label-job-${taskToCreate.id}`,
      },
    );

    // return the new label job
    return {
      success: true,
      job: {
        ...taskToCreate, // spread for now (just and echo)
        participantId, // include participantId in the response
        instanceId, // include instanceId for reference
      },
    };
  }
}
