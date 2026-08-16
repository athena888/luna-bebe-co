import { google } from 'googleapis'

// Gmail sender via Google Workspace domain-wide delegation. The service-account
// JSON lives in env GOOGLE_SA_KEY (a JSON string); it impersonates GMAIL_SENDER
// (a REAL Workspace user — verified to be hello@petitelavande.com; emily@ is not
// a real mailbox and fails with invalid_grant). Server-only.

const SCOPES = ['https://www.googleapis.com/auth/gmail.send']
// Drafts (manual press outreach) use a SEPARATE, narrower grant: compose lets
// us create drafts; press code never imports sendEmail. Requires the scope to
// be added to the service account's domain-wide delegation in Google Admin.
const DRAFT_SCOPES = ['https://www.googleapis.com/auth/gmail.compose']

export function gmailSender(): string {
  return (process.env.GMAIL_SENDER || 'hello@petitelavande.com').trim()
}

function loadServiceAccount(): { client_email: string; private_key: string } {
  const raw = process.env.GOOGLE_SA_KEY
  if (!raw) throw new Error('GOOGLE_SA_KEY is not set')
  let key: { client_email?: string; private_key?: string }
  try { key = JSON.parse(raw) } catch { throw new Error('GOOGLE_SA_KEY is not valid JSON') }
  if (!key.client_email || !key.private_key) throw new Error('GOOGLE_SA_KEY missing client_email/private_key')
  // Tolerate keys stored with literal "\n" (common when pasted into env UIs).
  return { client_email: key.client_email, private_key: key.private_key.replace(/\\n/g, '\n') }
}

function jwtClient(scopes: string[] = SCOPES) {
  const { client_email, private_key } = loadServiceAccount()
  return new google.auth.JWT({ email: client_email, key: private_key, scopes, subject: gmailSender() })
}

function toBase64Url(s: string): string {
  return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Build a minimal RFC 5322 message. Header values are sanitized to a single line
// to prevent header injection from merge fields.
function buildRaw(opts: { from: string; to: string; subject: string; text: string; replyTo?: string }): string {
  const oneLine = (v: string) => v.replace(/[\r\n]+/g, ' ').trim()
  const headers = [
    `From: ${oneLine(opts.from)}`,
    `To: ${oneLine(opts.to)}`,
    `Subject: ${oneLine(opts.subject)}`,
    ...(opts.replyTo ? [`Reply-To: ${oneLine(opts.replyTo)}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
  ]
  return `${headers.join('\r\n')}\r\n\r\n${opts.text.replace(/\r?\n/g, '\r\n')}`
}

export interface SendResult { messageId: string; threadId?: string }

/** Send a plain-text email as GMAIL_SENDER. Returns the Gmail Message-ID. */
export async function sendEmail(opts: { to: string; subject: string; text: string; replyTo?: string }): Promise<SendResult> {
  const from = gmailSender()
  const gmail = google.gmail({ version: 'v1', auth: jwtClient() })
  const raw = toBase64Url(buildRaw({ from, to: opts.to, subject: opts.subject, text: opts.text, replyTo: opts.replyTo }))
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
  return { messageId: res.data.id ?? '', threadId: res.data.threadId ?? undefined }
}

/** True when the sender is configured (key + sender present). */
export function gmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SA_KEY && (process.env.GMAIL_SENDER || true))
}

export interface DraftResult { draftId: string; messageId: string }

/** Create a Gmail DRAFT (never sends) in GMAIL_SENDER's Drafts folder.
 *  Used by the manual press-outreach system — Emily reviews and sends by hand. */
export async function draftEmail(opts: { to: string; subject: string; text: string }): Promise<DraftResult> {
  const from = gmailSender()
  const gmail = google.gmail({ version: 'v1', auth: jwtClient(DRAFT_SCOPES) })
  const raw = toBase64Url(buildRaw({ from, to: opts.to, subject: opts.subject, text: opts.text }))
  const res = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } })
  return { draftId: res.data.id ?? '', messageId: res.data.message?.id ?? '' }
}
