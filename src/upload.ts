import { RunContext } from './context'
import * as core from '@actions/core'
import { getBackendUrl } from './env'
import { CreateImage, CreatePackage } from './api'
import { glob, Path } from 'glob'
import { readFileSync, statSync } from 'fs'

const dbg = <T>(x: T) => {
  console.debug(x)
  return x
}

const uploadFile = (url: string) => async (path: Path) => {
  const readStream = readFileSync(path.fullpath())

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
  // validate that files exist
  const images = await glob(ctx.config.path, { withFileTypes: true })
  if (images.length === 0)
    throw new Error(`No files found in provided path: ${ctx.config.path}`)

  // create image in Chassy Index
  const createUrl = `${getBackendUrl(ctx.env).apiBaseUrl}/image`

  let image: CreateImage
  try {
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ctx.authToken
      },
      body: JSON.stringify(
        dbg({
          name: ctx.config.name,
          type: ctx.config.type,
          compatibility: {
            os_version: ctx.config.version,
            os_name: ctx.config.os,
            architecture: ctx.config.architecture
          }
        })
      )
    })
    if (!res.ok)
      throw new Error(
        `Failed to create package: status: ${res.statusText}, message: ${await res.text()}`
      )
    image = await res.json()
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.error(`Failed to create new image: ${e.message}`)
      throw e
    } else throw e
  }
  console.log(image)

  // upload image using returned URL
  const upload = uploadFile(image.uploadURI)

  const files = await Promise.all(images.map(upload))
  const failures = files.filter(f => !f.ok)

  if (failures.length > 0) {
    core.error('Failed to upload one or more files')
    throw new Error(`Failed to upload files: (${failures.join(',')})`)
  }

  return image.image
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
  if (paths.length === 0)
    throw new Error(`No files found in provided path: ${ctx.config.path}`)

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
      body: JSON.stringify(
        dbg({
          name: ctx.config.name,
          type: ctx.config.type,
          compatibility: {
            os_version: ctx.config.version,
            os_name: ctx.config.os,
            architecture: ctx.config.architecture
          },
          packageClass: ctx.config.classification
        })
      )
    })
    if (!res.ok)
      throw new Error(
        `Failed to create package: status: ${res.statusText}, message: ${await res.text()}`
      )
    pkg = await res.json()
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.error(`Failed to create new package: ${e.message}`)
      throw e
    } else throw e
  }
  console.log(pkg)

  // upload image using returned URL
  const upload = uploadFile(pkg.uploadURI)

  const files = await Promise.all(paths.map(upload))
  const failures = files.filter(f => !f.ok)

  if (failures.length > 0) {
    core.error('Failed to upload one or more files')
    throw new Error(`Failed to upload files: (${failures.join(',')})`)
  }

  return pkg.package
}
