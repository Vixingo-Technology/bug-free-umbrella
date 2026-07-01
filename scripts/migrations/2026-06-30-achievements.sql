-- Achievement gamification system.
-- Catalog rows (achievements) are kept in sync with lib/achievements/catalog.ts
-- via slug. MemberAchievement rows record unlocks. Auto-unlocks fire from the
-- evaluation engine (lib/achievements/evaluate.ts) on attendance/grading/event
-- writes; MANUAL-rule rows are awarded by dojo staff from the attendance page.

-- 1. Enums ──────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'AchievementTier') then
    create type "AchievementTier" as enum ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');
  end if;
  if not exists (select 1 from pg_type where typname = 'AchievementRule') then
    create type "AchievementRule" as enum (
      'MANUAL',
      'ATTENDANCE_COUNT',
      'CONSECUTIVE_ATTENDANCE',
      'GRADINGS_PASSED',
      'EVENTS_ATTENDED',
      'TOURNAMENTS_PARTICIPATED',
      'TOURNAMENT_WINS',
      'CERTIFICATES_EARNED'
    );
  end if;
end $$;

-- 2. Catalog table ──────────────────────────────────────────────────────────
create table if not exists public.achievements (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  name_bn         text,
  description     text not null,
  description_bn  text,
  icon            text not null,
  tier            "AchievementTier" not null default 'COMMON',
  rule            "AchievementRule" not null default 'MANUAL',
  threshold       integer,
  order_index     integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists achievements_tier_order_idx
  on public.achievements (tier, order_index);

-- 3. Join table ─────────────────────────────────────────────────────────────
create table if not exists public.member_achievements (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members(id) on delete cascade,
  achievement_id  uuid not null references public.achievements(id) on delete cascade,
  unlocked_at     timestamptz not null default now(),
  progress        integer not null default 0,
  awarded_by_id   uuid references public.members(id) on delete set null,
  note            text,
  unique (member_id, achievement_id)
);

create index if not exists member_achievements_member_idx
  on public.member_achievements (member_id);
create index if not exists member_achievements_achievement_idx
  on public.member_achievements (achievement_id);

-- 4. Row-level security ─────────────────────────────────────────────────────
alter table public.achievements enable row level security;
alter table public.member_achievements enable row level security;

-- Catalog is publicly readable (locked + unlocked badges shown on every portal).
drop policy if exists "achievements_public_read" on public.achievements;
create policy "achievements_public_read"
  on public.achievements for select
  using (true);

-- Member achievements are publicly readable (they appear on public profiles
-- and dojo branch pages). Writes are restricted to the service role + the
-- attendance/grading server actions, which use the service role connection.
drop policy if exists "member_achievements_public_read" on public.member_achievements;
create policy "member_achievements_public_read"
  on public.member_achievements for select
  using (true);

-- 5. Seed catalog ───────────────────────────────────────────────────────────
-- ON CONFLICT (slug) keeps the row idempotent so reapplying the migration
-- or editing copy in lib/achievements/catalog.ts and re-running keeps DB
-- in sync with the source of truth.
insert into public.achievements
  (slug, name, name_bn, description, description_bn, icon, tier, rule, threshold, order_index)
values
  -- ── COMMON (attendance ladder + first steps) ──────────────────────────
  ('first-class',         'First Class',          'প্রথম ক্লাস',          'Show up for your very first training session.',                  'প্রথম ট্রেনিং সেশনে উপস্থিত হোন।',                    'Sparkles',     'COMMON',    'ATTENDANCE_COUNT',         1,   10),
  ('ten-classes',         'Diligent Beginner',    'অধ্যবসায়ী শুরু',        'Attend ten training sessions.',                                  'দশটি ট্রেনিং সেশনে উপস্থিত হোন।',                     'Footprints',   'COMMON',    'ATTENDANCE_COUNT',        10,   20),
  ('fifty-classes',       'Half-Century',         'অর্ধশত',              'Fifty training sessions logged. The habit is forming.',          'পঞ্চাশটি সেশন সম্পন্ন। অভ্যাস গড়ে উঠছে।',             'Calendar',     'COMMON',    'ATTENDANCE_COUNT',        50,   30),
  ('first-belt',          'First Belt',           'প্রথম বেল্ট',           'Pass your first grading.',                                       'আপনার প্রথম গ্রেডিং পাস করুন।',                       'Award',        'COMMON',    'GRADINGS_PASSED',          1,   40),
  ('first-event',         'Event Attendee',       'ইভেন্টে উপস্থিত',         'Attend your first JKA event or seminar.',                        'প্রথম JKA ইভেন্ট বা সেমিনারে অংশ নিন।',               'CalendarCheck','COMMON',    'EVENTS_ATTENDED',          1,   50),

  -- ── RARE (regular commitment, multi-grading, certificates) ───────────
  ('hundred-classes',     'Century Student',      'শতাব্দীর ছাত্র',          'One hundred training sessions. Discipline made visible.',         'একশটি সেশন সম্পন্ন। দৃশ্যমান শৃঙ্খলা।',                'Flame',        'RARE',      'ATTENDANCE_COUNT',       100,   60),
  ('week-streak',         'Iron Week',            'লৌহ সপ্তাহ',            'Attend five consecutive training days.',                          'টানা পাঁচ দিন ট্রেনিংয়ে উপস্থিত হোন।',                  'Zap',          'RARE',      'CONSECUTIVE_ATTENDANCE',   5,   70),
  ('three-belts',         'Triple Rank',          'তিন বেল্ট',              'Pass three gradings.',                                            'তিনটি গ্রেডিং পাস করুন।',                              'Medal',        'RARE',      'GRADINGS_PASSED',          3,   80),
  ('first-certificate',   'Certified',            'সার্টিফাইড',            'Earn your first printed JKA certificate.',                        'প্রথম মুদ্রিত JKA সার্টিফিকেট অর্জন করুন।',             'FileCheck',    'RARE',      'CERTIFICATES_EARNED',      1,   90),
  ('first-tournament',    'Competitor',           'প্রতিযোগী',             'Register for your first tournament.',                             'প্রথম টুর্নামেন্টে নিবন্ধন করুন।',                       'Swords',       'RARE',      'TOURNAMENTS_PARTICIPATED', 1,  100),

  -- ── EPIC (long-term dedication, multi-tournament, manual recognitions)
  ('250-classes',         'Devoted Karateka',     'নিবেদিত কারাতেকা',       'Two hundred and fifty training sessions.',                        'আড়াইশ ট্রেনিং সেশন সম্পন্ন।',                         'Mountain',     'EPIC',      'ATTENDANCE_COUNT',       250,  110),
  ('month-streak',        'Unbreakable Month',    'অটল মাস',              'Twenty consecutive training days.',                              'টানা বিশ দিন ট্রেনিংয়ে উপস্থিত হোন।',                  'Flame',        'EPIC',      'CONSECUTIVE_ATTENDANCE',  20,  120),
  ('five-belts',          'Five Belt Climb',      'পাঁচ বেল্ট আরোহণ',        'Pass five gradings.',                                             'পাঁচটি গ্রেডিং পাস করুন।',                             'TrendingUp',   'EPIC',      'GRADINGS_PASSED',          5,  130),
  ('tournament-victor',   'Tournament Victor',    'টুর্নামেন্ট বিজয়ী',         'Win your first tournament match.',                                'প্রথম টুর্নামেন্ট ম্যাচ জয় করুন।',                       'Trophy',       'EPIC',      'TOURNAMENT_WINS',          1,  140),
  ('kata-spirit',         'Kata Spirit',          'কাটা আত্মা',             'Awarded by your dojo for exceptional kata performance.',         'অসাধারণ কাটা পরিবেশনার জন্য আপনার ডোজো কর্তৃক প্রদত্ত।', 'Sparkles',     'EPIC',      'MANUAL',                NULL,  150),

  -- ── LEGENDARY (rare, glowing) ─────────────────────────────────────────
  ('500-classes',         'Master of Habit',      'অভ্যাসের গুরু',          'Five hundred training sessions. A lifetime of practice.',         'পাঁচশ ট্রেনিং সেশন। সাধনার এক জীবন।',                  'Crown',        'LEGENDARY', 'ATTENDANCE_COUNT',       500,  160),
  ('tournament-champion', 'Tournament Champion',  'টুর্নামেন্ট চ্যাম্পিয়ন',     'Win five tournament matches.',                                    'পাঁচটি টুর্নামেন্ট ম্যাচ জয় করুন।',                      'Trophy',       'LEGENDARY', 'TOURNAMENT_WINS',          5,  170),
  ('dojo-pride',          'Pride of the Dojo',    'ডোজোর গর্ব',             'Awarded by the dojo head for outstanding character and discipline.','অসাধারণ চরিত্র ও শৃঙ্খলার জন্য ডোজো প্রধান কর্তৃক প্রদত্ত।','Star',        'LEGENDARY', 'MANUAL',                NULL,  180)
on conflict (slug) do update set
  name           = excluded.name,
  name_bn        = excluded.name_bn,
  description    = excluded.description,
  description_bn = excluded.description_bn,
  icon           = excluded.icon,
  tier           = excluded.tier,
  rule           = excluded.rule,
  threshold      = excluded.threshold,
  order_index    = excluded.order_index,
  updated_at     = now();
