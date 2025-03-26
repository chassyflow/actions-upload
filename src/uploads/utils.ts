import * as core from '@actions/core'
import { Path } from 'glob'
import fs from 'fs'

export const uploadFile = (url: string) => async (path: Path) => {
  const readStream = fs.readFileSync(path.fullpath())

  core.debug(`Uploading file: ${path.fullpath()}`)

  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': fs.statSync(path.fullpath()).size.toString()
    },
    body: readStream
  })
}

export const dbg = <T>(v: T) => {
  core.info(JSON.stringify(v, null, 2))
  return v
}
