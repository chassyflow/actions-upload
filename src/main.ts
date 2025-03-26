import * as core from '@actions/core'
import { createRunContext } from './context'
import {
  archiveUpload,
  imageUpload,
  fileUpload,
  firmwareUpload
} from './uploads'
import { ValiError } from 'valibot'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // get context
    const ctx = await createRunContext()
    core.debug(`Config: ${JSON.stringify(ctx, null, 2)}`)

    switch (ctx.config.type) {
      case 'IMAGE': {
        const output = await imageUpload(ctx)
        core.setOutput('id', output.id)
        break
      }
      case 'ARCHIVE': {
        const output = await archiveUpload(ctx)
        core.setOutput('id', output.id)
        break
      }
      case 'FILE': {
        const result = await fileUpload(ctx)
        result.forEach(data => {
          core.setOutput(data.name, data.pkg.package.id)
        })
        break
      }
      case 'FIRMWARE': {
        const output = await firmwareUpload(ctx)
        core.setOutput('id', output.id)
        break
      }
      default:
        throw new Error(`Unrecognized configuration type: ${ctx.config}`)
    }
  } catch (error) {
    if (error instanceof ValiError) core.setFailed(error)
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
