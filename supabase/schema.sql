-- ============================================
-- Komment Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Cards table — the core content
create table if not exists cards (
  id uuid default gen_random_uuid() primary key,
  comment_text text not null,
  credit_name text default 'anonymous',
  context_desc text not null,
  screenshot_url text,
  original_link text,
  platform text default 'other',
  vibe text default 'roast',
  views integer default 0,
  shares integer default 0,
  clickthroughs integer default 0,
  report_count integer default 0,
  is_hidden boolean default false,
  short_code varchar(10) unique,
  deletion_token uuid default gen_random_uuid() not null,
  created_at timestamptz default now()
);

-- Reports table — anonymous reports
create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  card_id uuid references cards(id) on delete cascade,
  reason text not null check (reason in ('hate_speech', 'harassment', 'spam', 'not_real')),
  device_hash text,
  created_at timestamptz default now()
);

-- Analytics events — anonymous tracking
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  card_id uuid references cards(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'share', 'click_original', 'report')),
  device_hash text,
  created_at timestamptz default now()
);

-- Indexes for feed queries
create index if not exists idx_cards_created_at on cards(created_at desc);
create index if not exists idx_cards_shares on cards(shares desc);
create index if not exists idx_cards_views on cards(views desc);
create index if not exists idx_cards_hidden on cards(is_hidden);
create index if not exists idx_cards_short_code on cards(short_code);
create index if not exists idx_reports_card_id on reports(card_id);
create index if not exists idx_events_card_id on events(card_id);

-- Row Level Security
alter table cards enable row level security;
alter table reports enable row level security;
alter table events enable row level security;

-- Anyone can read non-hidden cards
create policy "Cards are publicly readable"
  on cards for select
  using (is_hidden = false);

-- Anyone can insert cards (no login required)
create policy "Anyone can create cards"
  on cards for insert
  with check (true);

-- Anyone can update view/share counts
create policy "Anyone can update card stats"
  on cards for update
  using (true)
  with check (true);

-- Anyone can insert reports
create policy "Anyone can report"
  on reports for insert
  with check (true);

-- Anyone can insert events
create policy "Anyone can log events"
  on events for insert
  with check (true);

-- Function to auto-hide cards with 5+ reports
create or replace function check_report_threshold()
returns trigger as $$
begin
  update cards
  set report_count = report_count + 1,
      is_hidden = (report_count + 1 >= 5)
  where id = NEW.card_id;
  return NEW;
end;
$$ language plpgsql;

create trigger on_report_inserted
  after insert on reports
  for each row
  execute function check_report_threshold();

-- Function for trending score (used in queries)
-- Score = (shares * 3 + views) / hours_since_posted
-- Higher = more trending
