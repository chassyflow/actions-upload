import { BackoffOptions } from 'exponential-backoff'

export const BACKOFF_CONFIG: BackoffOptions = {
  numOfAttempts: 6,
  timeMultiple: 3,
  startingDelay: 3,
  maxDelay: 60
}

// 500 MB
export const MULTI_PART_CHUNK_SIZE = 500 * 1024 * 1024
