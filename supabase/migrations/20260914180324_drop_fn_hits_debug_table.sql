-- The analyze-skin trace table, added to find where a failing request stopped
-- when the edge logs were unreachable. The path is confirmed and the function
-- no longer writes to it, so it is dropped rather than left holding request
-- metadata nobody reads.
drop table if exists public.fn_hits;
