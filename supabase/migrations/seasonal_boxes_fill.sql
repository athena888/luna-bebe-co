-- Pre-fill the new All Season + Winter boxes by copying the Summer box of the
-- same variant (neutral/boy/girl) as a starting point. Only fills boxes that
-- are still empty, so it never overwrites slots you've already set. Re-runnable.
update prebuilt_boxes t
set selection = (
  select s.selection
  from prebuilt_boxes s
  where s.style = 'Summer'
    and s.variant = t.variant
    and s.selection is not null
    and s.selection <> '{}'::jsonb
  order by s.sort_order
  limit 1
)
where t.style in ('All Season', 'Winter')
  and (t.selection is null or t.selection = '{}'::jsonb)
  and exists (
    select 1 from prebuilt_boxes s
    where s.style = 'Summer' and s.variant = t.variant
      and s.selection is not null and s.selection <> '{}'::jsonb
  );
