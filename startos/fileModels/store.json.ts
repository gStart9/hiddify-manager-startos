import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const address = z.looseObject({ host: z.string(), port: z.number().int() })

const shape = z.looseObject({
  mysqlPassword: z.string().catch(''),
  redisPassword: z.string().catch(''),
  adminUuid: z.string().catch(''),
  adminPath: z.string().catch(''),
  adminPassword: z.string().optional().catch(undefined),
  publicAddresses: z.array(address).catch([]),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'store.json' },
  shape,
)
