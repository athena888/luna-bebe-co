import { redirect } from 'next/navigation'

// The social feed now lives on the Story page. Keep this route as a redirect so
// existing links and bookmarks still resolve.
export default function SocialPage() {
  redirect('/story')
}
