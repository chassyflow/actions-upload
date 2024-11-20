import { ZipArchive } from '@shortercode/webzip'
import { glob, Path } from 'glob'
import { readFileSync, writeFileSync } from 'fs'
import { RunContext } from './context'

export const zipBundle = async (ctx: RunContext, paths: Path[]) => {
  const archive = new ZipArchive()
  paths.forEach(p => {
    // read file content
    const readStream = readFileSync(p.fullpath())

    process.cwd()
    archive.set(p.fullpath().split(process.cwd())[1], readStream)
  })

  writeFileSync(`/tmp/${ctx.config.name}.zip`, await archive.to_blob().text())

  const archives = await glob('/tmp/${ctx.config.name}.zip', {
    withFileTypes: true
  })
  return archives[0]
}
