import { T, utils } from '@start9labs/start-sdk'
import { sdk } from './sdk'

export const panelPort = 80
export const proxyPort = 443
export const dnsPort = 53
export const inboundRangeStart = 6100
export const inboundRangeSize = 500
export const panelAppPort = 9000
export const dataMountpoint = '/opt/hiddify-manager/data'

export const randomSecret = (len: number) =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len })

/** A password Hiddify accepts as strong: lowercase, uppercase and a digit. */
export function strongPassword(): string {
  for (;;) {
    const pw = randomSecret(32)
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) return pw
  }
}

export type Address = { host: string; port: number }

export const addressKey = (a: Address) => `${a.host}:${a.port}`

/** Enabled non-local addresses of the Proxy interface, with the external port each one answers on. */
export const proxyAddresses = (effects: T.Effects) =>
  sdk.host.getOwn(effects, 'proxy', (host) => {
    const iface =
      host &&
      Object.values(host.bindings)
        .flatMap((b) => Object.values(b.interfaces))
        .find((i) => i.id === 'proxy')
    if (!iface) return []
    const seen = new Map<string, Address>()
    for (const h of iface.addressInfo.nonLocal.hostnames) {
      if (h.port == null) continue
      const a = { host: h.hostname, port: h.port }
      seen.set(addressKey(a), a)
    }
    return [...seen.values()].sort((a, b) =>
      addressKey(a).localeCompare(addressKey(b)),
    )
  })
