import { RunContext } from '../context'
import * as core from '@actions/core'
import { getActionRunURL, getBackendUrl } from '../env'
import { CreatePackage } from '../api'
import { glob } from 'glob'
import { computeChecksum } from '../checksum'
import { assertType } from '../config'
import { fetchWithBackoff, uploadFileWithBackoff } from './utils'

/**
 * Upload firmware to Chassy Index
 */
export const firmwareUpload = async (ctx: RunContext) => {
  const config = assertType(ctx.config, 'FIRMWARE')
  // validate that files exist
  const paths = await glob(config.path, { withFileTypes: true })
  core.info(`Found files: ${paths.map(f => f.fullpath()).join(',')}`)
  if (paths.length === 0)
    throw new Error(`No files found in provided path: ${config.path}`)

  const hash =
    'sha256:' + (await computeChecksum(paths[0].fullpath(), 'sha256'))

  // create image in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/package`

  let pkg: CreatePackage
  try {
    const res = await fetchWithBackoff(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ctx.authToken
      },
      body: JSON.stringify({
        name: config.name,
        type: config.type,
        compatibility: {
          versionID: config.compatibility.version,
          osID: config.compatibility.os,
          architecture: config.compatibility.architecture
        },
        version: config.version,
        provenanceURI: getActionRunURL(),
        packageClass: config.classification,
        sha256: hash,
        access: config.access
      })
    })
    if (!res.ok)
      throw new Error(
        `Failed to create package: status: ${res.statusText}, message: ${await res.text()}`
      )
    pkg = (await res.json()) as CreatePackage
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.error(`Failed to create new package: ${e.message}`)
    }
    throw e
  }
  core.debug(`Created package: ${JSON.stringify(pkg, null, 2)}`)
  core.info(`Package Id: ${pkg.package.id}`)

  // upload image using returned URL
  const upload = uploadFileWithBackoff(pkg.uploadURI)

  const files = await Promise.all(paths.map(async path => upload(path)))
  const failures = files.filter(f => !f.ok)

  if (failures.length > 0) {
    core.error('Failed to upload one or more files')
    const errMsgs = await Promise.all(
      failures.map(async f => `[${f.statusText}, ${await f.text()}]`)
    )
    throw new Error(`Failed to upload files: (${errMsgs.join(',')})`)
  }

  return pkg.package
}
