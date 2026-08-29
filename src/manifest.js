import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  name: 'Ficbook Enhancer',
  description: 'Настройка и очистка интерфейса Ficbook',
  version: '1.0.0',
  manifest_version: 3,
  permissions: ['storage'],
  host_permissions: ['*://ficbook.net/*'],
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Ficbook Enhancer',
  },
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  content_scripts: [
    {
      matches: ['*://ficbook.net/*'],
      js: ['src/content/index.jsx'],
      run_at: 'document_start',
    },
  ],
})
