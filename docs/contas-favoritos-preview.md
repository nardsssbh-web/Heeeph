# HEEEPH — contas e favoritas (branch de desenvolvimento)

Implementação inicial **não publicada em main**. O cadastro não funcionará até concluir a configuração abaixo.

## Dependência de autenticação
1. Criar um projeto Supabase para HEEEPH (ambiente de teste primeiro).
2. No SQL Editor, executar `config/contas-favoritos.sql`. A tabela tem RLS: cada usuário só pode ver/alterar suas próprias favoritas.
3. Ativar Supabase Auth > Email. Para usar **código numérico**, configurar o modelo de e-mail OTP com `{{ .Token }}` (o template padrão pode enviar magic link).
4. Configurar proteção antiabuso/rate limits, CAPTCHA e envio SMTP confiável antes de abrir cadastros públicos.
5. Configurar no Vercel Preview: `SUPABASE_URL` e `SUPABASE_ANON_KEY` (chave **pública** anon/publishable). **NUNCA** usar service_role/secret. O endpoint `/api/auth-config` retorna somente esses dois valores públicos.
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
