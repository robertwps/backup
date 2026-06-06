// Dados fictícios usados como fallback quando o banco retorna vazio
// para permitir navegação e demonstração do painel admin.

export const mockCategorias = [
  { id: "mock-cat-1", nome: "Correntes Baianas", slug: "correntes-baianas", descricao: "Modelos clássicos baianos", imagem_url: null, ordem: 1 },
  { id: "mock-cat-2", nome: "Grumet", slug: "grumet", descricao: "Elos grumet em aço 316L", imagem_url: null, ordem: 2 },
  { id: "mock-cat-3", nome: "Pingentes", slug: "pingentes", descricao: "Pingentes premium", imagem_url: null, ordem: 3 },
  { id: "mock-cat-4", nome: "Veneziana", slug: "veneziana", descricao: "Elos venezianos delicados", imagem_url: null, ordem: 4 },
];

export const mockProdutos = [
  {
    id: "mock-prod-1", nome: "Corrente Baiana 6mm", slug: "corrente-baiana-6mm",
    descricao: "Corrente baiana em aço inoxidável 316L 6mm.",
    preco: 249.9, preco_promocional: 199.9, preco_custo: 80,
    categoria_id: "mock-cat-1", sku: "SKU-BAIANA6", estoque_minimo: 5,
    ativo: true, destaque: true, imagem_principal: null, material: "Aço Inoxidável 316L",
  },
  {
    id: "mock-prod-2", nome: "Grumet 8mm", slug: "grumet-8mm",
    descricao: "Corrente grumet maciça.",
    preco: 329.9, preco_promocional: null, preco_custo: 110,
    categoria_id: "mock-cat-2", sku: "SKU-GRU8", estoque_minimo: 3,
    ativo: true, destaque: false, imagem_principal: null, material: "Aço Inoxidável 316L",
  },
  {
    id: "mock-prod-3", nome: "Pingente Cruz", slug: "pingente-cruz",
    descricao: "Pingente cruz polido.",
    preco: 89.9, preco_promocional: null, preco_custo: 25,
    categoria_id: "mock-cat-3", sku: "SKU-PG-CRUZ", estoque_minimo: 10,
    ativo: true, destaque: true, imagem_principal: null, material: "Aço Inoxidável 316L",
  },
];

export const mockClientes = [
  { id: "mock-cli-1", nome_completo: "João da Silva", email: "joao@example.com", telefone: "(11) 99999-0001", criado_em: new Date().toISOString() },
  { id: "mock-cli-2", nome_completo: "Maria Souza", email: "maria@example.com", telefone: "(11) 99999-0002", criado_em: new Date().toISOString() },
];

export const mockPedidos = [
  {
    id: "mock-ped-1", numero: 1001, total: 249.9, subtotal: 229.9, frete: 20, desconto: 0,
    status: "pago", criado_em: new Date().toISOString(),
    nome_contato: "João da Silva", email_contato: "joao@example.com", telefone_contato: "(11) 99999-0001",
    codigo_rastreio: null, metodo_pagamento: "pix", endereco_id: null, cliente_id: "mock-cli-1",
    carrinho_abandonado: false,
  },
  {
    id: "mock-ped-2", numero: 1002, total: 329.9, subtotal: 309.9, frete: 20, desconto: 0,
    status: "pendente", criado_em: new Date().toISOString(),
    nome_contato: "Maria Souza", email_contato: "maria@example.com", telefone_contato: "(11) 99999-0002",
    codigo_rastreio: null, metodo_pagamento: "cartao", endereco_id: null, cliente_id: "mock-cli-2",
    carrinho_abandonado: false,
  },
  {
    id: "mock-ped-3", numero: 1003, total: 539.8, subtotal: 519.8, frete: 20, desconto: 0,
    status: "separacao", criado_em: new Date(Date.now() - 86400000).toISOString(),
    nome_contato: "Carlos Mendes", email_contato: "carlos@example.com", telefone_contato: "(11) 98888-1234",
    codigo_rastreio: null, metodo_pagamento: "pix", endereco_id: null, cliente_id: null,
    carrinho_abandonado: false,
  },
  {
    id: "mock-ped-4", numero: 1004, total: 199.9, subtotal: 179.9, frete: 20, desconto: 0,
    status: "enviado", criado_em: new Date(Date.now() - 3 * 86400000).toISOString(),
    nome_contato: "Ana Lima", email_contato: "ana@example.com", telefone_contato: "(21) 97777-5566",
    codigo_rastreio: "BR987654321XX", metodo_pagamento: "pix", endereco_id: null, cliente_id: null,
    carrinho_abandonado: false,
  },
  {
    id: "mock-ped-5", numero: 1005, total: 89.9, subtotal: 69.9, frete: 20, desconto: 0,
    status: "entregue", criado_em: new Date(Date.now() - 10 * 86400000).toISOString(),
    nome_contato: "Pedro Rocha", email_contato: "pedro@example.com", telefone_contato: "(31) 96666-1111",
    codigo_rastreio: "BR111222333BR", metodo_pagamento: "cartao", endereco_id: null, cliente_id: null,
    carrinho_abandonado: false,
  },
  // Carrinhos abandonados
  {
    id: "mock-ped-6", numero: 2001, total: 449.9, subtotal: 429.9, frete: 20, desconto: 0,
    status: "pendente", criado_em: new Date(Date.now() - 2 * 3600000).toISOString(),
    nome_contato: "Bruna Castro", email_contato: "bruna@example.com", telefone_contato: "5511955554444",
    codigo_rastreio: null, metodo_pagamento: null, endereco_id: null, cliente_id: null,
    carrinho_abandonado: true,
  },
  {
    id: "mock-ped-7", numero: 2002, total: 689.9, subtotal: 669.9, frete: 20, desconto: 0,
    status: "pendente", criado_em: new Date(Date.now() - 26 * 3600000).toISOString(),
    nome_contato: "Rafael Pires", email_contato: "rafael@example.com", telefone_contato: "5511944443333",
    codigo_rastreio: null, metodo_pagamento: null, endereco_id: null, cliente_id: null,
    carrinho_abandonado: true,
  },
];

// Itens dos pedidos mock — usados para o estorno de estoque no cancelamento.
export const mockItensPedido: Record<string, Array<{ id: string; pedido_id: string; produto_id: string; nome_produto: string; quantidade: number; preco_unit: number; comprimento: string | null }>> = {
  "mock-ped-1": [{ id: "mi-1", pedido_id: "mock-ped-1", produto_id: "mock-prod-1", nome_produto: "Corrente Baiana 6mm", quantidade: 1, preco_unit: 229.9, comprimento: "60cm" }],
  "mock-ped-2": [{ id: "mi-2", pedido_id: "mock-ped-2", produto_id: "mock-prod-2", nome_produto: "Grumet 8mm", quantidade: 1, preco_unit: 309.9, comprimento: "70cm" }],
  "mock-ped-3": [
    { id: "mi-3a", pedido_id: "mock-ped-3", produto_id: "mock-prod-1", nome_produto: "Corrente Baiana 6mm", quantidade: 2, preco_unit: 229.9, comprimento: "60cm" },
    { id: "mi-3b", pedido_id: "mock-ped-3", produto_id: "mock-prod-3", nome_produto: "Pingente Cruz", quantidade: 1, preco_unit: 59.9, comprimento: null },
  ],
  "mock-ped-4": [{ id: "mi-4", pedido_id: "mock-ped-4", produto_id: "mock-prod-1", nome_produto: "Corrente Baiana 6mm", quantidade: 1, preco_unit: 179.9, comprimento: "50cm" }],
  "mock-ped-5": [{ id: "mi-5", pedido_id: "mock-ped-5", produto_id: "mock-prod-3", nome_produto: "Pingente Cruz", quantidade: 1, preco_unit: 69.9, comprimento: null }],
  "mock-ped-6": [{ id: "mi-6", pedido_id: "mock-ped-6", produto_id: "mock-prod-2", nome_produto: "Grumet 8mm", quantidade: 1, preco_unit: 429.9, comprimento: "60cm" }],
  "mock-ped-7": [
    { id: "mi-7a", pedido_id: "mock-ped-7", produto_id: "mock-prod-1", nome_produto: "Corrente Baiana 6mm", quantidade: 1, preco_unit: 199.9, comprimento: "70cm" },
    { id: "mi-7b", pedido_id: "mock-ped-7", produto_id: "mock-prod-2", nome_produto: "Grumet 8mm", quantidade: 1, preco_unit: 470, comprimento: "60cm" },
  ],
};

export const mockCupons = [
  { id: "mock-cup-1", codigo: "ELITE10", tipo: "percentual", valor: 10, ativa: true, criado_em: new Date().toISOString() },
  { id: "mock-cup-2", codigo: "FRETEGRATIS", tipo: "fixo", valor: 25, ativa: true, criado_em: new Date().toISOString() },
];

export const mockEstoqueMap: Record<string, number> = {
  "mock-prod-1": 12, "mock-prod-2": 5, "mock-prod-3": 24,
};

export const isMockId = (id: string) => id.startsWith("mock-");
