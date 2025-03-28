import { RunContext } from '../context'
import * as core from '@actions/core'
import { getActionRunURL, getBackendUrl } from '../env'
import { CreatePackage } from '../api'
import { glob } from 'glob'
import { isArchive, zipBundle } from '../archives'
import { computeChecksum, computeChecksumOfBlob } from '../checksum'
import { assertType } from '../config'
import { uploadFileWithBackoff, dbg, fetchWithBackoff } from './utils'

/**
 * Upload archive package to Chassy Index
 */
export const archiveUpload = async (ctx: RunContext) => {
  // it must be archive
  const config = assertType(ctx.config, 'ARCHIVE')
  // validate that files exist
  const paths = await glob(config.path, { withFileTypes: true })
  core.info(`Found files: ${paths.map(f => f.fullpath()).join(',')}`)
  const [path, ...extra] = paths
  if (!path) throw new Error(`No files found in provided path: ${config.path}`)
  const bundled = path && isArchive(path) && extra.length === 0

  // create image in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/package`

  const blobbed = !bundled ? await zipBundle(ctx, paths) : undefined

  const hash =
    'sha256:' +
    (!bundled
      ? await computeChecksumOfBlob(blobbed as Blob, 'sha256')
      : await computeChecksum(path.fullpath(), 'sha256'))

  core.startGroup('Create Archive in Chassy Index')
  let pkg: CreatePackage
  try {
    const res = await fetchWithBackoff(
      createUrl,
      dbg({
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
          entrypoint: config.entrypoint,
          access: config.access
        })
      })
    )
    if (!res.ok)
      throw new Error(
        `Failed to create archive: status: ${res.statusText}, message: ${await res.text()}`
      )
    pkg = (await res.json()) as CreatePackage
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.error(`Failed to create new archive: ${e.message}`)
    }
    throw e
  }
  core.endGroup()

  core.debug(`Created archive: ${JSON.stringify(pkg, null, 2)}`)
  core.info(`Package Id: ${pkg.package.id}`)

  // upload image using returned URL
  const upload = uploadFileWithBackoff(pkg.uploadURI)

  core.startGroup('Uploading files')

  let res
  if (!bundled) {
    const blob = blobbed as Blob

    res = await fetchWithBackoff(pkg.uploadURI, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': blob.size.toString()
      },
      body: blob
    })
  } else res = await upload(path)

  if (!res.ok) {
    core.error(`Failed to upload file "${path.fullpath()}"`)
    throw new Error(`Failed to upload file "${path.fullpath()}"`)
  }
  core.endGroup()

  return pkg.package
}
