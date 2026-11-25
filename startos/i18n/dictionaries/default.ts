export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Run Set Admin Credentials before starting Hiddify Manager': 0,
  'Web Panel': 1,
  'The web panel is ready': 2,
  'The web panel is not ready': 3,
  'Panel Application': 4,
  'The panel application is running': 5,
  'The panel application is not running': 6,
  'Port 443 Gateway': 7,
  'Accepting proxy connections on port 443': 8,
  'Nothing is listening on port 443': 9,
  'Proxy Cores': 10,
  'Hiddify Core and Xray are running': 11,
  'Hiddify Core or Xray is not running': 12,
  'DNS Tunnels': 13,
  'No DNS tunnel is configured': 14,
  'Answering DNS on port 53': 15,
  'Not answering DNS on port 53': 16,

  // interfaces.ts
  'The Hiddify Manager administration panel. Its address includes the secret admin path.': 17,
  'Proxy Gateway': 18,
  'TCP and UDP port 443, shared by every domain-based protocol and by subscription links': 19,
  'UDP port 53 for the DNS tunnels': 20,
  'Direct Protocol Ports': 21,
  'TCP and UDP ports 6100-6599 for the protocols that clients reach by IP address and their own port': 22,

  // actions/setAdminCredentials.ts
  'Set Admin Credentials': 23,
  'Generate a new owner UUID and password for Hiddify Manager. The Web Panel address changes with the UUID, and Hiddify Manager restarts to apply both.': 24,
  'Replaces the owner UUID and password. The old Web Panel address and any API client that uses the old UUID stop working.': 25,
  'Hiddify Manager Owner Credentials': 26,
  'Open the Web Panel interface, which fills in the username, and sign in with the password. The password is shown only now.': 27,
  Username: 28,
  'The owner UUID. Hiddify also accepts it as an API key, so keep it secret.': 29,
  Password: 30,

  // actions/setPublicAddresses.ts
  Addresses: 31,
  'Addresses of the Proxy Gateway interface that clients can reach, each with its port. Choose a public domain or IP for clients outside your network.': 32,
  'The Proxy Gateway interface has no addresses yet': 33,
  'Set Public Addresses': 34,
  'Choose the addresses that Hiddify Manager puts in client configurations and subscription links. Add a public domain first under Interfaces, then Proxy Gateway, then Add Domain. Hiddify Manager restarts to apply them.': 35,

  // init/watchCredentials.ts
  'Set the admin credentials before signing in to the panel': 36,
  "First set this service's Outbound Traffic gateway to the gateway that your clients will connect through, usually your StartTunnel. Then open Interfaces, then Proxy Gateway, click Add Domain on that same gateway, and add your public domain. Finally, choose that domain from the list below.": 37,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
