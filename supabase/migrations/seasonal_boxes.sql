-- New "All Season" and "Winter" prebuilt-box editions, named in the same
-- aesthetic as the Summer edition. They start HIDDEN (active=false) with empty
-- product slots — fill the slots in the portal, then toggle "Show" to publish.
-- ON CONFLICT DO NOTHING so re-running never overwrites your edits.
insert into prebuilt_boxes (slug, name, style, variant, tagline, description, aesthetic, featured, image, custom_price, sort_order, active, selection)
values
  -- All Season edition
  ('toujours',        'Toujours',         'All Season', 'neutral',
   'The essentials she''ll reach for in every season, chosen with care.',
   'Timeless everyday pieces — soft layers, gentle skincare, and keepsakes that suit any time of year.',
   'Cream · Timeless · Everyday', false, null, null, 10, false, '{}'::jsonb),
  ('petit-nuage',     'Petit Nuage',      'All Season', 'boy',
   'Soft, easy comfort for him, whatever the season brings.',
   'Light, breathable layers and calming botanicals for an easy, all-season welcome.',
   'Mist · Gentle · Enduring', false, null, null, 11, false, '{}'::jsonb),
  ('fleur-eternelle', 'Fleur Éternelle',  'All Season', 'girl',
   'Tender and timeless, blooming softly through every season.',
   'Delicate everyday pieces and gentle keepsakes that stay beautiful all year through.',
   'Petal · Timeless · Soft', false, null, null, 12, false, '{}'::jsonb),
  -- Winter edition
  ('nuit-douce',      'Nuit Douce',       'Winter', 'neutral',
   'Warmth gathered close on the longest, quietest nights.',
   'Cocooning layers, warming rituals, and soft keepsakes for the gentlest winter beginning.',
   'Oat · Warm · Cocooning', false, null, null, 20, false, '{}'::jsonb),
  ('ciel-dhiver',     'Ciel d''Hiver',    'Winter', 'boy',
   'First snow and slate-blue calm for his gentlest beginning.',
   'Cozy knits, soothing botanicals, and keepsakes to treasure through his first winter.',
   'Slate · Cozy · Still', false, null, null, 21, false, '{}'::jsonb),
  ('rose-dhiver',     'Rose d''Hiver',    'Winter', 'girl',
   'Blush and wool-soft warmth for her first winter''s hush.',
   'Tender warm layers, gentle care, and soft keepsakes to welcome her in the cold months.',
   'Blush · Warm · Tender', false, null, null, 22, false, '{}'::jsonb)
on conflict (slug) do nothing;
