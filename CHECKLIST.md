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
- [ ] Página de favoritos: o botão "Favoritos" da barra inferior mobile ainda não leva a uma tela.
- [ ] "Esqueceu a senha?" sem fluxo.

## Desvios do Figma para documentar no `ARCHITECTURE.md`

- [ ] Modal de autenticação com fundo escurecido (o Figma não mostra scrim).
- [ ] Mobile: barra de navegação inferior sem o recorte central e sem o botão de escanear (ver item acima).
- [ ] Mobile: "Ordenar por", paginação, promoções, blog e footer mantidos abaixo da grade (o frame mobile não mostra), para não esconder conteúdo nem prejudicar SEO/acessibilidade.
- [ ] Mobile: filtros abrem num painel lateral pelo botão ao lado da busca (o Figma não desenha esse painel).
- [ ] Confirmação: "Ver no Etherscan" trocado por "Copiar ID da transação" (o hash é fictício, um link real levaria a uma página inexistente).
- [ ] Perfil: o avatar é escolhido entre as artes do marketplace (a API simulada não tem upload de arquivo).
- [ ] Carteiras: campos "Nome do perfil", "Código de indicação" e "E-mail" do formulário do Figma não foram incluídos (não fazem parte de uma carteira).
