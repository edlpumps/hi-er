import * as df from "durable-functions";
import {
  app,
  HttpRequest,
  HttpResponse,
  InvocationContext,
} from "@azure/functions";
import {
  ActivityHandler,
  OrchestrationContext,
  OrchestrationHandler,
} from "durable-functions";

const fetchTitleActivityName = "fetchTitleAsync";

const fetchOrchestration: OrchestrationHandler = function* (
  context: OrchestrationContext,
) {
  context.log("Fetching data.");

  // List of URLs to fetch titles from
  const urls = [
    "https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview",
    "https://learn.microsoft.com/azure/azure-functions/durable/durable-task-scheduler/durable-task-scheduler",
    "https://learn.microsoft.com/azure/azure-functions/functions-scenarios",
    "https://learn.microsoft.com/azure/azure-functions/functions-create-ai-enabled-apps",
  ];

  // Run fetching tasks in parallel
  const parallelTasks = [];
  for (const url of urls) {
    const task = context.df.callActivity(fetchTitleActivityName, url);
    parallelTasks.push(task);
  }

  // Wait for all the parallel tasks to complete before continuing
  const results: string[] = yield context.df.Task.all(parallelTasks);

  // Return fetched titles as a formatted string
  return results.join("; ");
};

// df.app.orchestration("fetchOrchestration", fetchOrchestration);

const fetchTitleAsync: ActivityHandler = async function (
  url: string,
  context: InvocationContext,
): Promise<string> {
  context.log(`Fetching from url ${url}.`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.text();

    // Extract page title
    const titleMatch = content.match(
      /<title[^>]*>([^<]+?)\s*\|\s*Microsoft Learn<\/title>/i,
    );

    const title = titleMatch ? titleMatch[1].trim() : "No title found";

    return title;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error fetching from ${url}: ${errorMessage}`;
  }
};

// df.app.activity(fetchTitleActivityName, {
//   handler: fetchTitleAsync,
// });

const httpStart = async (
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponse> => {
  const client = df.getClient(context);
  const instanceId: string = await client.startNew(
    request.params.orchestratorName,
  );

  context.log(`Started orchestration with ID = '${instanceId}'.`);

  return client.createCheckStatusResponse(request, instanceId);
};

// app.http("httpStart", {
//   route: "orchestrators/{orchestratorName}",
//   authLevel: "anonymous",
//   extraInputs: [df.input.durableClient()],
//   handler: httpStart,
// });
