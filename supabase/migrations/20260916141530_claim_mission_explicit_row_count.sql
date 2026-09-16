-- `FOUND` after an INSERT ... ON CONFLICT DO NOTHING is right, but only if
-- nothing between the insert and the test touches it. Reading the row count
-- explicitly does not depend on that reasoning holding as the function grows.
create or replace function public.claim_mission(p_mission_id text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := auth.uid();
  pts int;
  cur_streak int;
  last_day date;
  reward int;
  today date;
  inserted int;
  claimed int;
  active_missions int;
  new_streak int;
  new_day date;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;

  select points, streak, streak_day into pts, cur_streak, last_day
  from public.profiles where id = uid for update;
  if pts is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  select points into reward from public.missions where id = p_mission_id and active;
  if reward is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_mission', 'points', pts, 'streak', cur_streak);
  end if;

  today := private.member_day(uid);

  -- The unique index on (user_id, mission_id, claimed_on) is what actually
  -- stops a double claim; this turns the violation into an answer.
  insert into public.mission_claims (user_id, mission_id, claimed_on, points)
  values (uid, p_mission_id, today, reward)
  on conflict (user_id, mission_id, claimed_on) do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed', 'points', pts, 'streak', cur_streak);
  end if;

  select count(*) into claimed from public.mission_claims
   where user_id = uid and claimed_on = today;
  select count(*) into active_missions from public.missions where active;

  new_streak := cur_streak;
  new_day := last_day;

  -- Clearing the day's last mission advances the streak, once. A day missed
  -- starts it over at one rather than carrying on from where it stopped.
  if claimed >= active_missions and (last_day is null or last_day < today) then
    new_streak := case when last_day = today - 1 then cur_streak + 1 else 1 end;
    new_day := today;
  end if;

  update public.profiles
     set points = pts + reward, streak = new_streak, streak_day = new_day, updated_at = now()
   where id = uid;

  return jsonb_build_object(
    'ok', true, 'points', pts + reward, 'streak', new_streak,
    'earned', reward, 'day', today, 'completedDay', new_day = today
  );
end $$;

revoke all on function public.claim_mission(text) from public, anon;
grant execute on function public.claim_mission(text) to authenticated;
