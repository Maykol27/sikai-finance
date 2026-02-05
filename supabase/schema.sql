-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Users table reference (public profile)
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  name text not null,
  type text check (type in ('income', 'expense', 'savings')) not null,
  parent_id uuid references public.categories(id) on delete cascade,
  color text,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Budgets
create table if not exists public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  category_id uuid references public.categories(id),
  amount numeric not null,
  period text default 'monthly',
  year integer,
  month integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  category_id uuid references public.categories(id),
  amount numeric not null,
  date date not null,
  note text,
  is_recurring boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;

-- Policies for Users
create policy "Users can view their own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

-- Categories
create policy "Users can view own categories" on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on public.categories for delete using (auth.uid() = user_id);

-- Budgets
create policy "Users can view own budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on public.budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets" on public.budgets for delete using (auth.uid() = user_id);

-- Transactions
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- Trigger for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger check (drop if exists to avoid error on rerun)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
