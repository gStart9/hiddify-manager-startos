import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'hiddify-manager',
  title: 'Hiddify Manager',
  license: 'CC-BY-NC-SA-4.0',
  packageRepo: 'https://github.com/gStart9/hiddify-manager-startos',
  upstreamRepo: 'https://github.com/hiddify/Hiddify-Manager',
  marketingUrl: 'https://hiddify.com',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'db'],
  images: {
    hiddify: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
    mariadb: {
      source: { dockerTag: 'mariadb:11.8.9' },
      arch: ['x86_64', 'aarch64'],
    },
    valkey: {
      source: { dockerTag: 'valkey/valkey:8.1.12-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
