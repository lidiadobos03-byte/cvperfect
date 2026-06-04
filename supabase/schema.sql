create extension if not exists pgcrypto;

create table if not exists public.cv_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'CV',
  role_name text,
  role_source text,
  role_starter_id integer,
  design_id integer,
  design_key text not null,
  design_name text,
  color text,
  lang text not null default 'ro',
  cv_data jsonb not null,
  photo_data_url text,
  document_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_resumes enable row level security;

drop policy if exists "Users can read own resumes" on public.cv_resumes;
create policy "Users can read own resumes"
  on public.cv_resumes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own resumes" on public.cv_resumes;
create policy "Users can insert own resumes"
  on public.cv_resumes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own resumes" on public.cv_resumes;
create policy "Users can update own resumes"
  on public.cv_resumes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resumes" on public.cv_resumes;
create policy "Users can delete own resumes"
  on public.cv_resumes
  for delete
  using (auth.uid() = user_id);

create table if not exists public.cv_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  resume_id uuid references public.cv_resumes(id) on delete set null,
  stripe_session_id text not null unique,
  document_hash text not null,
  pdf_payload jsonb not null,
  title text not null default 'CV',
  template_name text,
  lang text not null default 'ro',
  customer_email text,
  customer_name text,
  amount_total integer,
  currency text,
  payment_status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_purchases enable row level security;

drop policy if exists "Users can read own purchases" on public.cv_purchases;
create policy "Users can read own purchases"
  on public.cv_purchases
  for select
  using (auth.uid() = user_id);

create index if not exists cv_resumes_user_updated_idx
  on public.cv_resumes (user_id, updated_at desc);

create index if not exists cv_purchases_user_paid_idx
  on public.cv_purchases (user_id, paid_at desc);

create index if not exists cv_purchases_session_idx
  on public.cv_purchases (stripe_session_id);
