import { createHash } from 'crypto'
import { createReadStream } from 'fs'

export const computeChecksum = (
  path: string,
  algorithm: 'md5' | 'sha256'
): Promise<string> =>
  new Promise((resolve, reject) => {
    const file = createReadStream(path)
    switch (algorithm) {
      case 'md5': {
        const hash = createHash('md5')
        file.on('data', chunk => {
          hash.update(chunk)
        })
        file.on('end', () => {
          resolve(hash.digest('hex'))
        })
        file.on('error', () => {
          reject(new Error('Failed to read file'))
        })
        break
      }
      case 'sha256': {
        const hash = createHash('sha256')
        file.on('data', chunk => {
          hash.update(chunk)
        })
        file.on('end', () => {
          resolve(hash.digest('hex'))
        })
        file.on('error', () => {
          reject(new Error('Failed to read file'))
        })
        break
      }
      default:
        reject(new Error('Invalid algorithm'))
    }
  })
