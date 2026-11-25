import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  dnsPort,
  inboundRangeSize,
  inboundRangeStart,
  panelPort,
  proxyPort,
} from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const admin = await storeJson
    .read((s) => ({ uuid: s.adminUuid, path: s.adminPath }))
    .const(effects)

  const panelOrigin = await sdk.MultiHost.of(effects, 'panel').bindPort(
    panelPort,
    { protocol: 'http' },
  )
  const panel = sdk.createInterface(effects, {
    name: i18n('Web Panel'),
    id: 'panel',
    description: i18n(
      'The Hiddify Manager administration panel. Its address includes the secret admin path.',
    ),
    type: 'ui',
    masked: true,
    schemeOverride: null,
    username: null,
    path: admin?.path && admin.uuid ? `/${admin.path}/${admin.uuid}/` : '',
    query: {},
  })

  const proxyOrigin = await sdk.MultiHost.of(effects, 'proxy').bindPort(
    proxyPort,
    {
      protocol: null,
      addSsl: null,
      preferredExternalPort: proxyPort,
      secure: { ssl: false },
    },
  )
  const proxy = sdk.createInterface(effects, {
    name: i18n('Proxy Gateway'),
    id: 'proxy',
    description: i18n(
      'TCP and UDP port 443, shared by every domain-based protocol and by subscription links',
    ),
    type: 'p2p',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const dnsOrigin = await sdk.MultiHost.of(effects, 'dns').bindPort(dnsPort, {
    protocol: 'dns',
    preferredExternalPort: dnsPort,
  })
  const dns = sdk.createInterface(effects, {
    name: i18n('DNS Tunnels'),
    id: 'dns',
    description: i18n('UDP port 53 for the DNS tunnels'),
    type: 'p2p',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const inbounds = await sdk.MultiHost.of(effects, 'inbounds').bindPortRange({
    internalStartPort: inboundRangeStart,
    externalStartPort: inboundRangeStart,
    numberOfPorts: inboundRangeSize,
  })
  await inbounds.export(
    sdk.createRangeInterface(effects, {
      id: 'inbounds',
      name: i18n('Direct Protocol Ports'),
      description: i18n(
        'TCP and UDP ports 6100-6599 for the protocols that clients reach by IP address and their own port',
      ),
    }),
  )

  return [
    await panelOrigin.export([panel]),
    await proxyOrigin.export([proxy]),
    await dnsOrigin.export([dns]),
  ]
})
