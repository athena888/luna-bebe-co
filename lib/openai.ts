import OpenAI from 'openai'

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export function buildBoxPreviewPrompt(itemNames: string[]): string {
  return buildBoxStylePrompts(itemNames)[0]
}

export function buildBoxStylePrompts(itemNames: string[]): [string, string, string] {
  const items = itemNames.join(', ')
  return [
    // Style A — aerial flat lay on linen
    `A luxury organic baby gift box flat lay on warm cream linen fabric. The open box contains ${items}. Soft natural window light from the left, dried lavender sprigs and a folded cream satin ribbon rest beside the box. Minimalist editorial photography, aerial top-down view, warm neutral tones, shallow depth of field, no text, no logos, no people. Style: high-end lifestyle product photography.`,
    // Style B — items nestled inside open gift box
    `An elegant open luxury gift box lined with ivory tissue paper, containing ${items} beautifully arranged inside. A wax seal rests on the lid beside the box. Warm candlelight ambiance, 45-degree angle shot, soft shadow, no text, no logos, no people. Style: premium unboxing photography, warm cream and gold palette.`,
    // Style C — styled flat lay on marble with botanicals
    `A curated luxury baby gift flat lay arranged on a white marble surface: ${items}. Surrounded by fresh eucalyptus sprigs, a small ivory candle, and a gold ribbon bow. Bright airy natural light, overhead perspective, clean minimalist composition, no text, no logos, no people. Style: editorial gift styling photography.`,
  ]
}
