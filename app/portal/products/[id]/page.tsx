'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Upload, Loader, Check, Star, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface GalleryImage {
  id: string; product_id: string; image_url: string; label: string | null; is_primary: boolean; sort_order: number
}
interface Product {
  id: string; name: string; description: string; ingredients: string; price: number; category: string; imageEmoji: string; tag: string; image: string
}

export default function ProductDetailsPage() {
  const params = useParams(); const router = useRouter(); const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const [pRes, gRes] = await Promise.all([fetch(`/api/portal/products?filter=${productId}`), fetch(`/api/portal/products/${productId}/gallery`)])
        const pData = await pRes.json(); const gData = await gRes.json()
        const p = pData.products?.find((p: Product) => p.id === productId)
        if (p) setProduct(p); if (gData.gallery) setGallery(gData.gallery)
      } catch (e) { console.error('Load failed', e) }
      finally { setLoading(false) }
    }
    load()
  }, [productId])

  async function handleUpload(files: FileList) {
    if (!files.length) return; setUploading(true); setUploadError('')
    for (const file of Array.from(files)) {
      try {
        const form = new FormData(); form.append('file', file); form.append('label', file.name.split('.')[0]); form.append('primary', 'false')
        const res = await fetch(`/api/portal/products/${productId}/gallery`, { method: 'POST', body: form })
        const data = await res.json()
        if (data.image) { setGallery(prev => [...prev, data.image]) } else { setUploadError(`Failed: ${file.name}`) }
      } catch (e) { setUploadError(`Error: ${file.name}`) }
    }
    setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function setAsPrimary(imageId: string) {
    try {
      const res = await fetch(`/api/portal/products/${productId}/gallery/${imageId}`, { method: 'PATCH' })
      if (res.ok) { setGallery(prev => prev.map(img => ({ ...img, is_primary: img.id === imageId }))) }
    } catch (e) { console.error('Failed', e) }
  }

  async function deleteImage(imageId: string) {
    try {
      const res = await fetch(`/api/portal/products/${productId}/gallery/${imageId}`, { method: 'DELETE' })
      if (res.ok) { setGallery(prev => prev.filter(img => img.id !== imageId)) }
    } catch (e) { console.error('Failed', e) }
  }

  if (loading) return (<div className="min-h-screen bg-cream-50 p-6 flex items-center justify-center"><Loader size={32} className="animate-spin text-bark-600" /></div>)
  if (!product) return (<div className="min-h-screen bg-cream-50 p-6 flex items-center justify-center"><div className="text-center"><p className="text-bark-600 mb-4">Not found</p><button onClick={() => router.back()} className="px-4 py-2 bg-bark-600 text-white rounded">Back</button></div></div>)

  return (
    <div className="min-h-screen bg-cream-50"><div className="max-w-4xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-bark-400 hover:text-bark-600 mb-6 text-sm">← Back</button>
      <div className="bg-white rounded-lg border border-cream-200 p-8">
        <h1 className="font-serif text-3xl text-bark-600 mb-8">{product.name}</h1>
        <div className="grid grid-cols-2 gap-6 mb-10 pb-10 border-b border-cream-200">
          <div><p className="text-xs uppercase text-bark-400 mb-2">Category</p><p className="text-sm text-bark-600">{product.category}</p></div>
          <div><p className="text-xs uppercase text-bark-400 mb-2">Price</p><p className="text-sm text-bark-600">${(product.price / 100).toFixed(2)}</p></div>
          <div className="col-span-2"><p className="text-xs uppercase text-bark-400 mb-2">Description</p><p className="text-sm text-bark-600">{product.description || '—'}</p></div>
          <div className="col-span-2"><p className="text-xs uppercase text-bark-400 mb-2">Ingredients</p><p className="text-sm text-bark-600">{product.ingredients || '—'}</p></div>
        </div>
        <div>
          <h2 className="font-serif text-xl text-bark-600 mb-6">Gallery</h2>
          <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files) }} className="border-2 border-dashed border-cream-300 rounded-lg p-8 text-center cursor-pointer hover:border-bark-400 mb-8">
            {uploading ? (<><Loader size={32} className="mx-auto text-bark-600 animate-spin mb-2" /><p className="text-sm">Uploading…</p></>) : (<><Upload size={32} className="mx-auto text-bark-400 mb-2" /><p className="text-sm">Drag & drop photos</p></>)}
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => e.target.files && handleUpload(e.target.files)} />
          </div>
          {uploadError && <p className="text-xs text-red-500 mb-4">{uploadError}</p>}
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {gallery.map(img => (<div key={img.id} className="relative group bg-cream-100 rounded-lg overflow-hidden aspect-square">
                <Image src={img.image_url} alt={img.label || 'Photo'} fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center gap-2">
                  <button onClick={() => setAsPrimary(img.id)} className={`p-2 rounded-full ${img.is_primary ? 'bg-gold-400 text-bark-700' : 'bg-white/80'}`}><Star size={16} fill={img.is_primary ? 'currentColor' : 'none'} /></button>
                  <button onClick={() => confirm('Delete?') && deleteImage(img.id)} className="p-2 rounded-full bg-white/80 text-red-500"><Trash2 size={16} /></button>
                </div>
                {img.is_primary && <div className="absolute top-2 left-2 bg-gold-400 text-bark-700 px-2 py-1 rounded text-xs flex gap-1"><Check size={12} />Primary</div>}
              </div>))}
            </div>
          ) : <p className="text-center text-bark-400 py-8">No photos yet</p>}
        </div>
      </div>
    </div></div>
  )
}
