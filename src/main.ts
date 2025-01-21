import * as core from '@actions/core'
import { createRunContext } from './context'
import { archiveUpload, imageUpload, packageUpload } from './upload'
import { ValiError } from 'valibot'
import { Image, Package } from './api'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // get context
    const ctx = await createRunContext()
    core.debug(`Config: ${JSON.stringify(ctx, null, 2)}`)

    let output: Image | Package
    if (ctx.config.type === 'IMAGE') {
      output = await imageUpload(ctx)
    } else if (ctx.config.type === 'ARCHIVE') {
      output = await archiveUpload(ctx)
    } else {
      output = await packageUpload(ctx)
    }
    core.setOutput('id', output.id)
  } catch (error) {
    if (error instanceof ValiError) core.setFailed(error)
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
