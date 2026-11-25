import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { randomSecret } from '../utils'

export const seedSecrets = sdk.setupOnInit(async (effects) => {
  const store = await storeJson.read().once()
  await storeJson.merge(effects, {
    mysqlPassword: store?.mysqlPassword || randomSecret(32),
    redisPassword: store?.redisPassword || randomSecret(32),
    adminPath: store?.adminPath || randomSecret(20),
  })
})
