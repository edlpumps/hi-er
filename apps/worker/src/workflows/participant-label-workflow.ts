import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";
import {LabelJobRequest} from "../endpoints/participant/types";

export class ParticipantLabelWorkflow extends WorkflowEntrypoint<
  Env,
  LabelJobRequest
> {
  async run(event: WorkflowEvent<LabelJobRequest>, step: WorkflowStep) {
    const bucket = this.env.PARTICIPANT_LABELS_BUCKET;

    const getJob = () => {
      // const doId = this.env.PARTICIPANT_LABEL_JOB.idFromName(event.payload.id);
      return this.env.PARTICIPANT_LABEL_JOB.getByName(event.payload.id);
    };

    if (event.payload === undefined) {
      throw new Error("No payload provided");
    }

    await step.do("init-job", () => {
      const job = getJob();
      return job.init(event.payload);
    });

    // foreach label, add a step to add the label to the job
    await step.do("add-labels", async () => {
      const labels = event.payload.labels;
      const labelSteps = labels.map((label) => {
        step.do(`add-label-${label.labelId}`, () => {
          const job = getJob();
          return job.addLabel(label.labelId, label.archiveName);
        });
      });

      return await Promise.all(labelSteps);
    });

    await step.do("produce-zip", () => {
      const job = getJob();
      return job.produceZip();
    });

    return {
      success: true,
    };
  }
}
