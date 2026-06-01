'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CsvImporter, type CsvRow } from '@/components/ui/CsvImporter'
import { ArrowLeft, Loader, Check, AlertCircle } from 'lucide-react'

export default function BulkImportPage() {
  const router = useRouter()
  const [rows, setRows] = useState<CsvRow[]>([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ saved: string[]; errors: Array<{ id: string; reason: string }> } | null>(null)

  async function handleSave() {
    if (rows.length === 0) return

    setSaving(true)
    try {
      const res = await fetch('/api/portal/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: rows }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      console.error('Save error:', err)
      setResult({ saved: [], errors: [{ id: '', reason: 'Failed to save' }] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/portal/products')}
          className="text-bark-400 hover:text-bark-600 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-serif text-2xl text-bark-600">Bulk Import Products</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">Upload a CSV file to update multiple products at once</p>
        </div>
      </div>

      {/* Result message */}
      {result && (
        <div className="mb-6">
          {result.saved.length > 0 && (
            <div className="flex items-start gap-3 bg-sage-50 border border-sage-200 rounded-lg p-4 mb-3">
              <Check size={16} className="text-sage-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm text-sage-700 font-medium">{result.saved.length} products imported successfully</p>
                <p className="font-sans text-xs text-sage-600 mt-1">{result.saved.join(', ')}</p>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm text-red-700 font-medium">{result.errors.length} errors</p>
                <ul className="font-sans text-xs text-red-600 mt-2 space-y-1">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err.id ? `${err.id}: ${err.reason}` : err.reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Importer */}
      {!result && (
        <>
          <CsvImporter onDataLoaded={setRows} />

          {rows.length > 0 && (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-bark-700 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
                {saving ? 'Saving…' : 'Import Products'}
              </button>
              <button
                onClick={() => setRows([])}
                disabled={saving}
                className="font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors underline underline-offset-2"
              >
                Clear
              </button>
            </div>
          )}
        </>
      )}

      {/* Back button after result */}
      {result && (
        <div className="mt-6">
          <button
            onClick={() => router.push('/portal/products')}
            className="flex items-center gap-2 text-bark-400 hover:text-bark-600 transition-colors font-sans text-sm"
          >
            <ArrowLeft size={16} />
            Back to Products
          </button>
        </div>
      )}
    </div>
  )
}
