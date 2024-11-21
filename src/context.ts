import { backOff } from 'exponential-backoff'
import { TokenData } from './api'
import * as core from '@actions/core'
import { getConfig } from './config'
import { getBackendUrl, getEnv } from './env'
import { BACKOFF_CONFIG } from './constants'

export const createRunContext = async () => {
  core.startGroup('Validating configuration')
  const config = getConfig()
  core.endGroup()
  core.startGroup('Validating environment')
  const env = getEnv()
  if (env.BACKEND_ENV !== 'PROD')
    core.warning(
      `Using ${env.BACKEND_ENV} backend environment. Beware of unexpected or undocumented behavior`
    )
  core.endGroup()

  // get auth session using refresh token
  core.startGroup('Authenticating with Chassy API')
  const refreshTokenURL = `${getBackendUrl(env).apiBaseUrl}/token/user`
  const tokenRequestBody = {
    token: env.CHASSY_TOKEN
  }
  let refreshTokenResponse: TokenData
  try {
    refreshTokenResponse = await backOff(async () => {
      const rawResponse = await fetch(refreshTokenURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenRequestBody)
      })
      if (!rawResponse.ok) {
        throw new Error(`Network response was not ok ${rawResponse.statusText}`)
      }
      return (await rawResponse.json()) as TokenData
    }, BACKOFF_CONFIG)
  } catch (e) {
    core.error('Failed to refresh token')
    if (e instanceof Error) throw new Error(e.message)
    else throw e
  }
  core.endGroup()

  const authToken = refreshTokenResponse.idToken

  return { config, env, authToken }
}

export type RunContext = Awaited<ReturnType<typeof createRunContext>>
