'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed top-4 right-4 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-3 rounded-xl hover:bg-bark-700 transition-colors"
    >
      Print
    </button>
  )
}
