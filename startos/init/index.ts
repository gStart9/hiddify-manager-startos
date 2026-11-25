import { actions } from '../actions'
import { restoreInit } from '../backups'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { seedSecrets } from './seedSecrets'
import { watchCredentials } from './watchCredentials'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedSecrets,
  setInterfaces,
  actions,
  dependencies,
  watchCredentials,
)

export const uninit = sdk.setupUninit(versionGraph)
