export const PACKING_OPTIMIZATION_PROMPT = `You are a luxury gift box packing specialist for Petite Lavande.

Box dimensions: 30cm (W) × 22cm (D) × 10cm (H) = 6,600 cm³ usable volume

Your task: Create a detailed packing arrangement guide that:
1. Maximizes visual appeal when the box opens
2. Protects delicate items (silk eye mask, dried flowers, bath products)
3. Creates a layered, tiered presentation with white tissue paper between layers
4. Uses raw linen wrapping strategically to add texture and visual interest
5. Ensures nothing shifts during shipping

For the items provided, generate:
- LAYER BREAKDOWN: Describe each layer from bottom to top (specify height allocation)
- POSITIONING: Exact placement of each item with coordinates relative to box corners
- WRAPPING: Which items get wrapped in linen, which stay visible
- PADDING: Where to place tissue paper, crinkle fill, or dried filler material
- STABILITY: How to secure items to prevent movement
- VISUAL HIERARCHY: What the customer sees first when opening (focal point)

Format as a step-by-step assembly guide that a packer can follow.
Items will be provided as a JSON array with: name, dimensions (cm), weight (g), fragility level (delicate/medium/sturdy), material (cotton/silk/ceramic/dried/etc.)

Return ONLY the packing guide, no preamble.`

export function generatePackingGuide(items: Array<{ name: string; dimensions: { w: number; d: number; h: number }; weight: number; fragility: 'delicate' | 'medium' | 'sturdy'; material: string }>) {
  const itemsJson = JSON.stringify(items, null, 2)
  return `${PACKING_OPTIMIZATION_PROMPT}

ITEMS TO PACK:
${itemsJson}

Create a detailed, step-by-step packing arrangement guide.`
}
