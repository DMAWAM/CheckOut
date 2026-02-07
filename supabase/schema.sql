-- Supabase schema for CheckOut Online-Turniere
create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  email text,
  created_at timestamptz default now()
);

create table if not exists tournaments (
  id uuid primary key,
  name text not null,
  date date,
  mode text not null,
  scope text default 'online',
  status text default 'active',
  created_by uuid references auth.users(id) on delete set null,
  settings jsonb not null,
  created_at timestamptz default now()
);

create table if not exists tournament_players (
  id uuid primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  player_id uuid references auth.users(id) on delete cascade,
  group_index integer,
  created_at timestamptz default now(),
  unique(tournament_id, player_id)
);

create table if not exists tournament_invites (
  id uuid primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  code text unique not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists tournament_matches (
  id uuid primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  phase text not null,
  round integer not null,
  "order" integer not null,
  group_index integer,
  player_a_id uuid references auth.users(id) on delete set null,
  player_b_id uuid references auth.users(id) on delete set null,
  status text default 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  winner_id uuid references auth.users(id) on delete set null
);

create table if not exists tournament_match_results (
  id uuid primary key,
  match_id uuid references tournament_matches(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  stats jsonb not null,
  created_at timestamptz default now(),
  unique(match_id)
);

create table if not exists tournament_match_live (
  match_id uuid primary key references tournament_matches(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists tournament_login_codes (
  id uuid primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  player_id uuid references auth.users(id) on delete cascade,
  code text not null,
  created_at timestamptz default now(),
  unique(tournament_id, player_id)
);

create table if not exists friendships (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  friend_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RPC: join tournament by invite code
create or replace function public.join_tournament_by_code(invite_code text)
returns uuid as $$
declare tid uuid;
begin
  select tournament_id into tid from public.tournament_invites where code = invite_code;
  if tid is null then
    raise exception 'Invalid invite code';
  end if;
  insert into public.tournament_players (id, tournament_id, player_id)
  values (gen_random_uuid(), tid, auth.uid())
  on conflict (tournament_id, player_id) do nothing;
  return tid;
end;
$$ language plpgsql security definer;

-- Helper: membership check without RLS recursion
create or replace function public.is_tournament_member(tid uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.tournament_players tp
    where tp.tournament_id = tid
      and tp.player_id = auth.uid()
  );
$$;

grant execute on function public.is_tournament_member(uuid) to anon, authenticated;

-- Helper: admin check without RLS recursion
create or replace function public.is_tournament_admin(tid uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = tid
      and t.created_by = auth.uid()
  );
$$;

grant execute on function public.is_tournament_admin(uuid) to anon, authenticated;

-- RPC: update tournament status based on matches
create or replace function public.update_tournament_status(tid uuid)
returns text as $$
declare new_status text;
begin
  if not public.is_tournament_member(tid) and not public.is_tournament_admin(tid) then
    raise exception 'Not allowed';
  end if;

  if not exists (select 1 from public.tournament_matches where tournament_id = tid) then
    return (select status from public.tournaments where id = tid);
  end if;

  if exists (
    select 1 from public.tournament_matches
    where tournament_id = tid and status <> 'finished'
  ) then
    new_status := 'active';
  else
    new_status := 'finished';
  end if;

  update public.tournaments set status = new_status where id = tid;
  return new_status;
end;
$$ language plpgsql security definer;

grant execute on function public.update_tournament_status(uuid) to anon, authenticated;

-- RPC: resolve email for username login
create or replace function public.get_email_for_username(username_input text)
returns text as $$
declare result text;
begin
  select email into result
  from public.profiles
  where lower(username) = lower(username_input)
  limit 1;
  return result;
end;
$$ language plpgsql security definer;

grant execute on function public.get_email_for_username(text) to anon, authenticated;

-- Enable RLS
alter table profiles enable row level security;
alter table tournaments enable row level security;
alter table tournament_players enable row level security;
alter table tournament_invites enable row level security;
alter table tournament_matches enable row level security;
alter table tournament_match_results enable row level security;
alter table tournament_match_live enable row level security;
alter table tournament_login_codes enable row level security;
alter table friendships enable row level security;

-- Profiles: readable by authenticated users, writable by owner
create policy "profiles_read" on profiles for select
to authenticated using (true);
create policy "profiles_insert" on profiles for insert
to authenticated with check (auth.uid() = id);
create policy "profiles_update" on profiles for update
to authenticated using (auth.uid() = id);

-- Tournaments: visible to participants or creator
drop policy if exists "tournaments_read" on tournaments;
create policy "tournaments_read" on tournaments for select
to authenticated using (
  created_by = auth.uid()
  or public.is_tournament_member(tournaments.id)
);
create policy "tournaments_insert" on tournaments for insert
to authenticated with check (created_by = auth.uid());
create policy "tournaments_update" on tournaments for update
to authenticated using (created_by = auth.uid());
create policy "tournaments_delete" on tournaments for delete
to authenticated using (created_by = auth.uid());

-- Tournament players: readable by members; insert via RPC only
drop policy if exists "tournament_players_read" on tournament_players;
create policy "tournament_players_read" on tournament_players for select
to authenticated using (
  auth.uid() = player_id
  or public.is_tournament_admin(tournament_players.tournament_id)
  or public.is_tournament_member(tournament_players.tournament_id)
);
drop policy if exists "tournament_players_update" on tournament_players;
create policy "tournament_players_update" on tournament_players for update
to authenticated using (
  public.is_tournament_admin(tournament_players.tournament_id)
)
with check (
  public.is_tournament_admin(tournament_players.tournament_id)
);
create policy "tournament_players_insert_admin" on tournament_players for insert
to authenticated with check (
  exists (
    select 1 from tournaments t
    where t.id = tournament_players.tournament_id
    and t.created_by = auth.uid()
  )
);

-- Invites: only creator can manage
create policy "invites_read" on tournament_invites for select
to authenticated using (
  exists (
    select 1 from tournaments t
    where t.id = tournament_invites.tournament_id
    and t.created_by = auth.uid()
  )
);
create policy "invites_insert" on tournament_invites for insert
to authenticated with check (
  exists (
    select 1 from tournaments t
    where t.id = tournament_invites.tournament_id
    and t.created_by = auth.uid()
  )
);

-- Matches: readable by participants; update by participants or creator
drop policy if exists "matches_read" on tournament_matches;
create policy "matches_read" on tournament_matches for select
to authenticated using (
  public.is_tournament_member(tournament_matches.tournament_id)
  or public.is_tournament_admin(tournament_matches.tournament_id)
);
create policy "matches_update" on tournament_matches for update
to authenticated using (
  public.is_tournament_admin(tournament_matches.tournament_id)
  or tournament_matches.player_a_id = auth.uid()
  or tournament_matches.player_b_id = auth.uid()
);
create policy "matches_insert" on tournament_matches for insert
to authenticated with check (
  public.is_tournament_admin(tournament_matches.tournament_id)
);

-- Match results: readable by participants; insert/update by participants or creator
drop policy if exists "results_read" on tournament_match_results;
create policy "results_read" on tournament_match_results for select
to authenticated using (
  public.is_tournament_member(tournament_match_results.tournament_id)
  or public.is_tournament_admin(tournament_match_results.tournament_id)
);
create policy "results_insert" on tournament_match_results for insert
to authenticated with check (
  exists (
    select 1 from tournaments t
    where t.id = tournament_match_results.tournament_id
    and t.created_by = auth.uid()
  )
  or exists (
    select 1 from tournament_matches m
    where m.id = tournament_match_results.match_id
    and (m.player_a_id = auth.uid() or m.player_b_id = auth.uid())
  )
);
create policy "results_update" on tournament_match_results for update
to authenticated using (
  exists (
    select 1 from tournaments t
    where t.id = tournament_match_results.tournament_id
    and t.created_by = auth.uid()
  )
  or exists (
    select 1 from tournament_matches m
    where m.id = tournament_match_results.match_id
    and (m.player_a_id = auth.uid() or m.player_b_id = auth.uid())
  )
);

create policy "live_read" on tournament_match_live for select
to authenticated using (
  public.is_tournament_member(tournament_match_live.tournament_id)
  or public.is_tournament_admin(tournament_match_live.tournament_id)
);
create policy "live_insert" on tournament_match_live for insert
to authenticated with check (
  public.is_tournament_admin(tournament_match_live.tournament_id)
  or exists (
    select 1 from tournament_matches m
    where m.id = tournament_match_live.match_id
    and (m.player_a_id = auth.uid() or m.player_b_id = auth.uid())
  )
);
create policy "live_update" on tournament_match_live for update
to authenticated using (
  public.is_tournament_admin(tournament_match_live.tournament_id)
  or exists (
    select 1 from tournament_matches m
    where m.id = tournament_match_live.match_id
    and (m.player_a_id = auth.uid() or m.player_b_id = auth.uid())
  )
);
create policy "live_delete" on tournament_match_live for delete
to authenticated using (
  public.is_tournament_admin(tournament_match_live.tournament_id)
  or exists (
    select 1 from tournament_matches m
    where m.id = tournament_match_live.match_id
    and (m.player_a_id = auth.uid() or m.player_b_id = auth.uid())
  )
);

-- Login codes: only admin can read/manage
create policy "login_codes_read" on tournament_login_codes for select
to authenticated using (
  public.is_tournament_admin(tournament_login_codes.tournament_id)
);
create policy "login_codes_insert" on tournament_login_codes for insert
to authenticated with check (
  public.is_tournament_admin(tournament_login_codes.tournament_id)
);

create policy "friends_select" on friendships for select
to authenticated using (user_id = auth.uid());

create policy "friends_insert" on friendships for insert
to authenticated with check (
  user_id = auth.uid()
  and friend_id <> auth.uid()
);

create policy "friends_delete" on friendships for delete
to authenticated using (user_id = auth.uid());

create or replace function public.get_friend_stats()
returns table(
  player_id uuid,
  username text,
  display_name text,
  total_points numeric,
  total_darts numeric,
  checkout_attempts numeric,
  checkout_hits numeric,
  double_darts numeric,
  count_100_plus numeric,
  count_140_plus numeric,
  count_180 numeric,
  highest_checkout numeric
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select
    stats.player_id,
    p.username,
    p.display_name,
    sum(stats.total_points)::numeric as total_points,
    sum(stats.total_darts)::numeric as total_darts,
    sum(stats.checkout_attempts)::numeric as checkout_attempts,
    sum(stats.checkout_hits)::numeric as checkout_hits,
    sum(stats.double_darts)::numeric as double_darts,
    sum(stats.count_100_plus)::numeric as count_100_plus,
    sum(stats.count_140_plus)::numeric as count_140_plus,
    sum(stats.count_180)::numeric as count_180,
    max(stats.highest_checkout)::numeric as highest_checkout
  from friendships f
  join lateral (
    select
      (stat->>'playerId')::uuid as player_id,
      coalesce((stat->>'totalPoints')::numeric, 0) as total_points,
      coalesce((stat->>'totalDarts')::numeric, 0) as total_darts,
      coalesce((stat->>'checkoutAttempts')::numeric, 0) as checkout_attempts,
      coalesce((stat->>'checkoutHits')::numeric, 0) as checkout_hits,
      coalesce((stat->>'doubleDarts')::numeric, 0) as double_darts,
      coalesce((stat->>'count100Plus')::numeric, 0) as count_100_plus,
      coalesce((stat->>'count140Plus')::numeric, 0) as count_140_plus,
      coalesce((stat->>'count180')::numeric, 0) as count_180,
      coalesce((stat->>'highestCheckout')::numeric, 0) as highest_checkout
    from tournament_match_results tmr,
      jsonb_array_elements(tmr.stats) stat
    where (stat->>'playerId')::uuid = f.friend_id
  ) stats on true
  join profiles p on p.id = stats.player_id
  where f.user_id = auth.uid()
  group by stats.player_id, p.username, p.display_name;
$$;

grant execute on function public.get_friend_stats() to authenticated;
