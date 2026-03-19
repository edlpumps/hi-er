import {OpenAPIRoute} from "chanfana";
import {z} from "zod";
import {LabelJobRepository} from "../../tables/repository";
import {AppContext} from "../../app-context";

export class ParticipantLabelJobListGet extends OpenAPIRoute {
  schema = {
    tags: ["Labels"],
    summary: "List Label Jobs",
    request: {
      params: z.object({
        participantId: z
          .string()
          .openapi({example: "58a5b35b4e1734001181ddf8"}),
      }),
    },
    responses: {
      "200": {
        description: "Returns a list of label jobs",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: z.boolean(),
                result: z.object({
                  labelJobs: z.array(
                    z.object({
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
                  ),
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
    const {participantId} = data.params;

    console.log(`Listing label jobs for participant ${participantId}`);

    // Implement your own object list here
    const repo = new LabelJobRepository();
    const jobs = await repo.listByParticipant(participantId);

    console.log(
      `Found ${jobs.length} label jobs for participant ${participantId}`,
    );

    return {
      success: true,
      jobs,
    };
  }
}
