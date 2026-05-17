-- ==============================================================================
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Create the media_items table
create table public.media_items (
  id uuid default gen_random_uuid() primary key,
  location_id text not null, -- foreign key to muvmap's locations table if applicable
  title text not null,
  image_url text not null,
  public_id text, -- cloudinary public_id for easy deletion
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Set up Row Level Security (RLS)
alter table public.media_items enable row level security;

-- 3. Create policy to allow public read access
create policy "Allow public read access"
  on public.media_items
  for select
  using (true);

-- 4. Create policy to allow insert for all 
-- (For a real production app, restrict this to authenticated users)
create policy "Allow insert for all"
  on public.media_items
  for insert
  with check (true);

-- 5. Create policy to allow delete for all
create policy "Allow delete for all"
  on public.media_items
  for delete
  using (true);
