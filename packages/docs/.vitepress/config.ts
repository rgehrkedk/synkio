import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Synkio',
  description: 'Sync Figma design variables to code without Enterprise',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap', rel: 'stylesheet' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Configuration', link: '/guide/configuration' },
      { text: 'GitHub', link: 'https://github.com/rgehrkedk/synkio' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'How It Works', link: '/guide/how-it-works' }
          ]
        },
        {
          text: 'Commands',
          items: [
            { text: 'init', link: '/guide/commands/init' },
            { text: 'pull', link: '/guide/commands/pull' },
            { text: 'build', link: '/guide/commands/build' },
            { text: 'diff', link: '/guide/commands/diff' },
            { text: 'import', link: '/guide/commands/import' },
            { text: 'export', link: '/guide/commands/export' },
            { text: 'rollback', link: '/guide/commands/rollback' },
            { text: 'validate', link: '/guide/commands/validate' },
            { text: 'tokens', link: '/guide/commands/tokens' },
            { text: 'docs', link: '/guide/commands/docs' }
          ]
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Overview', link: '/guide/configuration' },
            { text: 'Tokens Options', link: '/guide/configuration/tokens' },
            { text: 'Build Options', link: '/guide/configuration/build' },
            { text: 'CSS Options', link: '/guide/configuration/css' },
            { text: 'Collections', link: '/guide/configuration/collections' },
            { text: 'Styles', link: '/guide/configuration/styles' },
            { text: 'Import', link: '/guide/configuration/import' }
          ]
        },
        {
          text: 'Workflows',
          items: [
            { text: 'GitHub PR Workflow', link: '/guide/workflows/github-pr' },
            { text: 'Style Dictionary', link: '/guide/workflows/style-dictionary' }
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Breaking Change Protection', link: '/guide/features/breaking-changes' },
            { text: 'Output Formats', link: '/guide/features/output-formats' }
          ]
        },
        {
          text: 'Setup',
          items: [
            { text: 'Figma Setup', link: '/guide/setup/figma' },
            { text: 'Hosting Docs', link: '/guide/setup/hosting' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rgehrkedk/synkio' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2024-present Synkio'
    },

    search: {
      provider: 'local'
    }
  }
})
