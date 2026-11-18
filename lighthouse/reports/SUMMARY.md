# Auditoria Lighthouse

Mediana de 3 execuções por página e perfil, no build de produção com a API simulada no cenário padrão.

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| mobile | / | 93 | 100 | 100 | 100 | 3.12 s | 0.000 | 82 ms |
| mobile | /nft/emerald-ape-042 | 92 | 100 | 100 | 100 | 3.32 s | 0.000 | 85 ms |
| desktop | / | 99 | 100 | 100 | 100 | 0.83 s | 0.001 | 0 ms |
| desktop | /nft/emerald-ape-042 | 99 | 100 | 100 | 100 | 0.84 s | 0.060 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.

## Ambiente

- Lighthouse 13.6.0, @lhci/cli 0.16.1
- Chromium 1255 (Playwright), Node v26.13.1
- Windows_NT 10.0.26200, 12 CPUs
- Data: 2026-11-18T16:46:36.235Z
- mobile: tela 412×823, limitação simulate (RTT 150 ms, 1638 Kbps, CPU 4x), flags do Chromium: --headless=new --no-sandbox --disable-gpu
- desktop: tela 1350×940, limitação simulate (RTT 40 ms, 10240 Kbps, CPU 1x), flags do Chromium: --headless=new --no-sandbox --disable-gpu
- Uma execução de aquecimento por perfil é descartada antes das três medições
- Configuração: `lighthouse/`; relatórios HTML e JSON de todas as execuções em `lighthouse/reports/`
