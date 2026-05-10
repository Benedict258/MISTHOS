create extension if not exists "pgcrypto";

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  invoice_id text not null,
  invoice_address text,
  creator_wallet_address text not null,
  payer_wallet_address text,
  payout_wallet_address text not null,
  client_name text not null,
  client_email text not null,
  company_name text,
  billing_address text,
  title text not null,
  description text,
  currency text default 'USDC',
  subtotal numeric default 0,
  tax numeric default 0,
  discount numeric default 0,
  total numeric default 0,
  issue_date date,
  due_date date,
  payment_terms text,
  status text default 'draft',
  payment_state text default 'not_paid',
  payment_method text,
  tx_signature text,
  explorer_url text,
  receipt_url text,
  receipt_name text,
  receipt_message text,
  payment_reference text,
  footer_note text,
  share_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  paid_at timestamptz,
  verified_at timestamptz,
  settled_at timestamptz
);

-- Optional: create a public Supabase Storage bucket named "receipts".
-- If your project keeps buckets private, keep this table schema and replace
-- client uploads with an Edge Function or backend route that signs URLs.

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_public_id text not null references public.invoices(public_id) on delete cascade,
  item_name text not null,
  quantity numeric default 1,
  unit_price numeric default 0,
  subtotal numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_public_id text not null references public.invoices(public_id) on delete cascade,
  status text not null,
  payment_state text not null,
  note text,
  tx_signature text,
  explorer_url text,
  created_at timestamptz default now()
);

create table if not exists public.dashboard_state (
  id uuid primary key default gen_random_uuid(),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
