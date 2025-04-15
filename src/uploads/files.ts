import { RunContext } from '../context'
import * as core from '@actions/core'
import { getActionRunURL, getBackendUrl } from '../env'
import { CreatePackages } from '../api'
import { glob } from 'glob'
import { computeChecksum } from '../checksum'
import { assertType } from '../config'
import { chunkArray, fetchWithBackoff, uploadFileWithBackoff } from './utils'
import { MAX_PACKAGE_BATCH_SIZE } from 'src/constants'

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

  const pathsWithChecksum = await Promise.all(
    paths.map(async path => {
      const checksum =
        'sha256:' + (await computeChecksum(path.fullpath(), 'sha256'))
      return {
        path,
        checksum
      }
    })
  )

  const chunkedPaths = chunkArray(pathsWithChecksum, MAX_PACKAGE_BATCH_SIZE)

  const isMany = paths.length > 1

  if (isMany && config.name) {
    core.warning(
      `Found multiple files and a name was provided. Ignoring name and using file names`
    )
  }

  // create package in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/packages`

  core.startGroup('Create Package in Chassy Index')

  const pkgs = (
    await Promise.all(
      chunkedPaths.map(async chunk => {
        let subPkgs: CreatePackages
        try {
          const res = await fetchWithBackoff(createUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: ctx.authToken
            },
            body: JSON.stringify({
              packages: chunk.map(({ checksum, path }) => ({
                name: isMany ? path.name : (config.name ?? path.name),
                type: config.type,
                compatibility: {
                  versionID: config.compatibility.version,
                  osID: config.compatibility.os,
                  architecture: config.compatibility.architecture
                },
                version: config.version,
                provenanceURI: getActionRunURL(),
                packageClass: config.classification,
                sha256: checksum,
                access: config.access
              }))
            })
          })
          if (!res.ok) {
            throw new Error(
              `Failed to create package: status: ${res.statusText}, message: ${await res.text()}`
            )
          }
          subPkgs = (await res.json()) as CreatePackages
        } catch (e: unknown) {
          if (e instanceof Error) {
            core.error(`Failed to create new package: ${e.message}`)
          }
          throw e
        }

        for (const pkg of subPkgs.packages) {
          core.debug(`Created package: ${JSON.stringify(pkg, null, 2)}`)
          core.info(`Package Id: ${pkg.package.id}`)
        }

        // associate pkgs with paths
        const associatedPkgs = chunk.map(({ path, checksum }) => {
          const name = isMany ? path.name : (config.name ?? path.name)
          const pkg = subPkgs.packages.find(
            p => p.package.name === path.name && p.package.sha256 === checksum
          )
          if (!pkg) {
            throw new Error(
              `Failed to find package for path: ${path.fullpath()}`
            )
          }
          return {
            path,
            pkg,
            name
          }
        })

        return associatedPkgs
      })
    )
  )
    .flat()
    .map(async ({ path, pkg, name }) => {
      core.info(`Uploading file: ${name}`)
      const upload = uploadFileWithBackoff(pkg.uploadURI)
      return {
        res: await upload(path),
        pkg,
        name
      }
    })

  const uploads = await Promise.all(pkgs)
  const failures = uploads.filter(f => !f.res.ok)

  if (failures.length > 0) {
    core.error('Failed to upload one or more files')
    const errMsgs = await Promise.all(
      failures.map(async f => `[${f.res.statusText}, ${await f.res.text()}]`)
    )
    throw new Error(`Failed to upload files: (${errMsgs.join(',')})`)
  }

  return uploads.map(f => ({ pkg: f.pkg, name: f.name }))
}
