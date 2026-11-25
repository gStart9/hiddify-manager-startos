import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '14.2.0:0',
  releaseNotes: {
    en_US: 'Initial release of Hiddify Manager for StartOS.',
    es_ES: 'Primera versión de Hiddify Manager para StartOS.',
    de_DE: 'Erste Veröffentlichung von Hiddify Manager für StartOS.',
    pl_PL: 'Pierwsze wydanie Hiddify Manager dla StartOS.',
    fr_FR: 'Première version de Hiddify Manager pour StartOS.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
