/*
 * The previous revoke did nothing, and the probe caught it.
 *
 * `revoke update (points) ... ` only subtracts from a column-level grant.
 * `authenticated` held UPDATE on the whole table, and Postgres will not carve a
 * column out of a table-wide privilege — so the column stayed writable and a
 * member could still set their own balance to nine hundred million.
 *
 * The grant has to be rebuilt the other way round: take the table, hand back
 * the columns a member is actually allowed to edit. Anything added to
 * `profiles` from now on is unwritable by default, which is the right way for
 * that mistake to land.
 */
revoke update on public.profiles from anon, authenticated;

grant update (
  name, country, city, address, postal_code,
  language, timezone, skin_condition, routine_reminders,
  phone_cc, phone, gender, birth_date, customs_code,
  updated_at
) on public.profiles to authenticated;

-- points, streak and streak_day are deliberately absent, and so is `id`.


/*
 * An operator adjusting someone's balance is legitimate — doing it with a
 * read-modify-write from a browser is not. Same reasoning as the member path:
 * the amount is an argument, the authority is checked here, and the addition
 * happens under a lock rather than against a number the console read earlier.
 */
create or replace function public.grant_points(p_user uuid, p_amount int)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare pts int;
begin
  if not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not_an_operator');
  end if;
  if p_amount is null or abs(p_amount) > 1000000 then
    return jsonb_build_object('ok', false, 'reason', 'out_of_range');
  end if;

  select points into pts from public.profiles where id = p_user for update;
  if pts is null then return jsonb_build_object('ok', false, 'reason', 'no_such_member'); end if;

  -- The floor is here rather than in the console: a balance cannot go negative
  -- whatever a caller asks for.
  update public.profiles set points = greatest(0, pts + p_amount), updated_at = now()
   where id = p_user;

  return jsonb_build_object('ok', true, 'points', greatest(0, pts + p_amount));
end $$;

revoke all on function public.grant_points(uuid, int) from public, anon;
grant execute on function public.grant_points(uuid, int) to authenticated;
