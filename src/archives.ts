import { ZipArchive } from '@shortercode/webzip'
import { Path } from 'glob'
import { readFileSync } from 'fs'
import { RunContext } from './context'
import * as core from '@actions/core'

export const zipBundle = async (ctx: RunContext, paths: Path[]) => {
  core.debug('bundling zip')
  const archive = new ZipArchive()
  for (const p of paths) {
    // read file content
    const readStream = readFileSync(p.fullpath())

    process.cwd()
    await archive.set(p.fullpath().split(process.cwd())[1].slice(1), readStream)
  }

  return archive.to_blob()
}
