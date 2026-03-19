import {fromHono} from "chanfana";
import {Hono} from "hono";
import {ParticipantLabelJobGet} from "./endpoints/participant/label-job-get";
import {ParticipantLabelJobCreate} from "./endpoints/participant/label-job-create";
import {FunctionInvocationContextMiddleware} from "./app-context";
import {ParticipantLabelJobListGet} from "./endpoints/participant/job-list";
import {ParticipantLabelJobDelete} from "./endpoints/participant/job-delete";

// Start a Hono app
const app = new Hono<{}>();

app.use(FunctionInvocationContextMiddleware);

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
  base: "/api",
});

// Register OpenAPI endpoints
openapi.post(
  "/participant/:participantId/label-jobs",
  ParticipantLabelJobCreate,
);

openapi.get(
  "/participant/:participantId/label-jobs",
  ParticipantLabelJobListGet,
);

openapi.get(
  "/participant/:participantId/label-jobs/:jobId",
  ParticipantLabelJobGet,
);

openapi.delete(
  "/participant/:participantId/label-jobs/:jobId",
  ParticipantLabelJobDelete,
);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default openapi;
