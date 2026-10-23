-- Executar no SQL Editor de um projeto Supabase dedicado à HEEEPH.
-- Ativar Auth > Providers > Email (OTP) e configurar URLs de redirecionamento.
create table if not exists public.favoritos (
  user_id uuid not null references auth.users(id) on delete cascade,
  produto_id text not null check (char_length(produto_id) between 1 and 120),
  criado_em timestamptz not null default now(),
  primary key (user_id, produto_id)
);
create index if not exists favoritos_produto_idx on public.favoritos(produto_id);
alter table public.favoritos enable row level security;
revoke all on public.favoritos from anon;
grant select, insert, delete on public.favoritos to authenticated;
drop policy if exists "cliente le suas favoritas" on public.favoritos;
create policy "cliente le suas favoritas" on public.favoritos
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "cliente adiciona suas favoritas" on public.favoritos;
create policy "cliente adiciona suas favoritas" on public.favoritos
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "cliente remove suas favoritas" on public.favoritos;
create policy "cliente remove suas favoritas" on public.favoritos
  for delete to authenticated using ((select auth.uid()) = user_id);
-- Contagens administrativas: consulte no painel privado do Supabase.
-- SELECT count(*) FROM auth.users;
-- SELECT count(distinct user_id) FROM public.favoritos;
-- SELECT produto_id, count(*) FROM public.favoritos GROUP BY 1 ORDER BY 2 DESC;
-- Não exponha auth.users ou métricas individuais ao navegador.
