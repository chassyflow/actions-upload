import fs from 'fs'
import { computeChecksum, computeChecksumOfBlob } from '../src/checksum'

describe('hashing algorithms work', () => {
  it('blob sha256 LICENSE', async () => {
    const file = fs.readFileSync('LICENSE', 'utf-8')
    const blob = new Blob([file], { type: 'text/plain' })
    const hash = await computeChecksumOfBlob(blob, 'sha256')
    expect(hash).toStrictEqual(
      '32d0bae2419f014f5066af5915264c966efdb7b6e7fe8f90cf87dc75c5a8d6d0'
    )
  })
  it('path sha256 LICENSE', async () => {
    const hash = await computeChecksum('LICENSE', 'sha256')
    expect(hash).toStrictEqual(
      '32d0bae2419f014f5066af5915264c966efdb7b6e7fe8f90cf87dc75c5a8d6d0'
    )
  })
  it('blob md5 LICENSE', async () => {
    const file = fs.readFileSync('LICENSE', 'utf-8')
    const blob = new Blob([file], { type: 'text/plain' })
    const hash = await computeChecksumOfBlob(blob, 'md5')
    expect(hash).toStrictEqual('2f8b000829d338099edaf706ee5549ba')
  })
  it('path md5 LICENSE', async () => {
    const hash = await computeChecksum('LICENSE', 'md5')
    expect(hash).toStrictEqual('2f8b000829d338099edaf706ee5549ba')
  })
})
