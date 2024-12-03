import * as v from 'valibot'
import type { BaseIssue } from 'valibot'
import * as core from '@actions/core'

const errMsg = (property: string) => (e: BaseIssue<unknown>) =>
  `${e.kind} error: ${property} expected (${e.expected}) and received (${e.received}), raw: ${JSON.stringify(e.input)}, ${e.message}`

const architectureSchema = v.union([
  v.literal('AMD64'),
  v.literal('ARM64'),
  v.literal('ARMv6'),
  v.literal('ARMv7'),
  v.literal('RISCV'),
  v.literal('UNKNOWN')
])

const imageSchema = v.object({
  type: v.literal('IMAGE'),
  classification: v.union(
    [v.literal('RFSIMAGE'), v.literal('YOCTO')],
    errMsg('classification')
  )
})

const packageSchema = v.object({
  type: v.union(
    [v.literal('FILE'), v.literal('ARCHIVE'), v.literal('FIRMWARE')],
    errMsg('type')
  ),
  classification: v.union(
    [
      v.literal('EXECUTABLE'),
      v.literal('CONFIG'),
      v.literal('DATA'),
      v.literal('BUNDLE')
    ],
    errMsg('classification')
  )
})

const compatibilitySchema = v.object(
  {
    architecture: architectureSchema,
    os: v.string(errMsg('os')),
    version: v.string(errMsg('version'))
  },
  errMsg('compatibility')
)

export const baseSchema = v.object({
  name: v.pipe(v.string(errMsg('name')), v.minLength(1, errMsg('name'))),
  path: v.pipe(v.string(errMsg('name')), v.minLength(1, errMsg('name'))),
  compaibility: compatibilitySchema,
  version: v.string(errMsg('version'))
})

export const configSchema = v.intersect(
  [baseSchema, v.union([imageSchema, packageSchema], errMsg('imageOrPackage'))],
  errMsg('config')
)
export type Config = v.InferOutput<typeof configSchema>

/**
 * Get configuration options for environment
 */
export const getConfig = () =>
  v.parse(configSchema, {
    name: core.getInput('name'),
    path: core.getInput('path'),
    architecture: core.getInput('architecture'),
    os: core.getInput('os'),
    version: core.getInput('version'),
    type: core.getInput('type'),
    classification: core.getInput('classification')
  })
