import { sdk } from '../sdk'
import { setAdminCredentials } from './setAdminCredentials'
import { setPublicAddresses } from './setPublicAddresses'

export const actions = sdk.Actions.of()
  .addAction(setAdminCredentials)
  .addAction(setPublicAddresses)
