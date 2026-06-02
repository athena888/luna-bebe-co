import { supabaseAdmin } from './supabase'

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Persistent, Postgres-backed rate limit. Returns true when the request is
 * ALLOWED, false when the limit is exceeded.
 *
 * Fails OPEN: if the rate-limit table/RPC isn't available (e.g. migration not
 * applied yet) or Supabase errors, it allows the request rather than breaking
 * the site. Apply supabase/migrations/rate_limits.sql to activate enforcement.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) return true        // fail open
    return data !== false
  } catch {
    return true                   // fail open
  }
}

/** Convenience: rate limit a request by IP under a named bucket. */
export async function rateLimitByIp(req: Request, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  return rateLimit(`${bucket}:${clientIp(req)}`, limit, windowSeconds)
}
