// Robust JSON extraction from web-search model responses.
//
// A response that used the web_search server tool does NOT come back as one
// clean JSON string, even with a json_schema output format. It arrives as
// several text blocks: running commentary about the searches, then the payload,
// often inside a ```json fence. Joining the blocks and calling JSON.parse fails
// on the prose — intermittently, because the block layout varies per response.
//
// That bug silently returned "no results" for whole batches of enrichment and
// contact discovery. This module is the single place that knows how to dig the
// payload out, so both callers behave identically.

/** Strip a leading ```json / ``` fence and its closing fence, if present. */
function stripFence(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  return m ? m[1] : s
}

/**
 * Scan text for the first balanced JSON value starting at `open`, respecting
 * strings and escapes so a brace inside a quoted URL cannot end the scan early.
 */
function balancedFrom(text: string, startIdx: number, open: '{' | '['): unknown | null {
  const close = open === '{' ? '}' : ']'
  let depth = 0, inStr = false, esc = false
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i]
    if (esc) { esc = false; continue }
    if (inStr) {
      if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === open || (open === '{' && ch === '[') || (open === '[' && ch === '{')) depth++
    else if (ch === close || (open === '{' && ch === ']') || (open === '[' && ch === '}')) {
      depth--
      if (depth === 0) {
        try { return JSON.parse(text.slice(startIdx, i + 1)) } catch { return null }
      }
    }
  }
  return null
}

/**
 * Pull a JSON object out of a model response's text blocks.
 *
 * Searches the LAST block first: the answer follows the searches, so scanning
 * backwards finds the payload before any example JSON quoted mid-explanation.
 * `requiredKey` guards against picking up an unrelated object.
 */
export function extractJsonObject(blocks: string[], requiredKey?: string): Record<string, unknown> | null {
  const candidates: string[] = []
  for (let i = blocks.length - 1; i >= 0; i--) {
    candidates.push(stripFence(blocks[i]), blocks[i])
  }
  // Also try the whole transcript, in case a fence spans two blocks.
  const joined = blocks.join('\n')
  candidates.push(stripFence(joined), joined)

  for (const text of candidates) {
    if (!text) continue
    for (let idx = text.indexOf('{'); idx !== -1; idx = text.indexOf('{', idx + 1)) {
      const parsed = balancedFrom(text, idx, '{')
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>
        if (!requiredKey || requiredKey in obj) return obj
      }
    }
  }
  return null
}

/** Text blocks from an Anthropic message response. */
export function textBlocks(content: Array<{ type: string }>): string[] {
  return content.filter(b => b.type === 'text').map(b => (b as unknown as { text: string }).text)
}
