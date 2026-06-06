alter table clientes
  add column if not exists referral_balance numeric(10,2) not null default 0,
  add column if not exists referral_code text;

create unique index if not exists clientes_referral_code_idx on clientes(referral_code);

alter table pedidos
  add column if not exists referido_por uuid null references clientes(id),
  add column if not exists referral_credit_applied boolean not null default false;

create table if not exists referral_settings (
  id serial primary key,
  ativo boolean not null default true,
  bonus_amount numeric(10,2) not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into referral_settings (id, ativo, bonus_amount, created_at, updated_at)
values (1, true, 20, now(), now())
on conflict (id) do nothing;
