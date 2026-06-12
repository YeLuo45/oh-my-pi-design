import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'oh-my-pi Design',
  description: 'Design documentation for oh-my-pi (omp) — Can Boluk\'s fork of pi-mono with Rust core, LSP/DAP integration, 40+ providers, and 32 tools.',
  base: '/oh-my-pi-design/',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Tech Stack', link: '/tech-stack' }
    ],
    sidebar: [
      {
        text: 'Overview',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Tech Stack', link: '/tech-stack' }
        ]
      },
      {
        text: 'Core Foundation',
        items: [
          { text: 'Rust Core · pi-ast/pi-shell/pi-iso', link: '/docs/01-rust-core' },
          { text: 'pi-ai · 40+ Providers', link: '/docs/02-pi-ai' },
          { text: 'pi-agent-core · Runtime', link: '/docs/03-pi-agent-core' },
          { text: 'pi-catalog · Model Identity', link: '/docs/04-pi-catalog' },
          { text: 'pi-coding-agent · CLI', link: '/docs/05-pi-coding-agent' }
        ]
      },
      {
        text: 'IDE Integration',
        items: [
          { text: 'LSP · 14 Operations', link: '/docs/06-lsp' },
          { text: 'DAP · 28 Operations', link: '/docs/07-dap' },
          { text: 'hashline · Line Editing', link: '/docs/08-hashline' },
          { text: '32 Built-in Tools', link: '/docs/09-tools' }
        ]
      },
      {
        text: 'Persistence & Memory',
        items: [
          { text: 'snapcompact · Snapshot+Compact', link: '/docs/10-snapcompact' },
          { text: 'pi-mnemopi · Memory', link: '/docs/11-pi-mnemopi' },
          { text: 'pi-wire · Wire Protocol', link: '/docs/12-pi-wire' }
        ]
      },
      {
        text: 'UI & Telemetry',
        items: [
          { text: 'pi-tui · Terminal UI', link: '/docs/13-pi-tui' },
          { text: 'collab-web · React 19 UI', link: '/docs/14-collab-web' },
          { text: 'omp-stats · OpenTelemetry', link: '/docs/15-omp-stats' }
        ]
      },
      {
        text: 'Operations',
        items: [
          { text: 'swarm-extension · Sub-agents', link: '/docs/16-swarm-extension' },
          { text: 'Deployment · Bun/Docker/Brew', link: '/docs/17-deployment' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/YeLuo45/oh-my-pi-design' }
    ],
    footer: {
      message: 'Released under MIT License.',
      copyright: 'Copyright © 2026 oh-my-pi Design'
    }
  }
})
