create table if not exists public.kayou_cards (
  id uuid primary key default gen_random_uuid(),
  owner_name text,
  title text not null,
  character text not null,
  set_name text not null,
  card_number text,
  language text not null check (language in ('Japanese', 'Chinese', 'English')),
  card_status text not null default 'Owned' check (card_status in ('Owned', 'Wishlist', 'For Trade')),
  rarity text not null,
  condition text,
  copies integer not null default 1 check (copies > 0),
  acquisition_date date,
  image_data text,
  notes text,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.kayou_cards
  add column if not exists owner_name text;

alter table public.kayou_cards
  add column if not exists card_status text not null default 'Owned';

update public.kayou_cards
set card_status = 'Owned'
where card_status is null
   or card_status not in ('Owned', 'Wishlist', 'For Trade');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kayou_cards_card_status_check'
  ) then
    alter table public.kayou_cards
      add constraint kayou_cards_card_status_check
      check (card_status in ('Owned', 'Wishlist', 'For Trade'));
  end if;
end
$$;

create index if not exists kayou_cards_created_at_idx
  on public.kayou_cards (created_at desc);

create or replace function public.set_kayou_cards_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists kayou_cards_set_updated_at on public.kayou_cards;

create trigger kayou_cards_set_updated_at
before update on public.kayou_cards
for each row
execute function public.set_kayou_cards_updated_at();

alter table public.kayou_cards enable row level security;

drop policy if exists "Public read kayou cards" on public.kayou_cards;
create policy "Public read kayou cards"
on public.kayou_cards
for select
using (true);

drop policy if exists "Owners insert kayou cards" on public.kayou_cards;
create policy "Owners insert kayou cards"
on public.kayou_cards
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners update kayou cards" on public.kayou_cards;
create policy "Owners update kayou cards"
on public.kayou_cards
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners delete kayou cards" on public.kayou_cards;
create policy "Owners delete kayou cards"
on public.kayou_cards
for delete
to authenticated
using (auth.uid() = owner_user_id);

create table if not exists public.kayou_set_targets (
  id uuid primary key default gen_random_uuid(),
  set_name text not null,
  total_cards integer not null check (total_cards > 0),
  owner_name text,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_user_id, set_name)
);

alter table public.kayou_set_targets
  add column if not exists owner_name text;

create index if not exists kayou_set_targets_set_name_idx
  on public.kayou_set_targets (set_name);

drop trigger if exists kayou_set_targets_set_updated_at on public.kayou_set_targets;

create trigger kayou_set_targets_set_updated_at
before update on public.kayou_set_targets
for each row
execute function public.set_kayou_cards_updated_at();

alter table public.kayou_set_targets enable row level security;

drop policy if exists "Public read kayou set targets" on public.kayou_set_targets;
create policy "Public read kayou set targets"
on public.kayou_set_targets
for select
using (true);

drop policy if exists "Owners insert kayou set targets" on public.kayou_set_targets;
create policy "Owners insert kayou set targets"
on public.kayou_set_targets
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners update kayou set targets" on public.kayou_set_targets;
create policy "Owners update kayou set targets"
on public.kayou_set_targets
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners delete kayou set targets" on public.kayou_set_targets;
create policy "Owners delete kayou set targets"
on public.kayou_set_targets
for delete
to authenticated
using (auth.uid() = owner_user_id);
