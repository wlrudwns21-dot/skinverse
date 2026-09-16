-- Give a claimed analysis slot back.
--
-- Perfect Corp only consumes units when a task succeeds: "If the engine fails
-- to process the task, the task's status will change to 'error' and no unit
-- will be consumed." So a photo they reject costs the operator nothing, and
-- charging the caller one of their daily calls for it is simply wrong — most
-- of all for a guest, whose single daily trial would be spent on a photo that
-- was never analysed.
--
-- Floors at zero so a double release can never hand out free calls.
create or replace function private.release_analysis_call(p_subject text)
returns void
language sql
security definer
set search_path to 'public', 'private'
as $$
  update public.analysis_usage
     set count = greatest(count - 1, 0), updated_at = now()
   where subject = p_subject and day = current_date;
$$;

-- Same posture as the rest of private: reachable by the service role from the
-- edge function, never from a browser via /rest/v1/rpc/.
revoke execute on function private.release_analysis_call(text) from public, anon, authenticated;
