import * as v from 'valibot'
import * as core from '@actions/core'
import { readFileSync } from 'fs'
import { Path } from 'glob'

const undefinedIfEmpty = (value: string) => (value === '' ? undefined : value)

const classifications = {
  yocto: v.literal('YOCTO', 'classification must be YOCTO'),
  rfs: v.literal('RFSIMAGE', 'classification must be RFSIMAGE'),
  bundle: v.literal('BUNDLE', 'classification must be BUNDLE'),
  executable: v.literal('EXECUTABLE', 'classification must be EXECUTABLE'),
  config: v.literal('CONFIG', 'classification must be CONFIG'),
  data: v.literal('DATA', 'classification must be DATA')
} as const

export const entrypointSchema = v.pipe(
  v.string('entrypoint must be provided as a multiline string'),
  v.trim(),
  v.minLength(1, 'entrypoint must have at least 1 character'),
  v.transform((e: string) => e.split('\n')),
  v.array(v.string()),
  v.minLength(1, 'entrypoint must have at least 1 element')
)

const architectureSchema = v.union([
  v.literal('AMD64'),
  v.literal('ARM64'),
  v.literal('ARMv6'),
  v.literal('ARMv7'),
  v.literal('RISCV'),
  v.literal('UNKNOWN')
])

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

const imagePartitionSchema = v.object({
  filesystemType: v.string('filesystemType must be string'),
  mountPoint: v.string('mountPoint must be string'),
  name: v.string('name must be string'),
  size: v.pipe(
    v.string('size must be provided as string'),
    v.regex(/^\d+(\.\d+)?[mMgGbBkK]$/gm, 'Invalid size provided'),
    v.check((e: string) => {
      // check if number is greater than 0 (not including last unit char)
      const num = parseFloat(e.slice(0, -1))
      return num > 0
    }, 'size must exceed 0B')
  ),
  startSector: v.pipe(
    v.number('startSector must be number'),
    v.integer('startSector must be integer'),
    v.minValue(0, 'startSector must be at least 0')
  ),
  partitionType: v.string('partitionType must be string')
})

export const baseSchema = {
  name: v.pipe(
    v.string('name must be string'),
    v.minLength(1, 'name must be at least 1 character')
  ),
  path: v.pipe(
    v.string('path must be string'),
    v.minLength(1, 'path must be at least 1 character')
  ),
  compatibility: compatibilitySchema,
  access: v.optional(
    v.pipe(
      v.string('access must be string'),
      v.trim(),
      v.toUpperCase(),
      v.union(
        [v.literal('PUBLIC'), v.literal('PRIVATE')],
        'access must be PUBLIC or PRIVATE'
      )
    ),
    'PRIVATE'
  )
}

const imageSchema = v.object(
  {
    ...baseSchema,
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
)

const archiveSchema = v.object({
  ...baseSchema,
  type: v.literal('ARCHIVE'),
  classification: v.optional(classifications.bundle, 'BUNDLE'),
  entrypoint: entrypointSchema,
  version: v.string('version must be string')
})

const firmwareSchema = v.object({
  ...baseSchema,
  type: v.literal('FIRMWARE', 'type must be FILE or FIRMWARE'),
  classification: v.optional(classifications.executable, 'EXECUTABLE'),
  version: v.string('version must be string')
})

const fileSchema = v.object({
  ...baseSchema,
  // override name to allow empty string for files when globbing
  name: v.optional(v.pipe(v.string(), v.trim())),
  type: v.literal('FILE', 'type must be FILE'),
  classification: v.union(
    [classifications.executable, classifications.config, classifications.data],
    'classification must be EXECUTABLE, CONFIG, or DATA'
  ),
  version: v.string('version must be string')
})

export const configSchema = v.union(
  [imageSchema, archiveSchema, firmwareSchema, fileSchema],
  'config must match image, archive, file, or firmware schema'
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
    partitions: undefinedIfEmpty(core.getInput('partitions')),
    compressionScheme: undefinedIfEmpty(core.getInput('compression_scheme')),
    entrypoint: undefinedIfEmpty(core.getInput('entrypoint')),
    rawDiskScheme: core.getInput('raw_disk_scheme'),
    version: core.getInput('version'),
    type: core.getInput('type'),
    classification: undefinedIfEmpty(core.getInput('classification')),
    access: undefinedIfEmpty(core.getInput('access'))
  })

export const readPartitionConfig = (path: Path) => {
  core.info('reading partition configurations')
  const file = readFileSync(path.fullpath())
  // parse partition file
  return v.parse(v.array(imagePartitionSchema), JSON.parse(file.toString()))
}

export type Partition = v.InferOutput<typeof imagePartitionSchema>

export const assertType = <
  T extends ReturnType<typeof getConfig>,
  K extends ReturnType<typeof getConfig>['type']
>(
  cfg: T,
  type: K
): Extract<T, { type: K }> => {
  if (cfg.type !== type)
    throw new Error(
      `Type assertion failed: received ${cfg.type}, expected ${type}`
    )
  return cfg as Extract<T, { type: K }>
}

export type Archive = Extract<Config, { type: 'ARCHIVE' }>
export type Image = Extract<Config, { type: 'IMAGE' }>
export type Firmware = Extract<Config, { type: 'FIRMWARE' }>
export type File = Extract<Config, { type: 'FILE' }>
