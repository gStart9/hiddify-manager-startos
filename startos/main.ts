import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  dataMountpoint,
  dnsPort,
  panelAppPort,
  panelPort,
  proxyPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  const store = await storeJson.read().const(effects)
  if (!store?.adminPassword || !store.adminUuid) {
    throw new Error(
      i18n('Run Set Admin Credentials before starting Hiddify Manager'),
    )
  }

  const mariadb = await sdk.SubContainer.of(
    effects,
    { imageId: 'mariadb' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'db',
      subpath: null,
      mountpoint: '/var/lib/mysql',
      readonly: false,
    }),
    'mariadb',
  )

  const valkey = await sdk.SubContainer.of(
    effects,
    { imageId: 'valkey' },
    null,
    'valkey',
  )

  const hiddify = await sdk.SubContainer.of(
    effects,
    { imageId: 'hiddify' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: 'hiddify',
      mountpoint: dataMountpoint,
      readonly: false,
    }),
    'hiddify',
  )

  const port = (p: number, ok: string, notOk: string) => () =>
    sdk.healthCheck.checkPortListening(effects, p, {
      successMessage: ok,
      errorMessage: notOk,
    })

  return sdk.Daemons.of(effects)
    .addDaemon('mariadb', {
      subcontainer: mariadb,
      exec: {
        command: sdk.useEntrypoint(['--bind-address=127.0.0.1']),
        env: {
          MARIADB_RANDOM_ROOT_PASSWORD: '1',
          MARIADB_DATABASE: 'hiddifypanel',
          MARIADB_USER: 'hiddifypanel',
          MARIADB_PASSWORD: store.mysqlPassword,
          MARIADB_AUTO_UPGRADE: '1',
        },
      },
      ready: {
        display: null,
        fn: async () => {
          const res = await mariadb.exec([
            'healthcheck.sh',
            '--connect',
            '--innodb_initialized',
          ])
          return res.exitCode === 0
            ? { result: 'success', message: null }
            : { result: 'starting', message: null }
        },
      },
      requires: [],
    })
    .addDaemon('valkey', {
      subcontainer: valkey,
      exec: {
        command: [
          'valkey-server',
          '--bind',
          '127.0.0.1',
          '--requirepass',
          store.redisPassword,
          '--save',
          '',
          '--appendonly',
          'no',
        ],
      },
      ready: {
        display: null,
        fn: async () => {
          const res = await valkey.exec(['valkey-cli', 'ping'], {
            env: { REDISCLI_AUTH: store.redisPassword },
          })
          return String(res.stdout).trim() === 'PONG'
            ? { result: 'success', message: null }
            : { result: 'starting', message: null }
        },
      },
      requires: [],
    })
    .addDaemon('hiddify', {
      subcontainer: hiddify,
      exec: {
        command: sdk.useEntrypoint(),
        env: {
          MYSQL_PASSWORD: store.mysqlPassword,
          REDIS_PASSWORD: store.redisPassword,
          HM_ADMIN_UUID: store.adminUuid,
          HM_ADMIN_PATH: store.adminPath,
          HM_ADMIN_PASSWORD: store.adminPassword,
          HM_PUBLIC_ADDRESSES: JSON.stringify(store.publicAddresses),
        },
      },
      ready: {
        display: i18n('Web Panel'),
        gracePeriod: 300_000,
        fn: port(
          panelPort,
          i18n('The web panel is ready'),
          i18n('The web panel is not ready'),
        ),
      },
      requires: ['mariadb', 'valkey'],
    })
    .addHealthCheck('panel-app', {
      ready: {
        display: i18n('Panel Application'),
        fn: port(
          panelAppPort,
          i18n('The panel application is running'),
          i18n('The panel application is not running'),
        ),
      },
      requires: ['hiddify'],
    })
    .addHealthCheck('proxy', {
      ready: {
        display: i18n('Port 443 Gateway'),
        fn: port(
          proxyPort,
          i18n('Accepting proxy connections on port 443'),
          i18n('Nothing is listening on port 443'),
        ),
      },
      requires: ['hiddify'],
    })
    .addHealthCheck('cores', {
      ready: {
        display: i18n('Proxy Cores'),
        fn: async () => {
          const core = await hiddify.exec(['pgrep', '-x', 'hiddify-core'])
          const xray = await hiddify.exec(['pgrep', '-x', 'xray'])
          return core.exitCode === 0 && xray.exitCode === 0
            ? {
                result: 'success',
                message: i18n('Hiddify Core and Xray are running'),
              }
            : {
                result: 'failure',
                message: i18n('Hiddify Core or Xray is not running'),
              }
        },
      },
      requires: ['hiddify'],
    })
    .addHealthCheck('dns-tunnels', {
      ready: {
        display: i18n('DNS Tunnels'),
        fn: async () => {
          const res = await hiddify.exec([
            'test',
            '-s',
            '/opt/hiddify-manager/generated/dnstm/config.json',
          ])
          if (res.exitCode !== 0) {
            return {
              result: 'success',
              message: i18n('No DNS tunnel is configured'),
            }
          }
          return sdk.healthCheck.checkPortListening(effects, dnsPort, {
            successMessage: i18n('Answering DNS on port 53'),
            errorMessage: i18n('Not answering DNS on port 53'),
          })
        },
      },
      requires: ['hiddify'],
    })
})
