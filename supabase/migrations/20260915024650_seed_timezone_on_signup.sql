-- Seed the new profile's timezone from what the browser reported at signup, so
-- the member's analysis allowance resets at their own midnight from the first
-- day rather than at Seoul's until they happen to sign in again.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  insert into public.profiles (id, name, language, country, city, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'language', 'ko'),
    coalesce(new.raw_user_meta_data->>'country', 'Japan'),
    coalesce(new.raw_user_meta_data->>'city', 'Tokyo'),
    coalesce(nullif(new.raw_user_meta_data->>'timezone', ''), 'Asia/Seoul')
  );
  return new;
end;
$function$;
