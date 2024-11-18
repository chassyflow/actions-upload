import * as v from 'valibot'

export const envSchema = v.object({
  CHASSY_TOKEN: v.string('CHASSY_TOKEN must be present in environment'),
  BACKEND_ENVIRONMENT: v.optional(
    v.union([v.literal('PROD'), v.literal('STAGE'), v.literal('DEV')]),
    'PROD'
  )
})

export type Env = v.InferOutput<typeof envSchema>

export const getEnv = () => v.parse(envSchema, process.env)

export type BaseUrl = {
  apiBaseUrl: string
  frontendBaseUrl: string
}

export const BASE_URLS_BY_ENV: Record<string, BaseUrl> = {
  PROD: {
    apiBaseUrl: 'https://api.chassy.io/v1',
    frontendBaseUrl: 'https://console.chassy.io'
  },
  STAGE: {
    apiBaseUrl: 'https://api.stage.chassy.dev/v1',
    frontendBaseUrl: 'https://console.stage.chassy.dev'
  },
  DEV: {
    apiBaseUrl: 'https://api.test.chassy.dev/v1',
    frontendBaseUrl: 'https://console.test.chassy.dev'
  }
}

export const getBackendUrl = (e: Env) => BASE_URLS_BY_ENV[e.BACKEND_ENVIRONMENT]
