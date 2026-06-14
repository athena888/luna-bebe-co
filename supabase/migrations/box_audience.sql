-- Box-level audience — who the prebuilt box is for. Drives the public grouping
-- (For Baby / For Mama / Baby & Mama Bundle), replacing season-as-the-grouping.
-- Season stays as a per-box label (the `style` column). Defaults to 'bundle'.
alter table prebuilt_boxes add column if not exists audience text not null default 'bundle';
