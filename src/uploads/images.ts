import { RunContext } from '../context'
import * as core from '@actions/core'
import os from 'os'
import { join } from 'path'
import { backOff } from 'exponential-backoff'
import { parse } from 'valibot'
import { getActionRunURL, getBackendUrl } from '../env'
import { createImageSchema, CreateImage } from '../api'
import { glob } from 'glob'
import fs from 'fs'
import { computeChecksum } from '../checksum'
import { BACKOFF_CONFIG, MULTI_PART_CHUNK_SIZE } from '../constants'
import { Partition, readPartitionConfig } from '../config'
import { fetchWithBackoff, uploadFileWithBackoff } from './utils'

/**
 * Upload image to Chassy Index
 */
export const imageUpload = async (ctx: RunContext) => {
  // it must be image
  if (ctx.config.type !== 'IMAGE')
    throw new Error('Attempted to upload generic package as image')
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
  // if partition configuration is provided, validate that it exists and is valid
  let partitions: Partition[] = []
  if (ctx.config.partitions) {
    const partitionPaths = await glob(ctx.config.partitions, {
      withFileTypes: true
    })
    if (partitionPaths.length === 0)
      throw new Error(
        `No partitions file found in provided path: ${ctx.config.partitions}`
      )
    if (partitionPaths.length > 1)
      throw new Error(
        `Too many partitions files found: ${partitionPaths
          .map(i => `"${i.fullpath()}"`)
          .join(',')}`
      )
    // parse partitions file
    partitions = readPartitionConfig(partitionPaths[0])
    core.debug(`Partitions: ${JSON.stringify(partitions, null, 2)}`)
  }

  const { rawDiskScheme, compressionScheme } = ctx.config

  core.startGroup('Computing checksum')
  let checksum
  try {
    checksum = `md5:${await computeChecksum(path.fullpath(), 'md5')}`
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.error(`Failed to compute checksum: ${e.message}`)
      throw e
    } else throw e
  }
  core.endGroup()
  core.debug(`Checksum: ${checksum}`)

  // create image in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/image`
  core.debug(`CreateURL: ${createUrl}`)

  core.startGroup('Create Image in Chassy Index')
  let image: CreateImage
  try {
    const res = await fetchWithBackoff(createUrl, {
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
        partitions,
        storageFormat: {
          compressionScheme,
          rawDiskScheme
        },
        checksum,
        sizeInBytes: path.size,
        access: ctx.config.access
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
    }
    throw e
  }
  core.endGroup()

  core.info(`Image Id: ${image.image.id}`)

  core.startGroup('Uploading files')

  const size = fs.statSync(path.fullpath()).size

  // upload image using returned URL
  if ('urls' in image) {
    // create chunks in temporary directory
    core.info('Chunking data')
    const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'chassy-upload-'))
    let start = 0
    const files: string[] = []
    for (let i = 0; i < image.urls.length; i++) {
      const end = Math.min(start + MULTI_PART_CHUNK_SIZE - 1, size - 1)
      const tempFilePath = join(tempDir, `chunk-${i}`)
      files.push(tempFilePath)
      const fileStream = fs.createReadStream(path.fullpath(), { start, end })
      await fs.promises.writeFile(tempFilePath, fileStream)
      start += MULTI_PART_CHUNK_SIZE
    }
    core.info('Finished chunking data')
    let pathIdx = 0
    const responses = await Promise.all(
      image.urls.map(async upload => {
        const expiryTimestamp = new Date(upload.expiryTimestamp)
        const body = fs.readFileSync(files[pathIdx++])

        // retry request while expiry time is not reached
        const res = await backOff(
          async () => {
            if (new Date() >= expiryTimestamp) {
              return { err: 'Upload expired', partNumber: upload.partNumber }
            }
            const res = await fetch(upload.uploadURI, {
              method: 'PUT',
              body
            } as unknown as RequestInit)
            if (!res.ok) {
              const errMsg = `Failed to upload part "${upload.partNumber}", "${await res.text()}"`
              throw new Error(errMsg)
            }
            return res
          },
          {
            ...BACKOFF_CONFIG,
            numOfAttempts: 999
          }
        )
        if ('err' in res) {
          core.error(`Failed to upload file "${path.fullpath()}"`)
          return {
            err: `Failed to upload file "${path.fullpath()}" due to "${res.err}"`,
            partNumber: upload.partNumber
          }
        }
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
    fs.rmSync(tempDir, { recursive: true })
    const fails = responses.filter(r => r.err)
    if (fails.length > 0) {
      core.error('Failed to upload one or more files')
      const errMsgs = fails.map(f => `[${f.err}]`)
      throw new Error(`Failed to upload files: (${errMsgs.join(',')})`)
    }
    // send confirmations
    await fetchWithBackoff(`${getBackendUrl(ctx.env).apiBaseUrl}/image`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ctx.authToken
      },
      body: JSON.stringify({
        id: image.image.id,
        confirmation: {
          uploadId: image.uploadId,
          eTags: responses.map(r => ({
            partNumber: r.partNumber,
            eTag: r.etag
          }))
        }
      })
    })
  } else {
    const upload = uploadFileWithBackoff(image.uploadURI)

    const res = await upload(path)

    if (!res.ok) {
      core.error(`Failed to upload file "${path.fullpath()}"`)
      throw new Error(`Failed to upload file "${path.fullpath()}"`)
    }
  }
  core.endGroup()

  return image.image
}
