# Checklist

Pendências e decisões para revisar antes da entrega.

## Para ver no final

- [ ] **Botão de escanear (mobile):** botão central da barra de navegação inferior no Figma mobile. Não tem função descrita no desafio. Decidir se implementa, troca por outra ação ou remove (e documentar o desvio no `ARCHITECTURE.md`).

## Pendências conhecidas

- [ ] Converter as artes em `public/nfts/` (PNG ~2 MB cada) para WebP menores antes da auditoria do Lighthouse.
- [ ] Páginas sem destino ainda: Mercado, Criadores, Aprenda, artigos do blog e a maioria dos links do rodapé.
- [ ] Contador do carrinho no Header está fixo; ligar à API do carrinho.

## API simulada (MSW)

- [ ] Documentar no `ARCHITECTURE.md`: contratos REST, eventos `nft.updated`/`order.updated`, política de sessão, cache/retry e reconciliação REST × Socket.IO.
- [ ] Documentar no `README.md`: credenciais fictícias (`colecionador@kurio.dev` / `kurio1234`), cupons (`KURIO10`, `GENESIS`), cenários (`?scenario=`) e reset (`?mockReset`).
- [ ] Limitações do MSW para documentar: o binding de Socket.IO só suporta WebSocket (sem polling), não envia pings (o mock envia), sem namespaces/rooms; dados do mock ficam no `localStorage` de cada navegador; pedidos interrompidos por reload continuam quando a página volta.
- [ ] O chunk do mock (~478 KB) carrega antes do app; avaliar impacto no Lighthouse da build de demonstração.
- [x] Ligar à API: detalhe do NFT, carrinho, pagamento, confirmação, perfil, carteiras, favoritos, login e newsletter.
- [ ] Documentar: o app só é importado depois que o MSW inicia, porque o engine.io-client guarda o `WebSocket` global ao carregar (ver `src/main.tsx`).

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
- [ ] Bloco 4 — Frames mobile (Detalhe, Carrinho, Pagamento, Login, Cadastro).

## Testes

- [x] Playwright: E2E (catálogo, auth, compra, favoritos, perfil, carteiras, acessibilidade) em Chromium desktop e mobile, relatório HTML, traces/vídeos em falhas.
- [x] Regressão visual com baselines versionadas em `e2e/__screenshots__` (cenário `stable`).
- [ ] Rodar os testes num CI (GitHub Actions) para provar que passam num checkout limpo.

## Desvios do Figma para documentar no `ARCHITECTURE.md`

- [ ] Modal de autenticação com fundo escurecido (o Figma não mostra scrim).
- [ ] Mobile: barra de navegação inferior sem o recorte central e sem o botão de escanear (ver item acima).
- [ ] Mobile: "Ordenar por", paginação, promoções, blog e footer mantidos abaixo da grade (o frame mobile não mostra), para não esconder conteúdo nem prejudicar SEO/acessibilidade.
- [ ] Mobile: filtros abrem num painel lateral pelo botão ao lado da busca (o Figma não desenha esse painel).
- [ ] Confirmação: "Ver no Etherscan" aponta para um explorador simulado interno (`/explorador/tx/:hash`), identificado como demonstração; "Copiar ID da transação" mantido.
- [ ] Perfil: o avatar é escolhido entre as artes do marketplace (a API simulada não tem upload de arquivo).
- [ ] Carteiras: campos "Nome do perfil", "Código de indicação" e "E-mail" do formulário do Figma não foram incluídos (não fazem parte de uma carteira).
