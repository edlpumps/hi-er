import {HttpRequest, InvocationContext} from "@azure/functions";
import {Context, Next} from "hono";
import * as df from "durable-functions";
import {azureHonoHandler} from "@marplex/hono-azurefunc-adapter";
import honoApiApp from "./api"; // Your Hono app instance

export type Variables = {
  func: InvocationContext;
};

export type AppContext = Context<{Variables: Variables}>;

let functionInvocationContext: InvocationContext = undefined;
export const setFunctionInvocationContext = (context: InvocationContext) => {
  functionInvocationContext = context;
};

export const getInvocationDurableClient = (c: AppContext) => {
  return df.getClient(c.get("func"));
};

export const FunctionInvocationContextMiddleware = (
  c: AppContext,
  next: Next,
) => {
  c.set("func", functionInvocationContext); // Make the Azure Functions context available in Hono routes
  return next();
};

export const azureContextHonoApiHandler = (
  req: HttpRequest,
  context: InvocationContext,
) => {
  setFunctionInvocationContext(context); // Store the invocation context for later use in routes
  const handler = azureHonoHandler(honoApiApp.fetch);
  return handler(req, context);
};
