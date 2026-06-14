import {
  todayPT, getPlan, getTasks, rollingRate, streak, rateSeries, salesTrend,
  getContentQueue, getRecentAssets,
} from '@/lib/cockpit'
import { getFollowupsDue, getInboxTriage } from '@/lib/outreach'
import { Cockpit } from './Cockpit'

export const dynamic = 'force-dynamic'

export default async function CockpitPage() {
  const date = todayPT()
  const [plan, tasks, rolling, strk, series, sales, content, followups, triage, assets] = await Promise.all([
    getPlan(date),
    getTasks(date),
    rollingRate(7),
    streak(),
    rateSeries(7),
    salesTrend(),
    getContentQueue(date),
    getFollowupsDue(),
    getInboxTriage(25),
    getRecentAssets(8),
  ])

  return (
    <Cockpit
      date={date}
      plan={plan}
      initialTasks={tasks}
      rolling={rolling}
      streak={strk}
      series={series}
      sales={sales}
      initialContent={content}
      initialFollowups={followups}
      triage={triage}
      initialAssets={assets}
    />
  )
}
