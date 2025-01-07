import { RunContext } from './context'
import * as core from '@actions/core'
import { backOff } from 'exponential-backoff'
import { parse } from 'valibot'
import { getActionRunURL, getBackendUrl } from './env'
import { createImageSchema, CreatePackage, CreateImage } from './api'
import { glob, Path } from 'glob'
import { readFileSync, statSync } from 'fs'
import { isArchive, zipBundle } from './archives'
import { computeChecksum } from './checksum'
import { BACKOFF_CONFIG, MULTI_PART_CHUNK_SIZE } from './constants'

const uploadFile = (url: string) => async (path: Path) => {
  const readStream = readFileSync(path.fullpath())

  core.debug(`Uploading file: ${path.fullpath()}`)

  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': statSync(path.fullpath()).size.toString()
    },
    body: readStream
  })
}

/**
 * Upload image to Chassy Index
 */
export const imageUpload = async (ctx: RunContext) => {
  // it must be image
  if (ctx.config.type !== 'IMAGE')
    throw new Error('Attempted to upload generic package as image')
  // if compressionScheme is provided, then rawDiskScheme must be provided
  if (ctx.config.compressionScheme && !ctx.config.rawDiskScheme)
    throw new Error('Compression scheme provided without raw disk scheme')
  // validate that files exist
  const paths = await glob(ctx.config.path, { withFileTypes: true })
  core.info(`Found files: ${paths.map(f => f.fullpath()).join(',')}`)
  const [path, ...extra] = paths
  if (extra.length > 0)
    throw new Error(
      `Too many files found: ${paths.map(i => `"${i.fullpath()}"`).join(',')}`
    )
  else if (!path)
    throw new Error(`No files found in provided path: ${ctx.config.path}`)

  // create image in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/image`

  core.startGroup('Create Image in Chassy Index')
  let image: CreateImage
  try {
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ctx.authToken
      },
      body: JSON.stringify({
        name: ctx.config.name,
        type: ctx.config.classification,
        compatibility: {
          versionID: ctx.config.compatibility.version,
          osID: ctx.config.compatibility.os,
          architecture: ctx.config.compatibility.architecture
        },
        provenanceURI: getActionRunURL(),
        partitions: ctx.config.partitions ?? [],
        ...(ctx.config.rawDiskScheme
          ? {
              storageFormat: {
                compressionScheme: ctx.config.compressionScheme,
                rawDiskScheme: ctx.config.rawDiskScheme
              }
            }
          : {}),
        checksum: computeChecksum(path.fullpath(), 'md5'),
        sizeInBytes: path.size
      })
    })
    if (!res.ok)
      throw new Error(
        `Failed to create image: status: ${res.statusText}, message: ${await res.text()}`
      )
    image = parse(createImageSchema, await res.json())
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.error(`Failed to create new image: ${e.message}`)
      throw e
    } else throw e
  }
  core.endGroup()

  core.debug(`Created image: ${JSON.stringify(image)}`)
  core.info(`Image Id: ${image.image.id}`)

  core.startGroup('Uploading files')

  // upload image using returned URL
  if ('urls' in image) {
    const readStream = readFileSync(path.fullpath())
    let start = MULTI_PART_CHUNK_SIZE
    const responses = await Promise.all(
      image.urls.map(async upload => {
        // retry request while expiry time is not reached
        const res = await backOff(
          async () => {
            const res = await fetch(upload.uploadURI, {
              method: 'PUT',
              body: readStream.slice(start, start + MULTI_PART_CHUNK_SIZE)
            })
            start += MULTI_PART_CHUNK_SIZE
            if (!res.ok) {
              throw new Error(`Failed to upload part "${upload.partNumber}"`)
            }
            return res
          },
          {
            ...BACKOFF_CONFIG,
            numOfAttempts: 999,
            retry: () => Date.now() < upload.expiryTimestamp.getMilliseconds()
          }
        )
        //res => res.ok,
        //() => Date.now() < upload.expiryTimestamp.getMilliseconds()
        if (!res.ok) {
          core.error(`Failed to upload file "${path.fullpath()}"`)
          return {
            err: `Failed to upload file "${path.fullpath()}"`,
            partNumber: upload.partNumber
          }
        }
        // etag header
        return { etag: res.headers.get('ETag'), partNumber: upload.partNumber }
      })
    )
    const fails = responses.filter(r => r.err)
    if (fails.length > 0) {
      core.error('Failed to upload one or more files')
      const errMsgs = fails.map(f => `[${f.err}]`)
      throw new Error(`Failed to upload files: (${errMsgs.join(',')})`)
    }
    // send confirmations
    await backOff(async () => {
      const res = await fetch(`${getBackendUrl(ctx.env).apiBaseUrl}/image`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: ctx.authToken
        },
        body: JSON.stringify({
          id: image.image.id,
          confirmation: {
            uploadId: image.uploadId,
            etags: responses.map(r => ({
              partNumber: r.partNumber,
              etag: r.etag
            }))
          }
        })
      })
      if (!res.ok) throw new Error(`Failed to confirm upload`)
      return res
    }, BACKOFF_CONFIG)
  } else {
    const upload = uploadFile(image.uploadURI)

    const res = await upload(path)

    if (!res.ok) {
      core.error(`Failed to upload file "${path.fullpath()}"`)
      throw new Error(`Failed to upload file "${path.fullpath()}"`)
    }
  }
  core.endGroup()

  return image.image
}

/**
 * Upload archive package to Chassy Index
 */
export const archiveUpload = async (ctx: RunContext) => {
  // it must be archive
  if (ctx.config.type !== 'ARCHIVE')
    throw new Error('Attempted to upload non-archive as archive')
  if (ctx.config.classification !== 'BUNDLE')
    throw new Error('Archive must have classification `BUNDLE`')
  // validate that files exist
  const paths = await glob(ctx.config.path, { withFileTypes: true })
  core.info(`Found files: ${paths.map(f => f.fullpath()).join(',')}`)
  const [path, ...extra] = paths
  if (!path)
    throw new Error(`No files found in provided path: ${ctx.config.path}`)
  const bundled = path && isArchive(path) && extra.length === 0

  // create image in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/package`

  core.startGroup('Create Archive in Chassy Index')
  let pkg: CreatePackage
  try {
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ctx.authToken
      },
      body: JSON.stringify({
        name: ctx.config.name,
        type: ctx.config.type,
        compatibility: {
          versionID: ctx.config.compatibility.version,
          osID: ctx.config.compatibility.os,
          architecture: ctx.config.compatibility.architecture
        },
        version: ctx.config.version,
        provenanceURI: getActionRunURL(),
        packageClass: ctx.config.classification
      })
    })
    if (!res.ok)
      throw new Error(
        `Failed to create archive: status: ${res.statusText}, message: ${await res.text()}`
      )
    pkg = (await res.json()) as CreatePackage
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.error(`Failed to create new archive: ${e.message}`)
      throw e
    } else throw e
  }
  core.endGroup()

  core.debug(`Created archive: ${JSON.stringify(pkg)}`)
  core.info(`Package Id: ${pkg.package.id}`)

  // upload image using returned URL
  const upload = uploadFile(pkg.uploadURI)

  core.startGroup('Uploading files')

  let res
  if (!bundled) {
    const blob = await zipBundle(ctx, paths)

    res = await fetch(pkg.uploadURI, {
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

/**
 * Upload package to Chassy Index
 */
export const packageUpload = async (ctx: RunContext) => {
  // it must not be image
  if (ctx.config.type === 'IMAGE')
    throw new Error('Attempted to upload image as generic package')
  // validate that files exist
  const paths = await glob(ctx.config.path, { withFileTypes: true })
  core.info(`Found files: ${paths.map(f => f.fullpath()).join(',')}`)
  if (paths.length === 0)
    throw new Error(`No files found in provided path: ${ctx.config.path}`)
  if (paths.length > 1 && ctx.config.type !== 'ARCHIVE')
    throw new Error(
      `Too many files found: ${paths.map(i => `"${i.fullpath()}"`).join(',')}`
    )

  // create image in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/package`

  let pkg: CreatePackage
  try {
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ctx.authToken
      },
      body: JSON.stringify({
        name: ctx.config.name,
        type: ctx.config.type,
        compatibility: {
          versionID: ctx.config.compatibility.version,
          osID: ctx.config.compatibility.os,
          architecture: ctx.config.compatibility.architecture
        },
        version: ctx.config.version,
        provenanceURI: getActionRunURL(),
        packageClass: ctx.config.classification
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
      throw e
    } else throw e
  }
  core.debug(`Created package: ${JSON.stringify(pkg)}`)
  core.info(`Package Id: ${pkg.package.id}`)

  // upload image using returned URL
  const upload = uploadFile(pkg.uploadURI)

  const files = await Promise.all(paths.map(upload))
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
