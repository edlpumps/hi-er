import {fromHono} from "chanfana";
import {Hono} from "hono";
import {TaskCreate} from "./endpoints/demos/taskCreate";
import {TaskDelete} from "./endpoints/demos/taskDelete";
import {TaskFetch} from "./endpoints/demos/taskFetch";
import {TaskList} from "./endpoints/demos/taskList";
import {ParticipantLabelJobGet} from "./endpoints/participant/label-job-get";
import {ParticipantLabelJobCreate} from "./endpoints/participant/label-job-create";

export {ParticipantLabelWorkflow} from "./workflows/participant-label-workflow";
export {ParticipantLabelJob} from "./durables/participant-label-job";

// Start a Hono app
const app = new Hono<{Bindings: Env}>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
});

// Register OpenAPI endpoints
openapi.get("/api/demos/tasks", TaskList);
openapi.post("/api/demos/tasks", TaskCreate);
openapi.get("/api/demos/tasks/:taskSlug", TaskFetch);
openapi.delete("/api/demos/tasks/:taskSlug", TaskDelete);

openapi.post(
  "/api/participant/:participantId/label-jobs",
  ParticipantLabelJobCreate,
);
openapi.get(
  "/api/participant/:participantId/label-jobs/:jobId",
  ParticipantLabelJobGet,
);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;
