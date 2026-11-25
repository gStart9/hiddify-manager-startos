import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { addressKey, proxyAddresses } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  addresses: Value.dynamicMultiselect(async ({ effects }) => {
    const available = (await proxyAddresses(effects).once()) ?? []
    const stored = (await storeJson.read((s) => s.publicAddresses).once()) ?? []
    const values = Object.fromEntries(
      [...available, ...stored].map((a) => [addressKey(a), addressKey(a)]),
    )
    return {
      name: i18n('Addresses'),
      description: i18n(
        'Addresses of the Proxy Gateway interface that clients can reach, each with its port. Choose a public domain or IP for clients outside your network.',
      ),
      values,
      default: [],
      minLength: 1,
      disabled: Object.keys(values).length
        ? false
        : i18n('The Proxy Gateway interface has no addresses yet'),
    }
  }),
})

export const setPublicAddresses = sdk.Action.withInput(
  'set-public-addresses',

  async () => ({
    name: i18n('Set Public Addresses'),
    description: i18n(
      'Choose the addresses that Hiddify Manager puts in client configurations and subscription links. Add a public domain first under Interfaces, then Proxy Gateway, then Add Domain. Hiddify Manager restarts to apply them.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => {
    const stored = (await storeJson.read((s) => s.publicAddresses).once()) ?? []
    return { addresses: stored.map(addressKey) }
  },

  async ({ effects, input }) => {
    const publicAddresses = input.addresses.map((key) => {
      const i = key.lastIndexOf(':')
      return { host: key.slice(0, i), port: Number(key.slice(i + 1)) }
    })
    await storeJson.merge(effects, { publicAddresses })
  },
)
