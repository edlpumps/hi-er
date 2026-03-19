// src/functions/httpTrigger.ts
import {app} from "@azure/functions";
import * as df from "durable-functions";
import {azureContextHonoApiHandler} from "./app-context";
import {participantLabelJobOrchHandler} from "./activities/participant-label-job-orch";
import {ACTIVITY_NAMES} from "./activities/activity-names";

app.http("httpTrigger", {
  methods: ["GET", "POST", "DELETE", "PUT"],
  authLevel: "anonymous",
  route: "api/{*any}", // Catches all routes
  extraInputs: [df.input.durableClient()],
  handler: azureContextHonoApiHandler,
});

// register orchestration handlers here.  triggers are registered in their ts files.
df.app.orchestration(
  ACTIVITY_NAMES.PARTICIPANT_LABEL_JOB_ORCH,
  participantLabelJobOrchHandler,
);
