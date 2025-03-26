import { RunContext } from '../context'
import * as core from '@actions/core'
import { getActionRunURL, getBackendUrl } from '../env'
import { CreatePackage } from '../api'
import { glob } from 'glob'
import { computeChecksum } from '../checksum'
import { assertType } from '../config'
import { uploadFile } from './utils'
import { backOff } from 'exponential-backoff'
import { BACKOFF_CONFIG } from '../constants'

/**
 * Upload file to Chassy Index
 */
export const fileUpload = async (ctx: RunContext) => {
  const config = assertType(ctx.config, 'FILE')
  // validate that files exist
  const paths = await glob(config.path, { withFileTypes: true })
  core.info(`Found files: ${paths.map(f => f.fullpath()).join(',')}`)
  if (paths.length === 0)
    throw new Error(`No files found in provided path: ${config.path}`)

  const isMany = paths.length > 1

  if (isMany && config.name) {
    core.warning(
      `Found multiple files and a name was provided. Ignoring name and using file names`
    )
  }

  // create package in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/package`

  const responses = paths
    .map(async path => {
      const hash =
        'sha256:' + (await computeChecksum(path.fullpath(), 'sha256'))

      const name = isMany ? path.name : (config.name ?? path.name)
      let pkg: CreatePackage
      try {
        const res = await backOff(
          async () =>
            fetch(createUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: ctx.authToken
              },
              body: JSON.stringify({
                name,
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
            }),
          BACKOFF_CONFIG
        )
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
      return {
        pkg,
        path,
        name
      }
    })
    .map(async data => {
      const { pkg, path, name } = await data
      const upload = uploadFile(pkg.uploadURI)
      return {
        res: await backOff(async () => upload(path), BACKOFF_CONFIG),
        pkg,
        name
      }
    })
  const files = await Promise.all(responses)
  const failures = files.filter(f => !f.res.ok)

  if (failures.length > 0) {
    core.error('Failed to upload one or more files')
    const errMsgs = await Promise.all(
      failures.map(async f => `[${f.res.statusText}, ${await f.res.text()}]`)
    )
    throw new Error(`Failed to upload files: (${errMsgs.join(',')})`)
  }

  return files.map(f => ({ pkg: f.pkg, name: f.name }))
}
