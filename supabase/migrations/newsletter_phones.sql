-- Optional phone numbers captured by the footer newsletter signup.
-- Resend contacts have no phone field, so we keep them here.
create table if not exists public.newsletter_phones (
  email      text primary key,
  phone      text not null,
  created_at timestamptz not null default now()
);
alter table public.newsletter_phones enable row level security;
drop policy if exists newsletter_phones_service on public.newsletter_phones;
create policy newsletter_phones_service on public.newsletter_phones for all to service_role using (true) with check (true);
