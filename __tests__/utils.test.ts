import { chunkArray } from '../src/uploads/utils'

describe('Chunking works', () => {
  it('chunking an empty array produces an empty array', () => {
    for (let i = 1; i < 20; i++) {
      const chunks = chunkArray([], i)
      expect(chunks).toEqual([])
    }
  })

  // For the following tests, let a be the length of the array and b be the chunk size
  it('chunking an array where a<b', () => {
    for (let i = 1; i < 10; i++) {
      const data = Array.from({ length: i }).map((_, idx) => idx)
      const chunks = chunkArray(data, 10)
      expect(data.length).toBeLessThan(10)
      expect(chunks).toHaveLength(1)
      expect(chunks).toEqual([data])
    }
  })

  it('chunking an array where a=b', () => {
    for (let i = 1; i < 20; i++) {
      const data = Array.from({ length: i }).map((_, idx) => idx)
      const chunks = chunkArray(data, data.length)
      expect(chunks).toEqual([data])
    }
  })

  it('chunking an array where b=1', () => {
    for (let i = 1; i < 20; i++) {
      const data = Array.from({ length: i }).map((_, idx) => idx)
      const chunks = chunkArray(data, 1)
      expect(chunks).toHaveLength(i)
      expect(chunks).toEqual(data.map(d => [d]))
    }
  })

  it('chunking an array where b % 1 != 0 results in error', () => {
    for (let i = 1; i < 20; i++) {
      const data = Array.from({ length: i }).map((_, idx) => idx)
      expect(() => chunkArray(data, 1.5)).toThrow('Size must be an integer')
    }
  })

  it('chunking an array where b is not an integer results in error', () => {
    for (let i = 1; i < 20; i++) {
      const data = Array.from({ length: i }).map((_, idx) => idx)
      expect(() => chunkArray(data, 1.5)).toThrow('Size must be an integer')
    }
  })

  it('chunking an array where b < 1 results in error', () => {
    for (let i = 1; i < 20; i++) {
      const data = Array.from({ length: i }).map((_, idx) => idx)
      expect(() => chunkArray(data, 0)).toThrow('Size must be greater than 0')
    }
  })
})
