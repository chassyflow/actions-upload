import { BackoffOptions } from 'exponential-backoff'

export const BACKOFF_CONFIG: BackoffOptions = {
  numOfAttempts: 6,
  timeMultiple: 2,
  startingDelay: 2,
  maxDelay: 45
}

export const MULTI_PART_CHUNK_SIZE = 4 * 1024 * 1024 * 1024
