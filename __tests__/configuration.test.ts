import * as core from '@actions/core'

import { getConfig } from '../src/config'

export const mockInput = (input: Record<string, string>) => {
  const getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
  getInputMock.mockImplementation(property => input[property])
  return getInputMock
}

const assertType = <
  T extends ReturnType<typeof getConfig>,
  K extends ReturnType<typeof getConfig>['type']
>(
  cfg: T,
  type: K
): Extract<T, { type: K }> => {
  expect(cfg.type).toStrictEqual(type)
  if (cfg.type !== type) throw new Error('Type is not ' + type)
  return cfg as Extract<T, { type: K }>
}

describe('archive parsing', () => {
  it('classification is not required', () => {
    mockInput({
      name: 'test',
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      version: '1.0.0',
      type: 'ARCHIVE',
      entrypoint: 'javac'
    })
    const cfg = getConfig()

    expect(cfg.type).toStrictEqual('ARCHIVE')
    expect(cfg.classification).toStrictEqual('BUNDLE')
  })
  it('classification can still be provided', () => {
    mockInput({
      name: 'test',
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      version: '1.0.0',
      type: 'ARCHIVE',
      classification: 'BUNDLE',
      entrypoint: 'javac'
    })

    const cfg = getConfig()

    expect(cfg.type).toStrictEqual('ARCHIVE')
    expect(cfg.classification).toStrictEqual('BUNDLE')
  })
})

describe('package parsing', () => {
  it('file parses correctly', () => {
    mockInput({
      name: 'test',
      path: 'src/api.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      version: '1.0.0',
      type: 'FILE',
      classification: 'EXECUTABLE'
    })

    const cfg = getConfig()
    expect(cfg.type).toStrictEqual('FILE')
    expect(cfg.classification).toStrictEqual('EXECUTABLE')
  })

  it('firmware parses correctly', () => {
    mockInput({
      name: 'test',
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      entrypoint: 'javac',
      version: '1.0.0',
      type: 'FIRMWARE',
      classification: 'EXECUTABLE'
    })

    const cfg = getConfig()
    if (cfg.type !== 'FIRMWARE') throw new Error('Type is not FIRMWARE')
    expect(cfg.classification).toStrictEqual('EXECUTABLE')
  })
})

describe('image parsing', () => {
  it('basic image parses correctly', () => {
    mockInput({
      name: 'test',
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      raw_disk_scheme: 'IMG',
      version: '1.0.0',
      type: 'IMAGE',
      classification: 'RFSIMAGE'
    })

    const cfg = assertType(getConfig(), 'IMAGE')
    expect(cfg.classification).toStrictEqual('RFSIMAGE')
    expect(cfg.compressionScheme).toStrictEqual('NONE')
  })
  it('image with partitions parses correctly', () => {
    mockInput({
      name: 'test',
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      partitions: './data/good.partitions.json',
      compression_scheme: 'ZIP',
      raw_disk_scheme: 'IMG',
      version: '1.0.0',
      type: 'IMAGE',
      classification: 'RFSIMAGE'
    })

    const cfg = assertType(getConfig(), 'IMAGE')
    expect(cfg.classification).toStrictEqual('RFSIMAGE')
  })
  it('image with compression parses correctly', () => {
    mockInput({
      name: 'test',
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      compression_scheme: 'ZIP',
      raw_disk_scheme: 'IMG',
      version: '1.0.0',
      type: 'IMAGE',
      classification: 'RFSIMAGE'
    })

    const cfg = assertType(getConfig(), 'IMAGE')
    expect(cfg.classification).toStrictEqual('RFSIMAGE')
  })
})

describe('base schema testing', () => {
  it('access defaults to "PUBLIC"', () => {
    mockInput({
      name: 'test',
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      partitions: './data/good.partitions.json',
      compression_scheme: 'ZIP',
      raw_disk_scheme: 'IMG',
      version: '1.0.0',
      type: 'IMAGE',
      classification: 'RFSIMAGE'
    })

    const cfg = assertType(getConfig(), 'IMAGE')
    expect(cfg.access).toStrictEqual('PUBLIC')
  })
  it('access uppercases', () => {
    mockInput({
      name: 'test',
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      partitions: './data/good.partitions.json',
      compression_scheme: 'ZIP',
      raw_disk_scheme: 'IMG',
      access: 'private',
      version: '1.0.0',
      type: 'IMAGE',
      classification: 'RFSIMAGE'
    })

    const cfg = assertType(getConfig(), 'IMAGE')
    expect(cfg.access).toStrictEqual('PRIVATE')
  })
})
