/**
 * Builds the app, audits Home and NFT details (mobile and desktop, 3 runs each)
 * and writes lighthouse/reports/SUMMARY.md with the median of every metric.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import { chromium } from '@playwright/test'

const require = createRequire(import.meta.url)
const PROFILES = ['mobile', 'desktop']
const env = { ...process.env, CHROME_PATH: chromium.executablePath() }

function node(args) {
  return spawnSync(process.execPath, args, { stdio: 'inherit', env }).status ?? 1
}

function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
}

if (node(['./node_modules/vite/bin/vite.js', 'build']) !== 0) process.exit(1)
rmSync('lighthouse/reports', { recursive: true, force: true })

const lhci = './node_modules/@lhci/cli/src/cli.js'
let failed = false
const rows = []
const conditions = []

for (const profile of PROFILES) {
  const config = `--config=lighthouse/${profile}.cjs`
  // The first runs after a build are much slower (cold machine), so one is discarded
  node([lhci, 'collect', config, '--numberOfRuns=1'])
  rmSync('.lighthouseci', { recursive: true, force: true })
  if (node([lhci, 'collect', config]) !== 0) process.exit(1)
  // Keeps going on a failed assertion, so the reports are always written
  if (node([lhci, 'assert', config]) !== 0) failed = true
  node([lhci, 'upload', config])

  const byUrl = Object.groupBy(readRuns(), (lhr) => lhr.requestedUrl)
  const { throttlingMethod, throttling, screenEmulation } = Object.values(byUrl)[0][0].configSettings
  conditions.push(
    `- ${profile}: tela ${screenEmulation.width}×${screenEmulation.height}, limitação ${throttlingMethod} (RTT ${throttling.rttMs} ms, ${Math.round(throttling.throughputKbps)} Kbps, CPU ${throttling.cpuSlowdownMultiplier}x), flags do Chromium: ${require(`./${profile}.cjs`).ci.collect.settings.chromeFlags}`,
  )
  for (const [url, runs] of Object.entries(byUrl)) {
    const score = (id) => Math.round(median(runs.map((r) => r.categories[id].score)) * 100)
    const audit = (id) => median(runs.map((r) => r.audits[id].numericValue))
    rows.push(
      `| ${profile} | ${new URL(url).pathname} | ${score('performance')} | ${score('accessibility')} | ${score('best-practices')} | ${score('seo')} | ${(audit('largest-contentful-paint') / 1000).toFixed(2)} s | ${audit('cumulative-layout-shift').toFixed(3)} | ${Math.round(audit('total-blocking-time'))} ms |`,
    )
  }
}

function readRuns() {
  return readdirSync('.lighthouseci')
    .filter((name) => name.startsWith('lhr-') && name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(`.lighthouseci/${name}`, 'utf8')))
}

const lighthouseVersion = require('lighthouse/package.json').version
writeFileSync(
  'lighthouse/reports/SUMMARY.md',
  `# Auditoria Lighthouse

Mediana de 3 execuções por página e perfil, no build de produção com a API simulada no cenário padrão.

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.

## Ambiente

- Lighthouse ${lighthouseVersion}, @lhci/cli ${require('@lhci/cli/package.json').version}
- Chromium ${chromium.executablePath().match(/chromium[-_](\d+)/)?.[1] ?? ''} (Playwright), Node ${process.version}
- ${os.type()} ${os.release()}, ${os.cpus().length} CPUs
- Data: ${new Date().toISOString()}
${conditions.join('\n')}
- Uma execução de aquecimento por perfil é descartada antes das três medições
- Configuração: \`lighthouse/\`; relatórios HTML e JSON de todas as execuções em \`lighthouse/reports/\`
`,
)
console.log(rows.join('\n'))
process.exit(failed ? 1 : 0)
