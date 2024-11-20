import * as core from '@actions/core'
import { wait } from './wait'
import { createRunContext } from './context'
import { imageUpload, packageUpload } from './upload'
import { ValiError } from 'valibot'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // get context
    const ctx = await createRunContext()

    if (ctx.config.type === 'IMAGE') {
      await imageUpload(ctx)
    } else {
      await packageUpload(ctx)
    }
  } catch (error) {
    if (error instanceof ValiError) core.setFailed(error)
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
