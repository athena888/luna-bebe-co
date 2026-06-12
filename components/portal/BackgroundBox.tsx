import { Layers } from 'lucide-react'

// A labeled wrapper that makes it unmistakable which on-page content a given
// background image + colour overlay sits behind. Drop it around the uploader +
// ScrimControl for any section background in the editors.
export function BackgroundBox({ appliesTo, children }: { appliesTo: string; children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-bark-300 bg-cream-50/70 rounded-lg p-3 mb-6">
      <div className="flex items-start gap-2 mb-2.5">
        <Layers size={13} className="text-gold-500 mt-0.5 shrink-0" />
        <p className="font-sans text-[10px] tracking-[0.12em] uppercase text-bark-500 leading-relaxed">
          Section background <span className="normal-case tracking-normal text-bark-400">— shows behind {appliesTo}</span>
        </p>
      </div>
      {children}
    </div>
  )
}
