-- ── the member's own day ────────────────────────────────────────────────────
-- A mission is claimable once a day, so which day it is decides whether a
-- claim mints points twice. The browser must not answer that question: a
-- device clock set forward is a free second claim. This reads the timezone the
-- member's profile carries, exactly as the analysis quota already does.
create or replace function private.member_day(p_user uuid)
returns date language sql stable security definer set search_path = public, private as $$
  select ((now() at time zone
           case when exists (select 1 from pg_timezone_names n where n.name = p.timezone)
                then p.timezone else 'Asia/Seoul' end))::date
  from public.profiles p where p.id = p_user
$$;

-- Exposed so the app can ask which day the server thinks it is, rather than
-- filtering today's claims by the device clock and disagreeing with the rows.
create or replace function public.my_day()
returns date language sql stable security definer set search_path = public, private as $$
  select private.member_day(auth.uid())
$$;

revoke all on function public.my_day() from public, anon;
grant execute on function public.my_day() to authenticated;


-- ── claiming a mission ──────────────────────────────────────────────────────
/*
 * The client says which mission. It does not say how many points that is
 * worth — the missions table does, and it is read here.
 *
 * Everything happens under one lock on the member's profile row, so two taps
 * racing each other cannot both read the old balance and both add to it.
 */
create or replace function public.claim_mission(p_mission_id text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := auth.uid();
  pts int;
  cur_streak int;
  last_day date;
  reward int;
  today date;
  claimed int;
  active_missions int;
  new_streak int;
  new_day date;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;

  select points, streak, streak_day into pts, cur_streak, last_day
  from public.profiles where id = uid for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

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

  if not found then
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


-- ── spending points on a reward ─────────────────────────────────────────────
/*
 * Same shape, opposite direction: the cost comes from the rewards table, the
 * balance is checked under the lock, and the stock is decremented in the same
 * statement that claims it so two members cannot take the last one.
 */
create or replace function public.redeem_reward(p_reward_id text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := auth.uid();
  pts int;
  cost_pts int;
  left_in_stock int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;

  select points into pts from public.profiles where id = uid for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  select cost into cost_pts from public.rewards where id = p_reward_id and active;
  if cost_pts is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_reward', 'points', pts);
  end if;

  if exists (select 1 from public.redemptions where user_id = uid and reward_id = p_reward_id) then
    return jsonb_build_object('ok', false, 'reason', 'already_redeemed', 'points', pts);
  end if;

  if pts < cost_pts then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_points', 'points', pts);
  end if;

  update public.rewards set stock = stock - 1
   where id = p_reward_id and stock > 0
  returning stock into left_in_stock;
  if left_in_stock is null then
    return jsonb_build_object('ok', false, 'reason', 'out_of_stock', 'points', pts);
  end if;

  insert into public.redemptions (user_id, reward_id, cost) values (uid, p_reward_id, cost_pts);

  update public.profiles set points = pts - cost_pts, updated_at = now() where id = uid;

  return jsonb_build_object('ok', true, 'points', pts - cost_pts, 'spent', cost_pts);
end $$;

revoke all on function public.redeem_reward(text) from public, anon;
grant execute on function public.redeem_reward(text) to authenticated;


-- ── and now the browser loses the pen ───────────────────────────────────────
-- The two functions above are the only way points move. This is what makes
-- that true rather than merely intended.
revoke update (points, streak, streak_day) on public.profiles from anon, authenticated;
