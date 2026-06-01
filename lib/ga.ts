import { BetaAnalyticsDataClient } from '@google-analytics/data'

// GA4 Data API. Requires two env vars:
//   GA_PROPERTY_ID         — the numeric GA4 property id (e.g. "493820154"), NOT the G-XXXX measurement id
//   GA_SERVICE_ACCOUNT_JSON — the full service-account JSON key (as a single-line string)
const PROPERTY_ID = process.env.GA_PROPERTY_ID
const SERVICE_ACCOUNT_JSON = process.env.GA_SERVICE_ACCOUNT_JSON

export function isGaConfigured(): boolean {
  return !!PROPERTY_ID && !!SERVICE_ACCOUNT_JSON
}

let client: BetaAnalyticsDataClient | null = null

function getClient(): BetaAnalyticsDataClient {
  if (client) return client
  const creds = JSON.parse(SERVICE_ACCOUNT_JSON as string)
  client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
  })
  return client
}

export interface GaSnapshot {
  activeUsers: number          // right now (last 30 min)
  todayUsers: number           // unique users today
  todayPageViews: number       // page views today
  topPages: Array<{ path: string; views: number }>
}

export async function getRealtimeSnapshot(): Promise<GaSnapshot> {
  const analytics = getClient()
  const property = `properties/${PROPERTY_ID}`

  // Realtime: active users in the last 30 minutes
  const [realtime] = await analytics.runRealtimeReport({
    property,
    metrics: [{ name: 'activeUsers' }],
  })
  const activeUsers = Number(realtime.rows?.[0]?.metricValues?.[0]?.value ?? 0)

  // Today: users + page views
  const [today] = await analytics.runReport({
    property,
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }],
  })
  const todayUsers = Number(today.rows?.[0]?.metricValues?.[0]?.value ?? 0)
  const todayPageViews = Number(today.rows?.[0]?.metricValues?.[1]?.value ?? 0)

  // Today: top pages by views
  const [pages] = await analytics.runReport({
    property,
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 5,
  })
  const topPages = (pages.rows ?? []).map(r => ({
    path: r.dimensionValues?.[0]?.value ?? '/',
    views: Number(r.metricValues?.[0]?.value ?? 0),
  }))

  return { activeUsers, todayUsers, todayPageViews, topPages }
}
