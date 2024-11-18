import * as v from "valibot";
import * as core from "@actions/core"

export const configSchema = v.object({
  path: v.string(),
  architecture: v.union([
    v.literal("AMD64"),
    v.literal("ARM64"),
    v.literal("ARMv6"),
    v.literal("ARMv7"),
    v.literal("RISCV"),
    v.literal("UNKNOWN"),
  ]),
  os: v.string(),
  version: v.string(),
  type: v.union([
    v.literal("FILE"),
    v.literal("ARCHIVE"),
    v.literal("IMAGE"),
    v.literal("FIRMWARE"),
  ]),
  classification: v.nullish(v.union([
    v.literal("RFSIMAGE"),
    v.literal("YOCTO"),
  ])),
  mode: v.optional(v.union([
    v.literal("DEBUG"),
    v.literal("INFO"),
  ]), "INFO"),
});

export type Config = v.InferOutput<typeof configSchema>;

/**
 * Get configuration options for environment
 */
export const getConfig = () =>
  v.parse(configSchema, {
    path: core.getInput("path"),
    architecture: core.getInput("architecture"),
    os: core.getInput("os"),
    version: core.getInput("version"),
    type: core.getInput("type"),
    classification: core.getInput("classification"),
    mode: core.getInput("mode")
  });

