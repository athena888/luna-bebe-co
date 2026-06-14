// Crisp REST API helpers — used by the Claude↔Crisp bridge to read a
// conversation, check whether a human operator is available, and post an AI
// reply when no one is online. Auth is a Crisp plugin token (identifier:key) via
// Basic auth + the plugin tier header. Server-only.

const API = 'https://api.crisp.chat/v1'

export function crispWebsiteId(): string {
  return process.env.CRISP_WEBSITE_ID || process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || 'f0c4d489-7469-4696-916e-9a8c94a8fea6'
}

export function crispConfigured(): boolean {
  return Boolean(process.env.CRISP_IDENTIFIER && process.env.CRISP_KEY)
}

function authHeaders(): Record<string, string> {
  const id = process.env.CRISP_IDENTIFIER ?? ''
  const key = process.env.CRISP_KEY ?? ''
  return {
    Authorization: `Basic ${Buffer.from(`${id}:${key}`).toString('base64')}`,
    'X-Crisp-Tier': 'plugin',
    'Content-Type': 'application/json',
  }
}

async function crispFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } })
  if (!res.ok) throw new Error(`Crisp ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json()
}

/** 'online' when at least one operator is available; 'away' otherwise. */
export async function getAvailability(): Promise<'online' | 'away'> {
  try {
    const d = await crispFetch(`/website/${crispWebsiteId()}/availability/status`)
    return d?.data?.status === 'online' ? 'online' : 'away'
  } catch {
    return 'away' // fail open — let the AI help rather than leave them hanging
  }
}

export interface CrispMsg { from: 'user' | 'operator'; content: string }

/** Recent text messages in a conversation, oldest→newest, for AI context. */
export async function getConversationMessages(sessionId: string, limit = 12): Promise<CrispMsg[]> {
  try {
    const d = await crispFetch(`/website/${crispWebsiteId()}/conversation/${sessionId}/messages`)
    const rows = Array.isArray(d?.data) ? d.data : []
    return rows
      .filter((m: { type?: string }) => m.type === 'text')
      .map((m: { from?: string; content?: unknown }) => ({
        from: m.from === 'operator' ? 'operator' : 'user',
        content: typeof m.content === 'string' ? m.content : '',
      }))
      .filter((m: CrispMsg) => m.content)
      .slice(-limit)
  } catch {
    return []
  }
}

/** Post an operator (AI) text message into a conversation. */
export async function sendMessage(sessionId: string, text: string): Promise<void> {
  await crispFetch(`/website/${crispWebsiteId()}/conversation/${sessionId}/message`, {
    method: 'POST',
    body: JSON.stringify({ type: 'text', from: 'operator', origin: 'chat', content: text }),
  })
}
