import { supabaseAdmin } from './supabase.ts'

export type SocialPost = {
  id: string
  media_url: string | null
  embed_url: string | null
  caption: string
}

export async function getActiveSocialPosts(limit = 6): Promise<SocialPost[]> {
  try {
    const { data } = await supabaseAdmin
      .from('social_posts')
      .select('id, media_url, embed_url, caption')
      .eq('active', true)
      .eq('type', 'image')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  } catch {
    return []
  }
}
