import { randomUUID } from 'node:crypto'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { strongPassword } from '../utils'

export const setAdminCredentials = sdk.Action.withoutInput(
  'set-admin-credentials',

  async ({ effects }) => ({
    name: i18n('Set Admin Credentials'),
    description: i18n(
      'Generate a new owner UUID and password for Hiddify Manager. The Web Panel address changes with the UUID, and Hiddify Manager restarts to apply both.',
    ),
    warning: (await storeJson.read((s) => s.adminPassword).const(effects))
      ? i18n(
          'Replaces the owner UUID and password. The old Web Panel address and any API client that uses the old UUID stop working.',
        )
      : null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const adminUuid = randomUUID()
    const adminPassword = strongPassword()
    await storeJson.merge(effects, { adminUuid, adminPassword })

    return {
      version: '1',
      title: i18n('Hiddify Manager Owner Credentials'),
      message: i18n(
        'Open the Web Panel interface, which fills in the username, and sign in with the password. The password is shown only now.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: i18n(
              'The owner UUID. Hiddify also accepts it as an API key, so keep it secret.',
            ),
            value: adminUuid,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: adminPassword,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
        ],
      },
    }
  },
)
