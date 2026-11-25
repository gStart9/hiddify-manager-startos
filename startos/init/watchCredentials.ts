import { setAdminCredentials } from '../actions/setAdminCredentials'
import { setPublicAddresses } from '../actions/setPublicAddresses'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const watchCredentials = sdk.setupOnInit(async (effects) => {
  const store = await storeJson
    .read((s) => ({
      password: !!s.adminPassword && !!s.adminUuid,
      addresses: s.publicAddresses.length,
    }))
    .const(effects)

  if (!store?.password) {
    await sdk.action.createOwnTask(effects, setAdminCredentials, 'critical', {
      reason: i18n('Set the admin credentials before signing in to the panel'),
    })
  }
  if (!store?.addresses) {
    await sdk.action.createOwnTask(effects, setPublicAddresses, 'important', {
      reason: i18n(
        "First set this service's Outbound Traffic gateway to the gateway that your clients will connect through, usually your StartTunnel. Then open Interfaces, then Proxy Gateway, click Add Domain on that same gateway, and add your public domain. Finally, choose that domain from the list below.",
      ),
    })
  }
})
