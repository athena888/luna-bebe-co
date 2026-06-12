-- Auto-detected placement/styling for the personal message printed on each
-- card style. Stored as JSON: { theme, font: 'serif'|'script',
-- textZone: { x, y, w, align } } where x/y/w are percentages of the card image.
-- The app fills this automatically via Claude vision when a card is uploaded,
-- and falls back to a centered default when absent.
alter table card_styles add column if not exists meta jsonb;
