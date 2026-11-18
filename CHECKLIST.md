# Checklist

Pendências e decisões para revisar antes da entrega.

## Para ver no final

- [ ] **Botão de escanear (mobile):** botão central da barra de navegação inferior no Figma mobile. Não tem função descrita no desafio. Decidir se implementa, troca por outra ação ou remove (e documentar o desvio no `ARCHITECTURE.md`).

## Pendências conhecidas

- [x] Artes de `public/nfts/` convertidas para WebP em duas larguras (960 e 480 px).
- [ ] Páginas sem destino ainda: Mercado, Criadores, Aprenda, artigos do blog e a maioria dos links do rodapé.
- [x] Contador do carrinho no Header ligado à API do carrinho.

## API simulada (MSW)

- [ ] Documentar no `ARCHITECTURE.md`: contratos REST, eventos `nft.updated`/`order.updated`, política de sessão, cache/retry e reconciliação REST × Socket.IO.
- [ ] Documentar no `README.md`: credenciais fictícias (`colecionador@kurio.dev` / `kurio1234`), cupons (`KURIO10`, `GENESIS`), cenários (`?scenario=`) e reset (`?mockReset`).
- [ ] Limitações do MSW para documentar: o binding de Socket.IO só suporta WebSocket (sem polling), não envia pings (o mock envia), sem namespaces/rooms; dados do mock ficam no `localStorage` de cada navegador; pedidos interrompidos por reload continuam quando a página volta.
- [x] Chunk do mock reduzido de ~170 KB para ~60 KB (gzip), trocando a lista de domínios do `tldts` por um shim (`src/mocks/shims/tldts.ts`).
- [x] Ligar à API: detalhe do NFT, carrinho, pagamento, confirmação, perfil, carteiras, favoritos, login e newsletter.
- [ ] Documentar: o `socket.io-client` só é importado depois do primeiro render, quando o MSW já substituiu o `WebSocket`, porque o engine.io-client guarda o `WebSocket` global ao carregar (ver `src/main.tsx` e `useRealtimeSync`).

## Telas

- [ ] Ajuste fino visual de Detalhe, Carrinho, Pagamento, Confirmação, Perfil e Carteiras com o Figma quando a cota do MCP renovar (foram feitas com o print do Detalhe e os textos extraídos das telas).
- [ ] Layout mobile dessas telas conforme os frames mobile do Figma.
- [x] Página de favoritos (`/favoritos`), ligada à barra mobile e ao rodapé.
- [x] "Esqueceu a senha?" com endpoint `POST /api/auth/password-reset`.
- [x] Skeleton com shimmer no resumo do carrinho.

## Requisitos da tarefa (gap analysis)

- [x] Bloco 1 — Valores em ETH como strings decimais (aritmética exata em wei com BigInt, `src/lib/eth.ts`).
- [x] Bloco 1 — Senhas com hash PBKDF2-SHA256 + salt no mock (nunca em texto puro).
- [x] Bloco 1 — Edições (1/1, 1/10, 1/50, ABERTA) com preço e estoque próprios; edição indisponível; carrinho por NFT + edição; cupom expirado (`LANCAMENTO2025`).
- [x] Bloco 2 — Carrinho do visitante mesclado no login; revalidar cotação antes de confirmar; dados do colecionador; rede e simulação de conexão/recusa/desconexão de carteira; etapa de revisão; remover do carrinho só o que foi comprado.
- [x] Bloco 3 — Histórico do navegador nos filtros (push em vez de replace); busca no desktop; editar carteira; retomada após sessão expirar no checkout; link de exploração simulado.
- [x] Bloco 4 — Frames mobile (Detalhe, Carrinho, Pagamento, Login, Cadastro), feitos a partir do PNG exportado do Figma (cota do MCP esgotada).

## Desvios dos frames mobile (documentar no `ARCHITECTURE.md`)

- [ ] Pagamento: no frame, "Carteira e rede" lista provedores (WalletConnect/MetaMask/Coinbase); no app a carteira já tem provedor, e a seção escolhe a rede + "Conectar carteira" (simulação exigida pela tarefa). Há também a etapa de revisão, que o frame não mostra.
- [ ] Login/Cadastro mobile: botão de fechar (X) mantido por acessibilidade; o frame não tem.
- [ ] Detalhe mobile: abas de detalhes/avaliações e "Mais desta coleção" mantidas abaixo do conteúdo do frame.
- [ ] Carrinho mobile: rótulo "Total estimado" mantido (frame: "Total"); lixeira em cada card (o frame mostra só um ícone sobreposto).
- [ ] Barra de navegação inferior escondida em Detalhe, Carrinho e Pagamento (os frames têm barras de ação próprias).

## Testes

- [x] Playwright: E2E (catálogo, auth, compra, favoritos, perfil, carteiras, acessibilidade) em Chromium desktop e mobile, relatório HTML, traces/vídeos em falhas.
- [x] Regressão visual com baselines versionadas em `e2e/__screenshots__` (cenário `stable`).
- [ ] Rodar os testes num CI (GitHub Actions) para provar que passam num checkout limpo.

## Lighthouse

- [x] Auditoria de Início e Detalhe, em mobile e desktop, no build de produção e no cenário padrão: 3 medições, mediana e relatórios em `lighthouse/reports/` (`npm run audit`).
- [x] Metas atingidas: Performance 92/92 no mobile e 99/99 no desktop; Acessibilidade, Boas práticas e SEO em 100.
- [ ] Documentar a análise no `ARCHITECTURE.md`: condições da medição (Chromium sem GPU, uma execução de aquecimento descartada), causas do LCP e o fato de o Lighthouse mostrar 0 KB nas requisições que passam pelo Service Worker do MSW (imagens e API), que por isso não pesam na simulação.

## Requisitos do desafio a confirmar ou completar

Levantados em 18/11/2026 por busca no código e nos nomes dos testes; confirmar cada item antes de implementar.

- [x] Fixtures com dois usuários (`colecionador@kurio.dev` / `kurio1234` e `curador@kurio.dev` / `kurio5678`).
- [x] Cenário `order-timeout`: a resposta do pedido criado se perde e a nova tentativa recupera o mesmo pedido.
- [x] Cenários do MSW: `offline`, `out-of-order` e `edition-sells-out`.
- [x] Reutilizar a chave de idempotência com conteúdo diferente gera conflito (`idempotency_conflict`).
- [x] Tela para rotas inexistentes.
- [x] Testes de filtros combinados, busca mobile, skeletons, conflito no cadastro, avatar e troca de senha (`e2e/scenarios.spec.ts`).
- [x] Testes: troca de usuário e timeout com recuperação do mesmo pedido (`e2e/resilience.spec.ts`).
- [x] Testes de tempo real pelo `socket.io-client`: preço alterado no carrinho e no checkout, eventos duplicados ou antigos, reconexão, desconexão e retomada de pedido pendente (`e2e/realtime.spec.ts`).
- [x] Relógio controlado no teste de cotação expirada.
- [ ] Documentar os controles do mock em `/api/__mock/*`.

## Entrega (nesta ordem)

- [ ] Completar os requisitos acima.
- [ ] Escrever `README.md` e `ARCHITECTURE.md`.
- [ ] Deploy, por último.

## Desvios do Figma para documentar no `ARCHITECTURE.md`

- [ ] Telas acima de 1440px: o Figma não define esse caso; a página inteira escala para o conteúdo ocupar a largura da tela, com 32px de borda proporcional (`--page-zoom` em `src/index.css`).

- [ ] Modal de autenticação com fundo escurecido (o Figma não mostra scrim).
- [ ] Mobile: barra de navegação inferior sem o recorte central e sem o botão de escanear (ver item acima).
- [ ] Mobile: "Ordenar por", paginação, promoções, blog e footer mantidos abaixo da grade (o frame mobile não mostra), para não esconder conteúdo nem prejudicar SEO/acessibilidade.
- [ ] Mobile: filtros abrem num painel lateral pelo botão ao lado da busca (o Figma não desenha esse painel).
- [ ] Confirmação: "Ver no Etherscan" aponta para um explorador simulado interno (`/explorador/tx/:hash`), identificado como demonstração; "Copiar ID da transação" mantido.
- [ ] Perfil: o avatar é escolhido entre as artes do marketplace (a API simulada não tem upload de arquivo).
- [ ] Carteiras: campos "Nome do perfil", "Código de indicação" e "E-mail" do formulário do Figma não foram incluídos (não fazem parte de uma carteira).
