import { readPartitionConfig } from '../src/config'
import { glob } from 'glob'

describe('partitions parse correctly', () => {
  it('good partitions parse correctly', async () => {
    const [path, ...paths] = await glob(
      './__tests__/data/good.partitions.json',
      {
        withFileTypes: true
      }
    )
    expect(path).not.toBeUndefined()
    expect(paths).toHaveLength(0)
    const [partition, ...partitions] = readPartitionConfig(path)
    expect(partition).not.toBeUndefined()
    expect(partitions).toHaveLength(0)
    expect(partition.name).toStrictEqual('root')
  })
  it("doesn't allow invalid sizes", async () => {
    const [path, ...paths] = await glob(
      './__tests__/data/invalid_size.partitions.json',
      {
        withFileTypes: true
      }
    )
    expect(path).not.toBeUndefined()
    expect(paths).toHaveLength(0)
    expect(() => readPartitionConfig(path)).toThrow()
  })
  it("doesn't allow malformed sizes", async () => {
    const [path, ...paths] = await glob(
      './__tests__/data/malformed_size.partitions.json',
      {
        withFileTypes: true
      }
    )
    expect(path).not.toBeUndefined()
    expect(paths).toHaveLength(0)
    expect(() => readPartitionConfig(path)).toThrow()
  })
})
