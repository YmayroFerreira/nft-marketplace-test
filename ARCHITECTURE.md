# Arquitetura

Este documento registra os contratos, as políticas de estado e as decisões da solução. Setup, comandos e cenários estão no [README](README.md).

## Visão geral

```text
Telas (src/routes, src/components)
        │
Hooks de domínio (src/features) ─ TanStack Query: cache, mutations e reconciliação
        │                                   ▲
Cliente Axios (src/api/client.ts)           │ eventos
        │                          socket.io-client (src/api/realtime.ts)
        ▼                                   ▼
────────────────── camada de rede do navegador ──────────────────
        │ Service Worker                    │ WebSocket interceptado
        ▼                                   ▼
Handlers REST do MSW  ◄── banco simulado ──► Servidor Socket.IO simulado
(src/mocks/handlers)      (src/mocks/db.ts)   (src/mocks/realtime.ts)
```

Componentes, hooks e o cliente Axios não contêm respostas fictícias. A camada de mocks é ativada por `VITE_ENABLE_MOCKS` e também roda no build publicado.

| Pasta | Responsabilidade |
|---|---|
| `src/routes` | Rotas do TanStack Router, parâmetros e telas |
| `src/components` | Componentes visuais e primitivas shadcn/ui |
| `src/features` | Autenticação, conta, carrinho, catálogo, checkout e tempo real |
| `src/api` | Axios, endpoints, token de sessão e Socket.IO |
| `src/types` | Contratos entre transporte, estado e interface |
| `src/mocks` | Handlers, banco, fixtures, cenários e Socket.IO simulado |
| `e2e` | Testes Playwright e baselines visuais |
| `lighthouse` | Configuração, execução e relatórios da auditoria |

## Contratos REST

Base: `/api`. Rotas marcadas com **Sim** exigem `Authorization: Bearer <token>`. Os tipos completos estão em `src/types`. Valores em ETH trafegam como strings decimais e quantidades são inteiras.

| Método e rota | Auth | Sucesso | Observações |
|---|---|---|---|
| `POST /auth/sign-up` | Não | 201 `AuthResponse` | 409 `email_taken` ou `username_taken`; 422 |
| `POST /auth/sign-in` | Não | 200 `AuthResponse` | 401 `invalid_credentials`; 422 |
| `POST /auth/social` | Não | 200 `AuthResponse` | Login social simulado |
| `POST /auth/password-reset` | Não | 202 `{ sent }` | Não revela se a conta existe |
| `GET /auth/session` | Sim | 200 `{ user }` | Recupera a sessão após refresh |
| `POST /auth/sign-out` | Não | 204 | Invalida o token enviado |
| `GET /nfts` | Não | 200 `Paginated<Nft>` | `page`, `pageSize`, `tab`, `sort`, `collections`, `networks`, `minPrice`, `maxPrice`, `q` |
| `GET /nfts/facets` | Não | 200 `CatalogFacets` | Coleções, redes e faixa de preço |
| `GET /nfts/featured` | Não | 200 `Nft` | 404 sem destaque |
| `GET /nfts/:id` | Não | 200 `NftDetail` | 404 `not_found` |
| `GET /nfts/:id/related` | Não | 200 `Nft[]` | `limit` |
| `GET /nfts/:id/reviews` | Não | 200 `Paginated<NftReview>` | `page` |
| `GET /favorites` | Sim | 200 `Favorites` | |
| `PUT` ou `DELETE /favorites/:nftId` | Sim | 200 `Favorites` | |
| `POST /cart/preview` | Não | 200 `Cart` | Calcula o carrinho do visitante |
| `POST /cart/merge` | Sim | 200 `{ cart, adjustments }` | Junta o carrinho do visitante à conta |
| `GET /cart` | Sim | 200 `Cart` | |
| `PUT /cart/items/:nftId/:editionId` | Sim | 200 `Cart` | `{ quantity, expectedVersion? }`; 409 `cart_conflict` |
| `DELETE /cart/items/:nftId/:editionId` | Sim | 200 `Cart` | |
| `POST` ou `DELETE /cart/promo` | Sim | 200 `Cart` | 422 `invalid_promo_code` ou `expired_promo_code` |
| `POST /checkout/quote` | Sim | 201 `CheckoutQuote` | Vale 5 min; 409 `cart_empty` ou `insufficient_editions` |
| `POST /wallets/:id/connect` | Sim | 201 `WalletConnection` | Vale 15 min; 403 `wallet_rejected` |
| `DELETE /wallet-connections/:id` | Sim | 204 | |
| `POST /orders` | Sim | 201 `Order`; 200 na repetição | Exige `Idempotency-Key` |
| `GET /orders` | Sim | 200 `Order[]` | Somente pedidos do usuário |
| `GET /orders/:id` | Sim | 200 `Order` | 404 também para pedido de outro usuário |
| `GET /wallets`, `POST /wallets` | Sim | 200 `Wallet[]`, 201 `Wallet` | 409 `wallet_exists`; 422 |
| `PATCH` ou `DELETE /wallets/:id` | Sim | 200 `Wallet`, 204 | |
| `GET`, `PATCH /profile` | Sim | 200 `Profile` | 422 com erros por campo |
| `PUT /profile/password` | Sim | 204 | 422 `currentPassword` |
| `GET /promos`, `GET /blog/posts` | Não | 200 | Conteúdo da página inicial |
| `POST /newsletter` | Não | 201 `{ subscribed }` | 409 `already_subscribed` |
| `GET /explorer/tx/:hash` | Não | 200 | Explorador simulado |

### Erros

```json
{ "error": { "code": "validation_error", "message": "Confira os campos.", "fields": { "email": "Informe um e-mail válido." } } }
```

| Situação | Status | Códigos |
|---|---|---|
| Requisição inválida | 400 | `missing_idempotency_key` |
| Sessão inválida | 401 | `unauthorized`, `invalid_credentials` |
| Falta de permissão | 403 | `wallet_rejected` |
| Recurso inexistente | 404 | `not_found` |
| Conflito | 409 | `quote_changed`, `insufficient_editions`, `cart_conflict`, `order_in_progress`, `idempotency_conflict`, `wallet_disconnected`, entre outros |
| Validação | 422 | `validation_error`, `invalid_promo_code`, `expired_promo_code` |
| Falha transitória | 500, 503 | `internal_error`, `service_unavailable` |
| Rede | sem resposta | No cliente: `network_error` ou `timeout` |

### Criação de pedido

`POST /orders` recebe `quoteId`, `walletId`, `connectionId`, `network` e `collector`, além do cabeçalho `Idempotency-Key`.

1. A mesma chave com a mesma compra devolve o pedido existente (200).
2. A mesma chave com outros dados responde 409 `idempotency_conflict`.
3. Outro pedido em andamento responde 409 `order_in_progress`, com `orderId`.
4. Carteira, conexão, cotação, preço, estoque, cupom e taxas são revalidados. Mudanças respondem 409 `quote_changed`, com a nova cotação.

O pedido passa por `pending`, `processing` e termina em `confirmed` ou `failed`, que são estados finais. O recibo é um snapshot da cotação.

## Eventos Socket.IO

Os eventos têm identidade, recurso e versão:

```ts
{
  eventId: string
  type: 'nft.updated' | 'order.updated'
  resource: { type: 'nft' | 'order'; id: string }
  version: number
  occurredAt: string
  data: unknown
}
```

| Evento | `data` | Destino | Efeito no cliente |
|---|---|---|---|
| `nft.updated` | `price`, `previousPrice`, `availableEditions`, `editions[]` | Todas as conexões | Atualiza catálogo, destaque, detalhe e relacionados; recalcula o carrinho e avisa se ele foi afetado |
| `order.updated` | `status`, `transactionHash`, `failureReason` | Somente o dono do pedido | Atualiza o pedido; ao finalizar, recarrega carrinho e lista |

O token vai no handshake (`auth.token`). Ao entrar, sair ou expirar a sessão, o socket reconecta com o token atual e os listeners são removidos ao encerrar o ciclo de vida.

## Sessão

- O token fica no `localStorage` e é enviado como Bearer. Na API simulada, a sessão dura 12 horas.
- Após refresh, `GET /auth/session` recupera o usuário.
- Um 401 limpa o token e os dados privados em cache, mostra um aviso e abre o login na mesma tela.
- `requireAuth` guarda a ação pendente, como favoritar ou finalizar a compra, e a executa após o login.
- Os dados do checkout ficam no `sessionStorage`, vinculados ao usuário, para retomar após a expiração. A conexão da carteira e a cotação são refeitas.
- O logout remove rascunho, token e caches da conta. Todas as chaves privadas incluem o id do usuário.
- As telas privadas usam `RequireAuth`, que mantém a URL e oferece login no próprio contexto. `/login` e `/cadastro` redirecionam para o modal.
- Senhas são armazenadas apenas como hash PBKDF2-SHA256 com salt.

## Estado do carrinho

| | Visitante | Usuário autenticado |
|---|---|---|
| Fonte dos itens | `localStorage`, apenas itens e cupom | API simulada |
| Valores | `POST /cart/preview` | `GET /cart` |
| Atualização | Local, seguida de novo cálculo na API | Mutations, com a resposta gravada no cache |

- Cada linha é a combinação de NFT e edição, limitada ao estoque da edição.
- Subtotal, desconto, taxa e total sempre vêm da API.
- No login, `POST /cart/merge` soma as quantidades e informa ajustes por estoque.
- `expectedVersion` detecta alterações em outra aba e o conflito devolve o carrinho atual.
- O carrinho não muda ao criar o pedido. Após a confirmação, saem somente os itens e quantidades comprados.
- Em falhas, os itens são preservados.

## Cache e sincronização

| Dado | Chave | Política |
|---|---|---|
| Listagem | `['catalog', 'list', query]` | Mantém a página anterior durante a troca |
| Filtros | `['catalog', 'facets']` | `staleTime` de 5 min |
| Detalhe | `['catalog', 'detail', id]` | Pré-carregado no loader da rota |
| Promoções e blog | `['content', ...]` | `staleTime` de 10 min |
| Sessão | `['session', token]` | Sem expiração local e sem retry |
| Dados da conta | `['account', userId, ...]` | Removidos ao sair |
| Carrinho do visitante | `['guest-cart', cart]` | Recalculado quando o conteúdo muda |

- O padrão é `staleTime` de 30 s, com nova busca ao voltar para a janela.
- Consultas repetem até 2 vezes em falhas de rede e 5xx, com espera crescente. Erros 4xx são finais.
- Mutations não repetem automaticamente. Pedidos são reenviados pelo usuário com a mesma chave de idempotência.
- Respostas obsoletas são descartadas porque cada consulta tem sua própria chave.
- Favoritar é otimista, com rollback em caso de falha.
- A URL guarda busca, filtros, ordenação, aba e página.

## Reconciliação entre REST e Socket.IO

1. `eventId` já visto é ignorado.
2. `version` menor ou igual à conhecida é ignorada.
3. Evento válido atualiza o cache sem nova requisição, exceto o carrinho, cujos valores são recalculados pela API.
4. Pedido `confirmed` ou `failed` não muda mais.
5. Na reconexão, catálogo, dados da conta e carrinho são invalidados e as telas ativas buscam o estado atual.
6. Enquanto um pedido está em andamento, a tela também consulta a API a cada 5 s.
7. Ao recarregar a página, a simulação retoma os pedidos pendentes e a tela recupera o estado pela API.

Uma mudança de preço em checkout avisa o usuário e atualiza o carrinho. A cotação já revisada só é aceita se continuar válida: caso contrário, os novos valores precisam ser confirmados.

## Mocks

O banco simulado fica em memória e é persistido no `localStorage`. REST e eventos usam os mesmos dados, e cada recurso privado é separado por usuário. Os cenários estão em `src/mocks/scenarios.ts`, e os controles para testes em `src/mocks/handlers/controls.ts`.

O Socket.IO usa `@mswjs/socket.io-binding`, com o `socket.io-client` real em transporte WebSocket.

## Performance

A auditoria cobre início e detalhe, em mobile e desktop, com build de produção e cenário padrão. Os resultados e as condições de execução estão em [`lighthouse/reports/SUMMARY.md`](lighthouse/reports/SUMMARY.md).

Principais medidas:

- Imagens WebP em duas larguras, com `srcset`.
- Socket.IO, modal de login, filtros e rodapé carregados separadamente.
- Código e dados da página iniciados antes do primeiro render.
- Imagem principal do NFT baixada assim que os dados chegam.
- Primeiro render em transição, cedendo tempo ao navegador.
- Componentes do layout invisível não são montados.
- Cartões memoizados, para que outras respostas não recriem o catálogo.
- Chunk do mock reduzido substituindo `tldts`, usado apenas pela pilha de cookies do MSW.
- Skeleton animado com `transform`.

Condições e limites da medição:

- O Chromium headless roda com `--disable-gpu`. A emulação de GPU por software causava bloqueios aleatórios na primeira pintura.
- Uma execução por perfil é descartada como aquecimento antes das três medições.
- No mobile, o LCP é limitado principalmente pelo JavaScript inicial, que inclui o MSW, e pela latência simulada da API no detalhe.
- O Lighthouse registra 0 KB para requisições atendidas pelo Service Worker, como imagens e API. Esses bytes não pesam na simulação, então a experiência real pode ser um pouco mais lenta.

## Decisões de UX

- Login e cadastro são modais controlados por `?auth=`, o que preserva a tela e permite link direto.
- Visitantes podem montar o carrinho. O login é exigido ao finalizar.
- O checkout tem uma etapa de revisão antes de enviar o pedido.
- Mudanças de valor exigem confirmação explícita.
- Depois de uma falha de rede no envio, a tela permanece aberta para repetir com a mesma chave, mesmo que o carrinho tenha sido esvaziado pela confirmação.
- Acima de 1440 px, a página inteira escala para ocupar a largura da tela.
- Itens sem página no escopo aparecem como texto, sem simular navegação.

## Desvios do Figma

**Geral**

- Acima de 1440 px, caso não definido no Figma, o conteúdo de 1200 px é ampliado para preencher a tela com margem proporcional.
- O modal de autenticação tem fundo escurecido.
- As artes foram convertidas para WebP, preservando a composição.

**Mobile**

- O botão central de escanear não foi implementado, porque o desafio não define sua função. A barra inferior não tem esse botão nem o recorte central.
- A barra inferior fica oculta em detalhe, carrinho e pagamento, que têm barras de ação próprias.
- Ordenação, paginação, promoções, blog e rodapé continuam abaixo da grade, para não esconder conteúdo.
- Os filtros abrem em um painel lateral, não desenhado no Figma.
- Login e cadastro mantêm o botão de fechar, por acessibilidade.
- O detalhe mantém abas e "Mais desta coleção" abaixo do conteúdo principal.
- O carrinho mantém o rótulo "Total estimado" e uma lixeira por item.

**Fluxos**

- Pagamento: a carteira cadastrada já define o provedor, e a tela escolhe a rede e simula a conexão. Há uma etapa de revisão.
- Confirmação: "Ver no Etherscan" abre um explorador simulado interno, identificado como demonstração.
- Perfil: o avatar é escolhido entre as artes do marketplace, porque a API simulada não recebe arquivos.
- Carteiras: "Nome do perfil", "Código de indicação" e "E-mail" não foram incluídos, por não fazerem parte de uma carteira.

## Limitações

- O binding de Socket.IO funciona apenas com WebSocket, não envia pings sozinho (o mock envia) e não oferece namespaces ou rooms.
- O app inicia depois do MSW, e o `socket.io-client` é importado após o primeiro render, porque o engine.io guarda a referência global de `WebSocket` ao carregar.
- Os dados ficam no navegador. Abas diferentes mantêm cópias em memória e podem divergir até recarregar.
- Pedidos só avançam com a aplicação aberta e continuam ao reabri-la.
- Carteiras, pagamentos, transações, login social e recuperação de senha são simulados.
- Se a página for recarregada depois de um timeout e o pedido já tiver sido confirmado, a chave da tentativa se perde: não há compra duplicada, mas a tela não redireciona para aquele pedido.
- Mercado, Criadores, Aprenda, artigos do blog e parte dos links do rodapé estão fora do escopo.
