-- Migration: Add rich personality fields to ancestors table.
-- These fields enable dramatically more authentic AI conversations.

alter table public.ancestors add column if not exists occupation text;
alter table public.ancestors add column if not exists education text;
alter table public.ancestors add column if not exists spouse_name text;
alter table public.ancestors add column if not exists children_names text[];
alter table public.ancestors add column if not exists siblings_names text[];
alter table public.ancestors add column if not exists home_description text;
alter table public.ancestors add column if not exists signature_phrases text[];
alter table public.ancestors add column if not exists fears_and_regrets text;
alter table public.ancestors add column if not exists proudest_moments text;
alter table public.ancestors add column if not exists daily_routines text;
alter table public.ancestors add column if not exists food_preferences text;
alter table public.ancestors add column if not exists political_views text;
alter table public.ancestors add column if not exists religious_practices text;
alter table public.ancestors add column if not exists sense_of_humor text;
alter table public.ancestors add column if not exists relationship_with_money text;
alter table public.ancestors add column if not exists advice_they_always_gave text;
alter table public.ancestors add column if not exists topics_they_avoided text;
alter table public.ancestors add column if not exists physical_mannerisms text;
alter table public.ancestors add column if not exists nicknames_they_used_for_others text;
