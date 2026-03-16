import {DurableObject} from "cloudflare:workers";
import {LabelJobRequest} from "../endpoints/participant/types";

type ParticipantLabelJobStatus =
  | "created"
  | "initialized"
  | "adding_labels"
  | "cancelling"
  | "processing_zip"
  | "completed"
  | "cancelled"
  | "failed";

export class ParticipantLabelJob extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  // init the job with the request data and any necessary setup (e.g. multipart upload in R2)
  async init(job: LabelJobRequest) {
    // This method can be called by the ParticipantLabelWorkflow to initialize the state for this job
    // It can also be used to setup any necessary resources for this job, such as a multipart upload in R2
    // The state can be used to track the progress of the job, store metadata, etc.
    // For example, we can store the jobId and participantId in the state, along with any other relevant information
    await this.ctx.storage.put("request", job);

    // container.fetch(PUT /init-zip-from-labels/:jobId BODY {name, description, requestDate, labels: [{labelId, archiveName}]})
  }

  // adds a label to this job, which can be processed by the workflow
  async addLabel(labelId: string, archiveName: string) {
    // This method can be called by the ParticipantLabelWorkflow to add a label to this job
    // It can update the state to track the status of this label (e.g. pending, completed, failed)
    // It can also be used to store any necessary information for processing this label, such as the archiveName for the zip file
    const request = await this.ctx.storage.get("request");
    if (!request) {
      throw new Error("Job not initialized");
    }
  }

  async produceZip() {
    // This method can be called by the ParticipantLabelWorkflow to process the zip file for this job
    // It can read the state to get the necessary information for processing, such as the list of labels and their statuses
    // It can also update the state with the progress of the zip processing, and any errors that occur
    // this task will leverage the container associated with this Durable Object
    // this will be a fire and forget task.
    // container.fetch(PUT /process-zip-from-labels/:jobId) -> this will trigger the processing of the zip file for this job, using the labels that have been added to this job
  }

  async pingStatus() {
    return (await this.ctx.storage.get("status")) as ParticipantLabelJobStatus;
  }

  async cancel() {
    // This method can be called by the ParticipantLabelWorkflow to cancel this job
    // It can update the state to reflect that this job has been cancelled, and any necessary cleanup can be performed
    // For example, if there is a multipart upload in R2 associated with this job, it can be aborted here
  }

  async remove() {
    // This method can be called by the ParticipantLabelWorkflow to remove this job from storage
    // This can be used to clean up any resources associated with this job, such as state storage or multipart uploads in R2
    await this.ctx.storage.deleteAll();
  }
}
