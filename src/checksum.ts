import { createHash } from 'crypto'
import { readFileSync } from 'fs'

export const computeChecksum = (
  path: string,
  algorithm: 'md5' | 'sha256'
): string => {
  const file = readFileSync(path)
  switch (algorithm) {
    case 'md5':
      return createHash('md5').update(file).digest('hex')
    case 'sha256':
      return createHash('sha256').update(file).digest('hex')
  }
}
