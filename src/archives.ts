import { ZipArchive } from '@shortercode/webzip'
import { glob, Path } from 'glob'
import { readFileSync, writeFileSync } from 'fs'
import { RunContext } from './context'

export const zipBundle = async (ctx: RunContext, paths: Path[]) => {
  console.debug('bundling zip')
  const archive = new ZipArchive()
  for (const p of paths) {
    // read file content
    const readStream = readFileSync(p.fullpath())

    process.cwd()
    await archive.set(p.fullpath().split(process.cwd())[1].slice(1), readStream)
  }
  let files = []
  for (const file in archive.files()) files.push(archive.get(file))
  console.debug(`files in archive: ${files.join(',')}`)

  const blob = archive.to_blob()
  console.debug('blob size', blob.size)
  console.debug('blob text', await blob.text())

  return archive.to_blob()
}
