import * as core from '@actions/core'

import { getConfig } from '../src/config'

const mockInput = (input: Record<string, string>) => {
  const getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
  getInputMock.mockImplementation(property => input[property])
  return getInputMock
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
      path: 'src/*.ts',
      architecture: 'ARM64',
      os: 'ubuntu',
      os_version: '20.04',
      entrypoint: 'javac',
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
    expect(cfg.type).toStrictEqual('FIRMWARE')
    expect(cfg.classification).toStrictEqual('EXECUTABLE')
  })
})

describe('image parsing', () => {
  it('basic image parses correctly', () => {
    throw new Error('Not implemented')
  })
  it('image with partitions parses correctly', () => {
    throw new Error('Not implemented')
  })
  it('image with compression parses correctly', () => {
    throw new Error('Not implemented')
  })
})
