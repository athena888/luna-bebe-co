import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { resolveLocale, LOCALE_COOKIE } from '@/lib/markets'

// No URL routing: the active locale is resolved per request from the domain,
// the pl_locale cookie, or the Accept-Language header (see lib/markets).
export default getRequestConfig(async () => {
  const [h, c] = await Promise.all([headers(), cookies()])
  const locale = resolveLocale({
    host: h.get('host'),
    cookie: c.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: h.get('accept-language'),
  })
  const messages = (await import(`../messages/${locale}.json`)).default
  return { locale, messages }
})
