# Checklist

Pendências e decisões para revisar antes da entrega.

## Para ver no final

- [ ] **Botão de escanear (mobile):** botão central da barra de navegação inferior no Figma mobile. Não tem função descrita no desafio. Decidir se implementa, troca por outra ação ou remove (e documentar o desvio no `ARCHITECTURE.md`).

## Pendências conhecidas

- [ ] Converter as artes em `public/nfts/` (PNG ~2 MB cada) para WebP menores antes da auditoria do Lighthouse.
- [ ] Páginas sem destino ainda: Mercado, Criadores, Aprenda, artigos do blog e a maioria dos links do rodapé.
- [ ] Contador do carrinho no Header está fixo; ligar à API do carrinho.

## Desvios do Figma para documentar no `ARCHITECTURE.md`

- [ ] Modal de autenticação com fundo escurecido (o Figma não mostra scrim).
- [ ] Mobile: barra de navegação inferior sem o recorte central e sem o botão de escanear (ver item acima).
- [ ] Mobile: "Ordenar por", paginação, promoções, blog e footer mantidos abaixo da grade (o frame mobile não mostra), para não esconder conteúdo nem prejudicar SEO/acessibilidade.
- [ ] Mobile: filtros abrem num painel lateral pelo botão ao lado da busca (o Figma não desenha esse painel).
