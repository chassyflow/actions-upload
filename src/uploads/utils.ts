import * as core from '@actions/core'
import { Path } from 'glob'
import fs from 'fs'
import { BACKOFF_CONFIG } from '../constants'
import { backOff } from 'exponential-backoff'

export const uploadFileWithBackoff =
  (url: RequestInfo | URL, backoffOptions = BACKOFF_CONFIG) =>
  async (path: Path) => {
    const readStream = fs.readFileSync(path.fullpath())

    core.debug(`Uploading file: ${path.fullpath()}`)

    return fetchWithBackoff(
      url,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fs.statSync(path.fullpath()).size.toString()
        },
        body: readStream
      },
      backoffOptions
    )
  }

export const fetchWithBackoff = async (
  url: RequestInfo | URL,
  options: RequestInit,
  backoffOptions = BACKOFF_CONFIG
) =>
  backOff(async () => {
    const response = await fetch(url, options)
    if (!response.ok) {
      core.error(await response.text())
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  }, backoffOptions)

export const dbg = <T>(v: T) => {
  core.info(JSON.stringify(v, null, 2))
  return v
}

export const chunkArray = <T>(arr: T[], size: number): T[][] => {
  if (size < 1) {
    throw new Error('Size must be greater than 0')
  }
  if (Math.round(size) !== size) {
    throw new Error('Size must be an integer')
  }
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}
