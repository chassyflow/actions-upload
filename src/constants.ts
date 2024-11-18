import { BackoffOptions } from "exponential-backoff";

export const BACKOFF_CONFIG: BackoffOptions = {
  numOfAttempts: 6,
  timeMultiple: 2,
  startingDelay: 2
}
