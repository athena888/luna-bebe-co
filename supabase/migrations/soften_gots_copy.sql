-- Remove blanket "GOTS"/"GOTS-certified" wording from existing product copy so
-- the only GOTS claim shown is the scoped, substantiated cotton line the site
-- adds on its own. Turns "100% GOTS Organic Cotton" -> "100% Organic Cotton"
-- and "GOTS-certified cotton" -> "cotton". Safe to re-run.
update products set
  ingredients     = nullif(regexp_replace(regexp_replace(coalesce(ingredients,''),     'GOTS[-\s]?certified\s*', '', 'gi'), '\mGOTS\M\s*', '', 'gi'), ''),
  description      = regexp_replace(regexp_replace(coalesce(description,''),             'GOTS[-\s]?certified\s*', '', 'gi'), '\mGOTS\M\s*', '', 'gi'),
  seo_description  = nullif(regexp_replace(regexp_replace(coalesce(seo_description,''),  'GOTS[-\s]?certified\s*', '', 'gi'), '\mGOTS\M\s*', '', 'gi'), ''),
  seo_title        = nullif(regexp_replace(regexp_replace(coalesce(seo_title,''),        'GOTS[-\s]?certified\s*', '', 'gi'), '\mGOTS\M\s*', '', 'gi'), '')
where ingredients ~* 'GOTS' or description ~* 'GOTS' or seo_description ~* 'GOTS' or seo_title ~* 'GOTS';
