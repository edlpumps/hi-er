import {OpenAPIRoute} from "chanfana";
import {z} from "zod";
import {
  LabelJobItemRepository,
  LabelJobRepository,
} from "../../tables/repository";
import {AppContext} from "../../app-context";
import * as df from "durable-functions";
import {HttpRequest} from "@azure/functions";
import {LabelImageRepository} from "../../labels/label-image-repository";

export class ParticipantLabelJobDelete extends OpenAPIRoute {
  schema = {
    tags: ["Labels"],
    summary: "Delete a Label Job",
    request: {
      params: z.object({
        participantId: z.string(),
        jobId: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Returns if the label job was deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: z.boolean(),
                result: z.object({
                  labelJob: z.object({
                    name: z.string().openapi({
                      example:
                        "Build something awesome with Cloudflare Workers",
                    }),
                    slug: z.string().openapi({example: "build-awesome"}),
                    description: z
                      .string()
                      .optional()
                      .openapi({example: "Lorem Ipsum"}),
                    completed: z.boolean().openapi({example: true}),
                    due_date: z.string().openapi({example: "2022-12-24"}),
                  }),
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

    // Retrieve the validated parameters
    const {participantId, jobId} = data.params;

    // Implement your own object deletion here
    const jobRepo = new LabelJobRepository();
    const labelsRepo = new LabelJobItemRepository();
    const job = await jobRepo.get(participantId, jobId);
    if (!job) {
      return {
        success: false,
        message: "Label job not found",
      };
    }
    const {durableInstanceId} = job;
    // delete durables before tables entries to ensure we don't have orphaned durables running without a reference in the table
    const durableClient = df.getClient(c.var.func);
    await durableClient.suspend(
      durableInstanceId,
      "Suspended while deleting label job",
    );
    await durableClient.purgeInstanceHistory(durableInstanceId);

    // delete tables entries, remove from storage, etc.
    await jobRepo.delete(participantId, jobId);
    await labelsRepo.deleteByJobId(jobId);

    // remove zips
    const imageRepo = new LabelImageRepository();
    await imageRepo.deleteZips({participantId, jobId});

    // Return the deleted task for confirmation
    return {
      success: true,
    };
  }
}
