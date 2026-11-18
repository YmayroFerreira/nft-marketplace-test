# Kurio — Marketplace de NFTs

Solução do [desafio frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge): descoberta, compra e conta do colecionador, em desktop e mobile, com APIs, autenticação, carteiras, pagamentos e tempo real simulados.

- **Aplicação publicada:** https://nft-marketplace-test-nine.vercel.app
- **Repositório:** https://github.com/YmayroFerreira/nft-marketplace-test
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Resultados do Lighthouse:** [lighthouse/reports/SUMMARY.md](lighthouse/reports/SUMMARY.md)

**Stack:** React, TypeScript, TanStack Router, TanStack Query, Axios, Socket.IO, Tailwind CSS, shadcn/ui, MSW, Playwright e Lighthouse.

## Setup

Desenvolvido e testado com Node.js 26. Nenhum backend ou serviço privado é necessário: REST e Socket.IO são simulados no navegador pelo MSW.

```bash
git clone https://github.com/YmayroFerreira/nft-marketplace-test.git
cd nft-marketplace-test
npm ci
npm run dev
```

Abra http://localhost:5173.

> No Windows, se o PowerShell bloquear o `npm`, use `npm.cmd` nos comandos.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento com mocks, em `localhost:5173` |
| `npm run build` | Verifica os tipos e gera o build de produção em `dist/` |
| `npm run preview` | Serve o build em `localhost:4173` |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | Lint com Oxlint |
| `npm run test:e2e` | Testes Playwright, incluindo regressão visual |
| `npm run test:e2e:update` | Atualiza as baselines visuais |
| `npm run test:e2e:report` | Abre o relatório HTML dos testes |
| `npm run audit` | Build e auditoria Lighthouse, com relatórios em `lighthouse/reports/` |

Antes da primeira execução dos testes ou da auditoria, instale o navegador:

```bash
npx playwright install chromium
```

Os testes sobem o próprio servidor. Falhas geram trace, vídeo e screenshot em `test-results/`.

## Variáveis de ambiente

Os valores padrão estão no `.env` versionado, que não contém segredos. Para sobrescrever, crie um `.env.local`.

| Variável | Padrão | Uso |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Inicia a API simulada, também no build de demonstração |
| `VITE_API_URL` | `/api` | URL base da API REST |
| `VITE_SOCKET_URL` | vazio | Servidor Socket.IO; vazio usa a origem da aplicação |

## Dados fictícios

| Conta | E-mail | Senha |
|---|---|---|
| Principal | `colecionador@kurio.dev` | `kurio1234` |
| Secundária | `curador@kurio.dev` | `kurio5678` |

| Cupom | Efeito |
|---|---|
| `KURIO10` | 10% de desconto |
| `GENESIS` | 0.05 ETH de desconto |
| `LANCAMENTO2025` | Expirado, para ver o erro |

Endereço válido para cadastrar carteira: `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD`.

## Cenários e reset

Adicione `?scenario=<nome>` a qualquer URL. O cenário fica salvo no navegador até outro ser escolhido.

- **Voltar ao normal:** `?scenario=default`
- **Restaurar os dados iniciais:** `?mockReset`
- **Reset em um cenário conhecido:** `?mockReset&scenario=stable`

| Cenário | Comportamento |
|---|---|
| `default` | Latência de 250 a 700 ms e um preço muda a cada 15 s |
| `stable` | Sem latência e sem eventos automáticos; usado nos testes |
| `slow` | 2 a 3,5 s por requisição, para ver os skeletons |
| `live` | Um preço muda a cada 3 s |
| `empty` | Catálogo sem resultados |
| `catalog-error` | Catálogo responde HTTP 500 |
| `flaky` | 20% das requisições respondem HTTP 503 |
| `offline` | Toda requisição REST falha na rede |
| `out-of-order` | A primeira busca do catálogo responde depois das seguintes |
| `session-expired` | Rotas autenticadas respondem HTTP 401 |
| `favorites-fail` | Favoritar falha, desfazendo a atualização otimista |
| `wallet-rejects` | A carteira recusa a conexão |
| `wallet-disconnects` | A carteira desconecta ao confirmar |
| `quote-changes` | Um preço muda entre a revisão e a confirmação |
| `edition-sells-out` | A edição esgota entre a revisão e a confirmação |
| `order-timeout` | O pedido é criado, mas a resposta chega depois do limite do cliente |
| `checkout-fails` | O pagamento termina recusado |

## Como reproduzir os fluxos de falha

Entre com a conta principal quando a tela pedir login. O carrinho dela já tem itens.

| Fluxo | URL | Passos | Resultado esperado |
|---|---|---|---|
| Sem conexão | `/?scenario=offline` | Aguarde as novas tentativas | Mensagem de falta de conexão e botão "Tentar novamente" |
| Erro HTTP 500 | `/?scenario=catalog-error` | Aguarde as novas tentativas | Erro no catálogo com "Tentar novamente" |
| Falhas intermitentes | `/?scenario=flaky` | Navegue pelo site | Novas tentativas automáticas; erro só se todas falharem |
| Carregamento lento | `/?scenario=slow` | Abra início, detalhe e carrinho | Skeletons com shimmer, sem deslocar o layout |
| Resposta fora de ordem | `/?scenario=out-of-order` | Clique logo em "Em alta" | A resposta antiga não substitui o resultado atual |
| Resultado vazio | `/?scenario=empty` | Abra o catálogo | Estado vazio com "Limpar filtros" |
| Sessão expirada | `/pagamento?scenario=default` | Entre, preencha os dados e troque a URL para `?scenario=session-expired` | Aviso e login na mesma tela, preservando os dados |
| Favorito com falha | `/?scenario=favorites-fail` | Favorite um NFT | O coração acende e volta, com mensagem de erro |
| Cadastro em conflito | `/?auth=criar-conta` | Use `colecionador@kurio.dev` | Erro de e-mail em uso no campo |
| Cupom inválido ou expirado | `/carrinho` | Aplique `INVALIDO` ou `LANCAMENTO2025` | Erro ao lado do campo |
| Carteira recusa | `/pagamento?scenario=wallet-rejects` | Clique em "Conectar carteira" | Mensagem de recusa |
| Carteira desconecta | `/pagamento?scenario=wallet-disconnects` | Conecte, revise e confirme | Volta à etapa de dados para reconectar |
| Preço muda na compra | `/pagamento?scenario=quote-changes` | Conecte, revise e confirme | Mostra os novos valores e exige nova confirmação |
| Edição esgota | `/pagamento?scenario=edition-sells-out` | Conecte, revise e confirme | Compra bloqueada, com link para ajustar o carrinho |
| Timeout do pedido | `/pagamento?scenario=order-timeout` | Confirme, aguarde 15 s e confirme de novo | Recupera o mesmo pedido, sem duplicar |
| Pagamento recusado | `/pagamento?scenario=checkout-fails` | Conecte, revise e confirme | Pedido recusado e itens preservados no carrinho |
| Pedido pendente | `/pagamento?scenario=stable` | Confirme e recarregue a página do pedido | O acompanhamento continua no mesmo pedido |

### Controles do servidor simulado

Disponíveis enquanto os mocks estão ativos. Os eventos chegam à aplicação pelo `socket.io-client`. No console do navegador:

```js
const mock = (path, body) =>
  fetch(`/api/__mock/${path}`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json())

await mock('nfts/emerald-ape-042', { price: '2.50' }) // muda o preço e publica nft.updated
await mock('nfts/emerald-ape-042', { available: 0 }) // esgota a edição padrão
await mock('socket/offline', { offline: true }) // derruba os sockets; use false para voltar
await mock('network', { down: true }) // derruba o REST; use false para voltar
```

## Testes

Os testes E2E rodam em Chromium, nos viewports desktop (1440 px) e mobile (390 px), com contexto isolado por teste. Cobrem catálogo, detalhe, autenticação, troca de usuário, favoritos, carrinho, compra, falhas, idempotência, perfil, carteiras, Socket.IO, acessibilidade e regressão visual. As baselines ficam em `e2e/__screenshots__/`.

## Deploy

O projeto está publicado na Vercel. O `vercel.json` envia as rotas para o `index.html`, permitindo acesso direto e refresh, e o build de produção mantém os mocks ativos.
