
# E-commerce ELITE316 — Plano de Execução

Escopo é grande demais para um único turno. Vou dividir em fases entregando cada uma 100% funcional antes da próxima.

## Fase 1 — Fundação (esta etapa)
1. **Habilitar Lovable Cloud** (Supabase: DB + Storage + Auth)
2. **Schema SQL completo**: `categorias`, `produtos` (com `preco_promocional`), `variantes_produto`, `imagens_produto`, `cupons`, `clientes`, `enderecos`, `pedidos` (com `carrinho_abandonado`, `codigo_rastreio`), `user_roles` (admin), `fila_emails`
3. **RLS** em todas as tabelas + função `has_role`
4. **Bucket `produtos-bucket`** público para leitura, upload só admin
5. **Design system escuro**: preto texturizado, grafite, cinza platina, dourado velho — tokens em `src/styles.css`
6. **Layout base**: Navbar (Home / Categorias / Carrinho / Área do Cliente), Footer institucional
7. **Home**: Hero "FORJADO PARA QUEM NÃO RECUA" → Categorias em destaque (4) → Mais Vendidos → Promoções → Benefícios 316L → Footer
8. **Seed**: 4 categorias (Grumet, Veneziana, Cordão Baiano, Pingentes) + **20 produtos por categoria** com imagens geradas (1 hero por categoria + reaproveitamento — gerar 80 imagens únicas custaria muito; vou gerar ~12 imagens base de alta qualidade e reusar entre produtos da mesma categoria)

## Fase 2 — Catálogo
- Página `/categorias/:slug` (grid de produtos com badge de desconto)
- Página `/produto/:slug` com carrossel dinâmico, seletor de comprimento (50–80cm), **modal Guia de Tamanhos** com silhueta, preço promocional, botão Adicionar ao Carrinho

## Fase 3 — Carrinho + Checkout
- Carrinho lateral (Drawer): itens, cupom, simular frete (SEDEX R$25 / PAC R$12), Finalizar
- `/checkout` one-step com ViaCEP, PIX (QR fictício) + Cartão, grava `pedidos`+`enderecos`, marca `carrinho_abandonado=false`
- `/pedido-sucesso`

## Fase 4 — Auth + Área do Cliente
- `/login`, `/cadastro` (email/senha)
- `/minha-conta` com histórico de pedidos e status em tempo real

## Fase 5 — Admin (`/admin`, protegido por role)
- Visão Geral (métricas)
- CRUD Categorias
- CRUD Produtos (upload flexível N fotos para Storage, slug com sufixo aleatório, estoque por tamanho, preço promocional)
- Clientes (busca + modal com endereços)
- Pedidos: status completo (Pendente / Pago / Em Separação / Enviado [+ código rastreio] / Entregue / Cancelado [estorna estoque]) com badges coloridas
- Carrinhos Abandonados: botões WhatsApp e E-mail com texto pré-preenchido e variáveis dinâmicas
- Cupons (criar/desativar)

## Fase 6 — Automações
- Trigger no Supabase: ao mudar status para "Enviado", insere registro em `fila_emails` com template HTML (Resend opcional depois)

## Detalhes técnicos
- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn (customizado)
- Server fns para queries protegidas; admin client em `*.server.ts` só onde necessário
- Imagens: `imagegen` em src/assets para hero/categorias; bucket Storage para produtos cadastrados pelo admin
- Slug: `slugify(nome) + '-' + crypto.randomUUID().slice(0,6)`

## O que NÃO entra agora
- Integração real Stripe/Mercado Pago/Melhor Envio (apenas simulação)
- Envio real de e-mail (fica na fila)

Vou começar pela Fase 1 assim que aprovar.
