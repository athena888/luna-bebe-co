// Types for the CommonJS Cricut card writer so portal routes can import it.
export interface CardOrder { id: string; recipient: string; message: string }
export interface MatManifestRow {
  mat: number; slot: number; row: number; col: number
  xMm: number; yMm: number; id: string; recipient: string; emMm: number; lines: number
}
export const CFG: {
  cols: number; rows: number; cardW: number; cardH: number
  strokeMm: number; font: string; matMm: number
}
export function renderCard(order: CardOrder, ox: number, oy: number): { paths: string[]; emMm: number; lineCount: number }
export function buildMatSVG(orders: CardOrder[], matIndex: number): { svg: string; manifest: MatManifestRow[] }
export function hasUnrenderable(text: string): string | null
