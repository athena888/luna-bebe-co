import { redirect } from 'next/navigation'

// Press outreach now lives inside Morning Review (Corporate | Press toggle) —
// one tab for all outreach, per Emily 2026-08-15.
export default function PressPage() {
  redirect('/portal/outreach?tab=press')
}
