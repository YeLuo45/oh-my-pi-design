import { defineConfig } from 'vitepress'

const nav = [
  { text: '首页', link: '/' },
  { text: '架构', link: '/architecture' },
  { text: '技术栈', link: '/tech-stack' }
]

const sidebar = [
  {
    text: '概述',
    items: [
      { text: '介绍', link: '/' },
      { text: '架构', link: '/architecture' },
      { text: '技术栈', link: '/tech-stack' }
    ]
  },
  {
    text: '核心基础',
    items: [
      { text: 'Rust 核心 · pi-ast/pi-shell/pi-iso', link: '/docs/01-rust-core' },
      { text: 'pi-ai · 40+ 提供方', link: '/docs/02-pi-ai' },
      { text: 'pi-agent-core · 运行时', link: '/docs/03-pi-agent-core' },
      { text: 'pi-catalog · 模型身份', link: '/docs/04-pi-catalog' },
      { text: 'pi-coding-agent · CLI', link: '/docs/05-pi-coding-agent' }
    ]
  },
  {
    text: 'IDE 集成',
    items: [
      { text: 'LSP · 14 个操作', link: '/docs/06-lsp' },
      { text: 'DAP · 28 个操作', link: '/docs/07-dap' },
      { text: 'hashline · 行级编辑', link: '/docs/08-hashline' },
      { text: '32 个内建工具', link: '/docs/09-tools' }
    ]
  },
  {
    text: '持久化与记忆',
    items: [
      { text: 'snapcompact · 快照+压缩', link: '/docs/10-snapcompact' },
      { text: 'pi-mnemopi · 记忆系统', link: '/docs/11-pi-mnemopi' },
      { text: 'pi-wire · 通信协议', link: '/docs/12-pi-wire' }
    ]
  },
  {
    text: 'UI 与遥测',
    items: [
      { text: 'pi-tui · 终端 UI', link: '/docs/13-pi-tui' },
      { text: 'collab-web · React 19 UI', link: '/docs/14-collab-web' },
      { text: 'omp-stats · OpenTelemetry', link: '/docs/15-omp-stats' }
    ]
  },
  {
    text: '运维',
    items: [
      { text: 'swarm-extension · 多 Agent', link: '/docs/16-swarm-extension' },
      { text: '部署与安装', link: '/docs/17-deployment' }
    ]
  }
]

const enSidebar = [
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
      { text: 'Deployment & Installation', link: '/docs/17-deployment' }
    ]
  }
]

export default defineConfig({
  title: 'oh-my-pi Design',
  description: 'oh-my-pi (omp) 设计文档 — Can Boluk 的 pi-mono Rust 强化版。',
  base: '/oh-my-pi-design/',
  lastUpdated: true,
  cleanUrls: true,
  head: [
    ['meta', { name: 'google', content: 'notranslate' }],
    ['meta', { 'http-equiv': 'Content-Language', content: 'zh-CN' }]
  ],
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'oh-my-pi 设计文档',
      description: 'oh-my-pi (omp) 设计文档 — Can Boluk 的 pi-mono Rust 强化版。',
      themeConfig: {
        nav,
        sidebar
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'oh-my-pi Design',
      description: 'Design documentation for oh-my-pi (omp) — Can Boluk\'s fork of pi-mono with Rust core.',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Tech Stack', link: '/tech-stack' }
        ],
        sidebar: enSidebar.map(group => ({
          ...group,
          items: group.items.map(item => ({
            ...item,
            link: item.link.startsWith('/docs/') ? `/en${item.link}` : (item.link === '/' ? '/en/' : item.link)
          }))
        }))
      }
    }
  },
  themeConfig: {
    nav,
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/YeLuo45/oh-my-pi-design' }
    ],
    footer: {
      message: '基于 MIT 协议发布。',
      copyright: 'Copyright © 2026 oh-my-pi Design'
    }
  }
})
