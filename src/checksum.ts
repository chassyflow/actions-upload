import crypto from 'crypto'
import { createReadStream } from 'fs'

export const computeChecksumOfBlob = async (
  blob: Blob,
  algorithm: 'md5' | 'sha256'
) => {
  switch (algorithm) {
    case 'md5': {
      const hash = crypto
        .createHash('md5')
        .update(new DataView(await blob.arrayBuffer()))
      return hash.digest('hex')
    }
    case 'sha256': {
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        await blob.arrayBuffer()
      )
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hexHash = hashArray
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
      return hexHash
    }
  }
}
export const computeChecksum = async (
  path: string,
  algorithm: 'md5' | 'sha256'
): Promise<string> =>
  new Promise((resolve, reject) => {
    const file = createReadStream(path)
    switch (algorithm) {
      case 'md5': {
        const hash = crypto.createHash('md5')
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
        const hash = crypto.createHash('sha256')
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
