'use client'

import { useState, useRef } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'

export interface CsvRow {
  product_id: string
  name?: string
  description?: string
  ingredients?: string
  tag?: string
  price?: number
}

interface CsvImporterProps {
  onDataLoaded: (rows: CsvRow[]) => void
}

export function CsvImporter({ onDataLoaded }: CsvImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<CsvRow[]>([])

  function parseCSV(text: string): CsvRow[] {
    const lines = text.trim().split('\n')
    if (lines.length === 0) return []

    // Parse header
    const headerLine = lines[0]
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase())

    // Validate required column
    const productIdIdx = headers.findIndex(h => h === 'product_id' || h === 'id')
    if (productIdIdx === -1) {
      throw new Error('CSV must have a "product_id" column')
    }

    // Map other columns
    const nameIdx = headers.findIndex(h => h === 'name')
    const descIdx = headers.findIndex(h => h === 'description' || h === 'desc')
    const ingredIdx = headers.findIndex(h => h === 'ingredients' || h === 'ingredient')
    const tagIdx = headers.findIndex(h => h === 'tag' || h === 'badge')
    const priceIdx = headers.findIndex(h => h === 'price')

    // Parse rows
    const result: CsvRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const cols = line.split(',').map(c => c.trim())
      if (!cols[productIdIdx]) continue

      result.push({
        product_id: cols[productIdIdx],
        name: nameIdx >= 0 ? cols[nameIdx] : undefined,
        description: descIdx >= 0 ? cols[descIdx] : undefined,
        ingredients: ingredIdx >= 0 ? cols[ingredIdx] : undefined,
        tag: tagIdx >= 0 ? cols[tagIdx] : undefined,
        price: priceIdx >= 0 ? (cols[priceIdx] ? parseFloat(cols[priceIdx]) * 100 : undefined) : undefined,
      })
    }

    return result
  }

  function handleFileSelect(file: File) {
    setError('')
    setRows([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = parseCSV(text)
        if (parsed.length === 0) {
          setError('No valid rows found in CSV')
          return
        }
        setRows(parsed)
        onDataLoaded(parsed)
      } catch (err) {
        setError((err as Error).message)
      }
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-cream-300 rounded-lg p-8 text-center cursor-pointer hover:border-bark-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault()
          e.currentTarget.classList.add('border-bark-400')
        }}
        onDragLeave={e => {
          e.currentTarget.classList.remove('border-bark-400')
        }}
        onDrop={e => {
          e.preventDefault()
          e.currentTarget.classList.remove('border-bark-400')
          const file = Array.from(e.dataTransfer.files).find(f => f.type === 'text/csv' || f.name.endsWith('.csv'))
          if (file) handleFileSelect(file)
        }}
      >
        <Upload size={24} className="mx-auto mb-2 text-bark-400/50" />
        <p className="font-sans text-sm text-bark-600 mb-1">Drop CSV file or click to upload</p>
        <p className="font-sans text-xs text-bark-400">
          Required: product_id · Optional: name, description, ingredients, tag, price
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ''
        }}
      />

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-sans text-sm text-red-700 font-medium">Error parsing CSV</p>
            <p className="font-sans text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border border-cream-300 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-cream-50 border-b border-cream-300">
            <p className="font-sans text-sm text-bark-600 font-medium">{rows.length} products to import</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 border-b border-cream-200">
                <tr>
                  <th className="px-4 py-2 text-left font-sans font-medium text-bark-600">Product ID</th>
                  <th className="px-4 py-2 text-left font-sans font-medium text-bark-600">Name</th>
                  <th className="px-4 py-2 text-left font-sans font-medium text-bark-600">Ingredients</th>
                  <th className="px-4 py-2 text-left font-sans font-medium text-bark-600">Description</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-cream-200 hover:bg-cream-50">
                    <td className="px-4 py-2 font-mono text-xs text-bark-600">{row.product_id}</td>
                    <td className="px-4 py-2 text-xs text-bark-600 truncate">{row.name || '—'}</td>
                    <td className="px-4 py-2 text-xs text-bark-600 truncate">{row.ingredients || '—'}</td>
                    <td className="px-4 py-2 text-xs text-bark-600 truncate">{row.description ? row.description.slice(0, 50) + '…' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
