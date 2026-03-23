import * as df from "durable-functions";
import {ACTIVITY_NAMES} from "./activity-names";

// The durable entity state interface
export interface JobBuilderRateLimiterState {
  count: number;
}

// The durable entity handler function
export const jobBuilderRateLimiterEntity: df.EntityHandler<
  JobBuilderRateLimiterState
> = async (context: df.EntityContext<JobBuilderRateLimiterState>) => {
  let state = context.df.getState(() => ({count: 0}));

  const input = context.df.getInput(); // to ensure the entity is woken up when signaled, even if no state change is needed

  switch (context.df.operationName) {
    case "releaseLock":
      state.count--;
      break;
    case "reset":
      state.count = 0;
      break;
    case "getLock": // example of an operation that checks the count before incrementing
      const input: {maxCount: number} = context.df.getInput();
      if (state.count >= input.maxCount) {
        context.df.return(false); // return current count if at or above max
        break;
      }
      // increment and return new count if below max
      state.count++;
      context.df.return(true);
      break;
  }
  context.df.setState(state);
};
