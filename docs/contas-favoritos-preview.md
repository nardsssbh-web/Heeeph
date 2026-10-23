# HEEEPH — contas e favoritas (branch de desenvolvimento)

Implementação inicial **não publicada em main**. O cadastro não funcionará até concluir a configuração abaixo.

## Dependência de autenticação
1. **Concluído:** projeto Supabase `heeeph-clientes` (São Paulo) conectado à branch de testes.
2. **Concluído:** tabela `public.favoritos` criada com RLS; verificação de segurança sem alertas.
3. **Pendente, manual no painel:** Supabase > Authentication > Email Templates > Magic Link. Substituir o link do template por um código `{{ .Token }}` de 6 dígitos e salvar. Verificar que o provedor Email está habilitado. Se preferir manter o link, configurar em Auth > URL Configuration a URL exata do Preview na allow list.
4. Configurar proteção antiabuso/rate limits, CAPTCHA e envio SMTP confiável antes de abrir cadastros públicos.
5. **Concluído nesta branch Preview:** `api/auth-config.js` possui fallback com URL e chave **publishable pública** do Supabase `heeeph-clientes`; não exige acesso às variáveis Vercel para testar. `SUPABASE_URL` e `SUPABASE_ANON_KEY` podem substituir o fallback por ambiente. **Nunca** usar service_role/secret. Antes de mesclar na `main`, revisar a configuração de produção.
6. Testar: cadastro por e-mail, código, logout, favoritos em dois navegadores, conta A não enxerga dados da conta B, sem sessão estrela direciona para login.
7. Validar política de privacidade, finalidade e retenção de dados (LGPD) antes de lançar.

## Escopo
- `minha-heeeph.html`: entrar, sair e listar/remover favoritas.
- `js/favoritos.js`: estado da sessão e ações de favoritas.
- `js/galeria.js`: estrela em cada placa das galerias, carregamento independente.
- Home e Coleções: link Minha HEEEPH no menu.
- Sem cadastro obrigatório no checkout. Sem mudanças de pagamento.
- Contagens: no painel privado do Supabase (consultas no SQL). Painel administrativo integrado ainda **não implementado**.
- Carrinho, pedidos e montagens vinculados à conta: **fora desta etapa**.

## Segurança
Nenhum cadastro ou lista de favoritas é armazenado no repositório; o navegador usa uma chave pública e o banco aplica políticas por usuário. A segurança depende da configuração correta do Supabase e das regras RLS. Não ativar em Production sem validar.
