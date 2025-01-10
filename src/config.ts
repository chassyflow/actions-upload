import * as v from 'valibot'
import * as core from '@actions/core'
import { readFileSync } from 'fs'
import { Path } from 'glob'

const architectureSchema = v.union([
  v.literal('AMD64'),
  v.literal('ARM64'),
  v.literal('ARMv6'),
  v.literal('ARMv7'),
  v.literal('RISCV'),
  v.literal('UNKNOWN')
])

const imagePartitionSchema = v.object({
  filesystemType: v.string('filesystemType must be string'),
  mountPoint: v.string('mountPoint must be string'),
  name: v.string('name must be string'),
  size: v.pipe(
    v.string('size must be provided as string'),
    v.regex(/^\d+(\.\d+)?[mMgGbBkK]$/gm, 'Invalid size provided')
  ),
  startSector: v.pipe(
    v.number('startSector must be number'),
    v.integer('startSector must be integer'),
    v.minValue(0, 'startSector must be at least 0')
  ),
  partitionType: v.string('partitionType must be string')
})

const imageSchema = v.intersect([
  v.object(
    {
      type: v.literal('IMAGE'),
      classification: v.union(
        [v.literal('RFSIMAGE'), v.literal('YOCTO')],
        'classification must be RFSIMAGE or YOCTO'
      ),
      partitions: v.optional(v.string('partitions (path) must be string')),
      compressionScheme: v.optional(
        v.union([v.literal('NONE'), v.literal('ZIP'), v.literal('TGZ')]),
        'NONE'
      ),
      rawDiskScheme: v.union([v.literal('IMG'), v.literal('ISO')])
    },
    'image malformed'
  ),
  v.union([v.object({})])
])

const packageSchema = v.object({
  type: v.union(
    [v.literal('FILE'), v.literal('ARCHIVE'), v.literal('FIRMWARE')],
    'type must be FILE, ARCHIVE, or FIRMWARE'
  ),
  classification: v.union(
    [
      v.literal('EXECUTABLE'),
      v.literal('CONFIG'),
      v.literal('DATA'),
      v.literal('BUNDLE')
    ],
    'classification must be EXECUTABLE, CONFIG, DATA, or BUNDLE'
  ),
  version: v.string('version must be string')
})

const compatibilitySchema = v.object(
  {
    architecture: architectureSchema,
    os: v.string('os must be string'),
    version: v.pipe(
      v.string('version must be string'),
      v.minLength(3, 'version must be at least 3 characters')
    )
  },
  'compatibility malformed, must have architecture, os, and version'
)

export const baseSchema = v.object({
  name: v.pipe(
    v.string('name must be string'),
    v.minLength(1, 'name must be at least 1 character')
  ),
  path: v.pipe(
    v.string('path must be string'),
    v.minLength(1, 'path must be at least 1 character')
  ),
  compatibility: compatibilitySchema
})

export const configSchema = v.intersect(
  [
    baseSchema,
    v.union(
      [imageSchema, packageSchema],
      'config must match image or package schema'
    )
  ],
  'malformed configuration'
)
export type Config = v.InferOutput<typeof configSchema>

/**
 * Get configuration options for environment
 */
export const getConfig = () =>
  v.parse(configSchema, {
    name: core.getInput('name'),
    path: core.getInput('path'),
    compatibility: {
      architecture: core.getInput('architecture'),
      os: core.getInput('os'),
      version: core.getInput('os_version')
    },
    partitions: core.getInput('partitions'),
    compressionScheme: core.getInput('compression_scheme'),
    rawDiskScheme: core.getInput('raw_disk_scheme'),
    version: core.getInput('version'),
    type: core.getInput('type'),
    classification: core.getInput('classification')
  })

export const readPartitionConfig = (path: Path) => {
  core.info('reading partition configurations')
  const file = readFileSync(path.fullpath())
  // parse partition file
  return v.parse(v.array(imagePartitionSchema), JSON.parse(file.toString()))
}

export type Partition = v.InferOutput<typeof imagePartitionSchema>
