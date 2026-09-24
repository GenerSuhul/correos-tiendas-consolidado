create table if not exists public.stores (
  code text primary key,
  name text not null unique,
  status text not null default 'pendiente' check (status in ('pendiente','confirmada')),
  confirmed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_code_length check (char_length(code) between 2 and 80),
  constraint stores_name_length check (char_length(name) between 2 and 160)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  store_code text not null references public.stores(code) on update cascade on delete restrict,
  collaborator text not null default '',
  role text not null default 'Rol por definir' check (role in
    ('Gerente','Cajero','Asesor/a de sala','Vendedor/a de campo','Ventas por definir','Jefe de bodega','Rol por definir')),
  email text,
  email_status text not null default 'pendiente' check (email_status in ('pendiente','confirmado')),
  confirmed_at timestamptz,
  notes text not null default '',
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_email_syntax check (email is null or email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'),
  constraint accounts_email_status check (email_status <> 'confirmado' or email is not null),
  constraint accounts_collaborator_length check (char_length(collaborator) <= 160),
  constraint accounts_notes_length check (char_length(notes) <= 4000)
);

create unique index if not exists accounts_email_unique on public.accounts (lower(email)) where email is not null;
create index if not exists accounts_store_code_idx on public.accounts (store_code);
create index if not exists accounts_email_status_idx on public.accounts (email_status);

alter table public.stores enable row level security;
alter table public.accounts enable row level security;

revoke all on public.stores from anon;
revoke all on public.accounts from anon;
grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;

create policy "IT may manage stores" on public.stores
  for all to authenticated
  using ((select auth.uid()) is not null and lower((select auth.jwt()) ->> 'email') = 'it.agrisystem@gmail.com')
  with check ((select auth.uid()) is not null and lower((select auth.jwt()) ->> 'email') = 'it.agrisystem@gmail.com');

create policy "IT may manage accounts" on public.accounts
  for all to authenticated
  using ((select auth.uid()) is not null and lower((select auth.jwt()) ->> 'email') = 'it.agrisystem@gmail.com')
  with check ((select auth.uid()) is not null and lower((select auth.jwt()) ->> 'email') = 'it.agrisystem@gmail.com');
