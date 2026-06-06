Loja PLATINUM 316L - E-commerce de correntes masculinas integrado com Supabase e Asaas

## Deploy via GitHub Actions

Este repositório já pode ser conectado ao Supabase e ao GitHub usando o workflow em `.github/workflows/supabase-deploy.yml`.

### Secrets necessários

Adicione as seguintes secrets no GitHub:

- `SUPABASE_ACCESS_TOKEN` — token de acesso do Supabase CLI
- `SUPABASE_PROJECT_REF` — referência do projeto Supabase
- `SUPABASE_URL` — URL do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — chave de serviço do Supabase
- `VITE_SUPABASE_URL` — URL do Supabase para o front-end
- `VITE_SUPABASE_PUBLISHABLE_KEY` — chave pública do Supabase para o front-end

### Como funciona

Quando houver push para `main` ou `master`, o workflow:

1. faz checkout do código
2. instala o Supabase CLI
3. roda `supabase db push` para aplicar migrations
4. executa `npm run build`

